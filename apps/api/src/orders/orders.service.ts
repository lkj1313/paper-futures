import { Injectable } from '@nestjs/common';
import {
  type Decimal,
  FEE_RATES,
  type FillResult,
  initialMargin,
  isMultipleOf,
  isolatedLiquidationPrice,
  MARKET_SPECS,
  type MarketSpec,
  type MarketSymbol,
  type OrderSide,
  simulateMarketFill,
  toDecimal,
  tradingFee,
} from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';
import { cursorPageArgs, toCursorPage } from '../common/cursor-page.js';
import { fromDb, toDb } from '../common/db-decimal.js';
import type { Position } from '../generated/prisma/client.js';
import { MarketService } from '../market/market.service.js';
import { PrismaService, type PrismaTx } from '../prisma/prisma.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import type { ListOrdersQueryDto } from './dto/list-orders.dto.js';
import type { PlaceOrderDto } from './dto/place-order.dto.js';
import {
  applyIncrease,
  applyReduce,
  type PositionState,
  toPositionState,
} from './position-changes.js';

/**
 * 포지션 테이블에 저장할 값. 청산가도 저장할 때마다 다시 계산한다
 * (청산 프로세스가 이 값으로 청산 대상을 찾는다)
 */
const toPositionData = (position: PositionState, spec: MarketSpec) => ({
  qty: toDb(position.qty),
  entryPrice: toDb(position.entryPrice),
  isolatedMargin: toDb(position.isolatedMargin),
  liquidationPrice: toDb(
    isolatedLiquidationPrice({
      ...position,
      maintenanceMarginRate: spec.maintenanceMarginRate,
    }),
  ),
});

