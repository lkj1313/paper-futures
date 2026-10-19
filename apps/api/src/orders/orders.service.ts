import { Injectable } from '@nestjs/common';
import {
  type Decimal,
  FEE_RATES,
  initialMargin,
  isMarketable,
  isMultipleOf,
  MARKET_SPECS,
  type MarketSpec,
  type MarketSymbol,
  simulateLimitFill,
  simulateMarketFill,
  toDecimal,
  tradingFee,
} from '@paper-futures/shared';
import { AccountEventsService } from '../account-events/account-events.service.js';
import { AppException } from '../common/app.exception.js';
import { cursorPageArgs, toCursorPage } from '../common/cursor-page.js';
import { fromDb, toDb } from '../common/db-decimal.js';
import { LeverageService } from '../leverage/leverage.service.js';
import { MarketService } from '../market/market.service.js';
import { PrismaService, type PrismaTx } from '../prisma/prisma.service.js';
import { TradeService } from '../trading/trade.service.js';
import { type LockedWallet, WalletService } from '../wallet/wallet.service.js';
import type { ListOrdersQueryDto } from './dto/list-orders.dto.js';
import type { PlaceOrderDto } from './dto/place-order.dto.js';

/** 수량은 0보다 크고 종목의 수량 단위에 맞아야 한다 */
function parseQty(value: string, spec: MarketSpec): Decimal {
  const qty = toDecimal(value);
  if (qty.lte(0) || !isMultipleOf(qty, spec.stepSize)) {
    throw new AppException('INVALID_ORDER_QTY', {
      message: `수량은 ${spec.stepSize} 단위의 0보다 큰 값이어야 합니다.`,
    });
  }
  return qty;
}

function parsePrice(value: string, spec: MarketSpec): Decimal {
  const price = toDecimal(value);
  if (price.lte(0) || !isMultipleOf(price, spec.tickSize)) {
    throw new AppException('INVALID_ORDER_PRICE', {
      message: `가격은 ${spec.tickSize} 단위의 0보다 큰 값이어야 합니다.`,
    });
  }
  return price;
}