/** 트랜잭션 안에서 주문 한 건을 처리할 때 필요한 값들 */
interface OrderContext {
  tx: PrismaTx;
  userId: string;
  wallet: { id: string; balance: Decimal };
  symbol: MarketSymbol;
  spec: MarketSpec;
  side: OrderSide;
  qty: Decimal;
  reduceOnly: boolean;
  fill: FillResult & { avgPrice: Decimal };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly wallet: WalletService,
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
      },
    });
    return toCursorPage(rows, query.limit);
  }

  async placeMarketOrder(userId: string, dto: PlaceOrderDto) {
    const { symbol, side, reduceOnly } = dto;
    const spec = MARKET_SPECS[symbol];
    const qty = toDecimal(dto.qty);

    // 1. 수량은 0보다 크고 수량 단위에 맞아야 한다
    if (qty.lte(0) || !isMultipleOf(qty, spec.stepSize)) {
      throw new AppException('INVALID_ORDER_QTY', {
        message: `수량은 ${spec.stepSize} 단위의 0보다 큰 값이어야 합니다.`,
      });
    }

    // 2. 최신 호가로 체결가를 계산한다 (트랜잭션 밖에서: DB 잠금을 짧게 유지)
    const depth = await this.market.getFreshDepth(symbol);
    const fill = simulateMarketFill(side, qty, depth);
    if (!fill.fullyFilled || !fill.avgPrice) {
      throw new AppException('INSUFFICIENT_LIQUIDITY');
    }

    return this.prisma.transaction(async (tx) => {
      // 3. 지갑을 잠가서 같은 사용자의 주문을 한 줄로 세운다
      const locked = await this.wallet.lockByUserId(tx, userId);
      const position = await tx.position.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });
      const ctx: OrderContext = {
        tx,
        userId,
        wallet: { id: locked.id, balance: fromDb(locked.balance) },
        symbol,
        spec,
        side,
        qty,
        reduceOnly,
        fill: { ...fill, avgPrice: fill.avgPrice! },
      };

      // 4. 포지션과 반대 방향이면 줄이기, 아니면 열기/늘리기
      const orderSide = side === 'BUY' ? 'LONG' : 'SHORT';
      if (position && position.side !== orderSide) {
        return this.reduce(ctx, position);
      }
      if (reduceOnly) {
        throw new AppException('REDUCE_ONLY_REJECTED');
      }
      return this.openOrIncrease(ctx, position, dto.leverage);
    });
  }

  /** 포지션 열기 또는 늘리기 */
  private async openOrIncrease(
    ctx: OrderContext,
    position: Position | null,
    requestedLeverage: number,
  ) {
    const { tx, userId, wallet, symbol, spec, side, qty, fill } = ctx;

    // 최소 주문 금액은 열기, 늘리기에만 적용한다 (작게 남은 포지션도 닫을 수 있어야 하므로)
    if (fill.notional.lt(spec.minNotional)) {
      throw new AppException('INVALID_ORDER_QTY', {
        message: `최소 주문 금액은 ${spec.minNotional} USDT입니다.`,
      });
    }

    // 포지션이 있으면 그 포지션의 레버리지를 쓴다
    const leverage = position?.leverage ?? requestedLeverage;
    if (leverage > spec.maxLeverage) {
      throw new AppException('INVALID_LEVERAGE', {
        message: `${symbol}의 최대 레버리지는 ${spec.maxLeverage}배입니다.`,
      });
    }

    // 주문 가능 금액(잔고 − 사용 중 증거금) ≥ 필요 증거금 + 수수료
    const fee = toDecimal(toDb(tradingFee(fill.notional, FEE_RATES.taker)));
    const margin = toDecimal(toDb(initialMargin(fill.notional, leverage)));
    const usedMargin = fromDb(await this.wallet.getUsedMargin(userId, tx));
    const available = wallet.balance.sub(usedMargin);
    if (available.lt(margin.add(fee))) {
      throw new AppException('INSUFFICIENT_MARGIN', {
        message: `주문 가능 금액이 부족합니다. (필요 ${toDb(margin.add(fee))}, 가능 ${toDb(available)} USDT)`,
      });
    }

    const positionSide = side === 'BUY' ? 'LONG' : 'SHORT';
    const next = applyIncrease(
      position && toPositionState(position),
      { qty, notional: fill.notional },
      margin,
    );
    const data = toPositionData({ side: positionSide, ...next }, spec);
    const saved = position
      ? await tx.position.update({ where: { id: position.id }, data })
      : await tx.position.create({
          data: { ...data, userId, symbol, side: positionSide, leverage },
        });

    const order = await this.recordOrder(ctx, {
      leverage,
      fee,
      realizedPnl: toDecimal(0),
    });
    return { order, position: saved };
  }

  /** 포지션 줄이기 또는 닫기 */
  private async reduce(ctx: OrderContext, position: Position) {
    const { tx, spec, qty, reduceOnly, fill } = ctx;

    if (qty.gt(fromDb(position.qty))) {
      throw new AppException(
        reduceOnly ? 'REDUCE_ONLY_REJECTED' : 'POSITION_FLIP_NOT_SUPPORTED',
        reduceOnly
          ? { message: 'reduceOnly 주문 수량이 포지션 수량보다 큽니다.' }
          : {},
      );
    }

    const state = toPositionState(position);
    const result = applyReduce(
      state,
      { qty, notional: fill.notional },
      FEE_RATES.taker,
    );

    // 청산가는 수량과 증거금이 같은 비율로 줄어서 거의 그대로지만,
    // 증거금 반올림 때문에 미세하게 달라질 수 있어 항상 다시 계산한다
    const saved = result.closed
      ? (await tx.position.delete({ where: { id: position.id } }), null)
      : await tx.position.update({
          where: { id: position.id },
          data: toPositionData(
            {
              ...state,
              qty: result.remainingQty,
              isolatedMargin: result.remainingMargin,
            },
            spec,
          ),
        });

    const order = await this.recordOrder(ctx, {
      leverage: position.leverage,
      fee: result.fee,
      realizedPnl: result.realizedPnl,
    });
    return { order, position: saved };
  }

  /** 주문을 기록하고, 실현 손익 → 수수료 순서로 원장에 남기며 잔고를 바꾼다 */
  private async recordOrder(
    ctx: OrderContext,
    amounts: { leverage: number; fee: Decimal; realizedPnl: Decimal },
  ) {
    const { tx, userId, wallet, symbol, side, qty, reduceOnly, fill } = ctx;
    const { leverage, fee, realizedPnl } = amounts;

    const order = await tx.order.create({
      data: {
        userId,
        symbol,
        side,
        type: 'MARKET',
        status: 'FILLED',
        qty: toDb(qty),
        leverage,
        reduceOnly,
        avgFillPrice: toDb(fill.avgPrice),
        fee: toDb(fee),
        realizedPnl: toDb(realizedPnl),
      },
    });

    await this.wallet.recordEntries(
      tx,
      wallet,
      [
        { type: 'REALIZED_PNL', amount: realizedPnl },
        { type: 'TRADING_FEE', amount: fee.neg() },
      ],
      order.id,
    );
    return order;
  }
}