type OrderTarget = Pick<PlaceOrderDto, 'symbol' | 'side' | 'reduceOnly'>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly wallet: WalletService,
    private readonly trade: TradeService,
    private readonly events: AccountEventsService,
    private readonly leverage: LeverageService,
  ) {}

  /** 내 주문 내역을 최신순으로 limit개씩 */
  async list(userId: string, query: ListOrdersQueryDto) {
    const page = cursorPageArgs(query);
    const rows = await this.prisma.order.findMany({
      ...page,
      where: {
        ...page.where,
        userId,
        ...(query.symbol && { symbol: query.symbol }),
        ...(query.status && { status: query.status }),
      },
    });
    return toCursorPage(rows, query.limit);
  }

  place(userId: string, dto: PlaceOrderDto) {
    return dto.type === 'LIMIT'
      ? this.placeLimitOrder(userId, dto)
      : this.placeMarketOrder(userId, dto);
  }

  /** 시장가 주문: 지금 호가대로 바로 전부 체결한다 */
  async placeMarketOrder(userId: string, dto: PlaceOrderDto) {
    const qty = parseQty(dto.qty, MARKET_SPECS[dto.symbol]);

    // 최신 호가로 체결가를 계산한다 (트랜잭션 밖에서: DB 잠금을 짧게 유지)
    const depth = await this.market.getFreshDepth(dto.symbol);
    const fill = simulateMarketFill(dto.side, qty, depth);
    if (!fill.fullyFilled || !fill.avgPrice) {
      throw new AppException('INSUFFICIENT_LIQUIDITY');
    }

    return this.fillNow(userId, dto, qty, {
      notional: fill.notional,
      avgPrice: fill.avgPrice,
      type: 'MARKET',
      price: null,
    });
  }

  /**
   * 호가로 바로 체결한 결과를 반영한다 (시장가, 바로 체결되는 지정가).
   * 이미 걸려 있던 호가를 가져가므로 테이커 수수료를 낸다.
   */
  private async fillNow(
    userId: string,
    target: OrderTarget,
    qty: Decimal,
    fill: {
      notional: Decimal;
      avgPrice: Decimal;
      type: 'MARKET' | 'LIMIT';
      /** 지정가 (시장가면 null) */
      price: Decimal | null;
    },
    amendOrderId?: string,
  ) {
    const { symbol, side, reduceOnly } = target;

    const result = await this.prisma.transaction(async (tx) => {
      // 지갑을 잠가서 같은 사용자의 주문을 한 줄로 세운다
      const wallet = await this.wallet.lockByUserId(tx, userId);
      const amended = amendOrderId
        ? await this.findOpenOrder(tx, userId, amendOrderId)
        : null;
      const leverage =
        amended?.leverage ?? (await this.leverage.get(tx, userId, symbol));

      // 체결을 포지션에 반영하고, 주문과 원장을 남긴다
      const applied = await this.trade.applyFill(tx, wallet, {
        userId,
        symbol,
        side,
        qty,
        notional: fill.notional,
        reduceOnly,
        leverage,
        feeRate: FEE_RATES.taker,
        openOrderId: amended?.id,
      });
      const filled = {
        status: 'FILLED' as const,
        price: fill.price && toDb(fill.price),
        leverage: applied.leverage,
        avgFillPrice: toDb(fill.avgPrice),
        fee: toDb(applied.fee),
        realizedPnl: toDb(applied.realizedPnl),
      };
      const order = amended
        ? await tx.order.update({ where: { id: amended.id }, data: filled })
        : await tx.order.create({
            data: {
              userId,
              symbol,
              side,
              type: fill.type,
              qty: toDb(qty),
              reduceOnly,
              ...filled,
            },
          });
      await this.trade.recordFill(tx, wallet, applied, order.id);

      return { order, position: applied.position };
    });
    // 커밋한 뒤에 알린다 (트랜잭션 안에서 알리면 롤백된 일을 알릴 수 있다)
    await this.events.notify(userId, [result.order.id]);
    return result;
  }

  /**
   * 지정가 주문
   * - 넣자마자 체결될 가격이면 지정가보다 불리하지 않은 호가로 바로 체결한다
   * - 아니면 대기(NEW)로 저장하고, 체결됐을 때 필요한 증거금 + 수수료를 묶어 둔다
   *   (reduceOnly는 포지션을 줄이기만 하므로 묶지 않는다)
   */
  async placeLimitOrder(userId: string, dto: PlaceOrderDto) {
    const { symbol, side, reduceOnly } = dto;
    const spec = MARKET_SPECS[symbol];
    const qty = parseQty(dto.qty, spec);
    // DTO 검증에서 LIMIT이면 price가 있다는 것을 확인했다
    const price = parsePrice(dto.price!, spec);

    // 넣자마자 체결될 가격이면 바로 체결한다
    const depth = await this.market.getFreshDepth(symbol);
    if (isMarketable(side, price, depth)) {
      const fill = simulateLimitFill(side, qty, price, depth);
      // 부분 체결은 지원하지 않는다: 지정가 안의 호가로 전부 못 채우면 거부
      if (!fill.fullyFilled || !fill.avgPrice) {
        throw new AppException('INSUFFICIENT_LIQUIDITY', {
          message: '지정가 안의 호가만으로는 전부 체결할 수 없습니다.',
        });
      }
      return this.fillNow(userId, dto, qty, {
        notional: fill.notional,
        avgPrice: fill.avgPrice,
        type: 'LIMIT',
        price,
      });
    }

    const result = await this.prisma.transaction(async (tx) => {
      const wallet = await this.wallet.lockByUserId(tx, userId);
      const position = await tx.position.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });
      const notional = price.mul(qty);

      // 지금 포지션 기준으로 안 되는 주문(reduceOnly 규칙, 방향 뒤집기)은 넣을 때 거부한다
      const reducing = this.trade.isReducing(position, {
        side,
        qty,
        reduceOnly,
      });
      // 포지션이 있으면 그 포지션의 레버리지로 체결된다
      const leverage =
        position?.leverage ?? (await this.leverage.get(tx, userId, symbol));
      if (!reducing) this.trade.assertCanOpen(symbol, notional, leverage);

      const reservedMargin = reduceOnly
        ? toDecimal(0)
        : await this.reserveFor(tx, wallet, userId, notional, leverage);

      const order = await tx.order.create({
        data: {
          userId,
          symbol,
          side,
          type: 'LIMIT',
          status: 'NEW',
          qty: toDb(qty),
          price: toDb(price),
          leverage,
          reduceOnly,
          reservedMargin: toDb(reservedMargin),
        },
      });
      return { order, position };
    });
    await this.events.notify(userId, [result.order.id]);
    return result;
  }

  async amend(userId: string, orderId: string, rawPrice: string) {
    const current = await this.findOpenOrder(this.prisma, userId, orderId);
    const symbol = current.symbol as MarketSymbol;
    const price = parsePrice(rawPrice, MARKET_SPECS[symbol]);
    const qty = fromDb(current.qty);
    const target = {
      symbol,
      side: current.side,
      reduceOnly: current.reduceOnly,
    };

    const depth = await this.market.getFreshDepth(symbol);
    if (isMarketable(target.side, price, depth)) {
      const fill = simulateLimitFill(target.side, qty, price, depth);
      if (!fill.fullyFilled || !fill.avgPrice) {
        throw new AppException('INSUFFICIENT_LIQUIDITY', {
          message: '지정가 안의 호가만으로는 전부 체결할 수 없습니다.',
        });
      }
      return this.fillNow(
        userId,
        target,
        qty,
        {
          notional: fill.notional,
          avgPrice: fill.avgPrice,
          type: 'LIMIT',
          price,
        },
        orderId,
      );
    }

    const result = await this.prisma.transaction(async (tx) => {
      const wallet = await this.wallet.lockByUserId(tx, userId);
      const order = await this.findOpenOrder(tx, userId, orderId);
      const position = await tx.position.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });
      const notional = price.mul(qty);

      const reducing = this.trade.isReducing(position, {
        side: order.side,
        qty,
        reduceOnly: order.reduceOnly,
      });
      if (!reducing) this.trade.assertCanOpen(symbol, notional, order.leverage);

      const reservedMargin = order.reduceOnly
        ? toDecimal(0)
        : await this.reserveFor(
            tx,
            wallet,
            userId,
            notional,
            order.leverage,
            order.id,
          );

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { price: toDb(price), reservedMargin: toDb(reservedMargin) },
      });
      return { order: updated, position };
    });
    await this.events.notify(userId, [result.order.id]);
    return result;
  }

  /** 대기 중인 주문을 취소한다. 묶여 있던 금액은 상태가 바뀌는 순간 풀린다 */
  async cancel(userId: string, orderId: string) {
    const canceled = await this.prisma.transaction(async (tx) => {
      // 체결 엔진과 동시에 같은 주문을 건드리지 않도록 같은 지갑 잠금을 잡는다
      await this.wallet.lockByUserId(tx, userId);
      const order = await this.findOpenOrder(tx, userId, orderId);

      return tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELED' },
      });
    });
    await this.events.notify(userId, [canceled.id]);
    return canceled;
  }

  private async findOpenOrder(db: PrismaTx, userId: string, orderId: string) {
    // 남의 주문은 없는 주문처럼 다룬다
    const order = await db.order.findFirst({ where: { id: orderId, userId } });
    if (!order) {
      throw new AppException('NOT_FOUND', {
        message: '주문을 찾을 수 없습니다.',
      });
    }
    if (order.status !== 'NEW') throw new AppException('ORDER_NOT_OPEN');
    return order;
  }

  private async reserveFor(
    tx: PrismaTx,
    wallet: LockedWallet,
    userId: string,
    notional: Decimal,
    leverage: number,
    excludeOrderId?: string,
  ) {
    const margin = toDecimal(toDb(initialMargin(notional, leverage)));
    const fee = toDecimal(toDb(tradingFee(notional, FEE_RATES.maker)));
    const reserved = margin.add(fee);

    const available = await this.wallet.getAvailable(
      tx,
      wallet,
      userId,
      excludeOrderId,
    );
    if (available.lt(reserved)) {
      throw new AppException('INSUFFICIENT_MARGIN', {
        message: `주문 가능 금액이 부족합니다. (필요 ${toDb(reserved)}, 가능 ${toDb(available)} USDT)`,
      });
    }
    return reserved;
  }
}
