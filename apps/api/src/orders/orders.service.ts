import { Injectable } from '@nestjs/common';
import {
  type Decimal,
  FEE_RATES,
  initialMargin,
  isMultipleOf,
  MARKET_SPECS,
  simulateMarketFill,
  toDecimal,
  tradingFee,
} from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { MarketService } from '../market/market.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import type { PlaceOrderDto } from './dto/place-order.dto.js';

// DB의 Decimal(20, 8)에 맞춰 소수 8자리로 반올림한 문자열
const toDb = (value: Decimal) => value.toDecimalPlaces(8).toFixed();
// Prisma Decimal → 계산용 Decimal
const fromDb = (value: Prisma.Decimal) => toDecimal(value.toString());

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly wallet: WalletService,
  ) {}

  async placeMarketOrder(userId: string, dto: PlaceOrderDto) {
    const { symbol, side, qty } = dto;
    const spec = MARKET_SPECS[symbol];

    // 1. 수량은 0보다 크고 수량 단위에 맞아야 한다
    if (toDecimal(qty).lte(0) || !isMultipleOf(qty, spec.stepSize)) {
      throw new AppException('INVALID_ORDER_QTY', {
        message: `수량은 ${spec.stepSize} 단위의 0보다 큰 값이어야 합니다.`,
      });
    }

    // 2. 최신 호가로 예상 체결가를 계산한다 (트랜잭션 밖에서: DB 잠금을 짧게 유지)
    const depth = await this.market.getFreshDepth(symbol);
    const fill = simulateMarketFill(side, qty, depth);
    if (!fill.fullyFilled || !fill.avgPrice) {
      throw new AppException('INSUFFICIENT_LIQUIDITY');
    }
    if (fill.notional.lt(spec.minNotional)) {
      throw new AppException('INVALID_ORDER_QTY', {
        message: `최소 주문 금액은 ${spec.minNotional} USDT입니다.`,
      });
    }
    const avgPrice = fill.avgPrice;
    const fee = toDecimal(toDb(tradingFee(fill.notional, FEE_RATES.taker)));

    return this.prisma.transaction(async (tx) => {
      // 3. 지갑을 잠가서 같은 사용자의 주문을 한 줄로 세운다
      const wallet = await this.wallet.lockByUserId(tx, userId);
      const position = await tx.position.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });

      const positionSide = side === 'BUY' ? 'LONG' : 'SHORT';
      if (position && position.side !== positionSide) {
        throw new AppException('BAD_REQUEST', {
          message: '포지션 줄이기, 닫기는 아직 지원하지 않습니다.',
        });
      }

      // 4. 레버리지: 포지션이 있으면 그 포지션의 것을 쓴다
      const leverage = position?.leverage ?? dto.leverage;
      if (leverage > spec.maxLeverage) {
        throw new AppException('INVALID_LEVERAGE', {
          message: `${symbol}의 최대 레버리지는 ${spec.maxLeverage}배입니다.`,
        });
      }

      // 5. 증거금 확인: 주문 가능 금액 ≥ 필요 증거금 + 수수료
      const margin = toDecimal(toDb(initialMargin(fill.notional, leverage)));
      const balance = fromDb(wallet.balance);
      const usedMargin = fromDb(await this.wallet.getUsedMargin(userId, tx));
      const available = balance.sub(usedMargin);
      if (available.lt(margin.add(fee))) {
        throw new AppException('INSUFFICIENT_MARGIN', {
          message: `주문 가능 금액이 부족합니다. (필요 ${toDb(margin.add(fee))}, 가능 ${toDb(available)} USDT)`,
        });
      }

      // 6. 포지션 열기 또는 늘리기
      const saved = position
        ? await tx.position.update({
            where: { id: position.id },
            data: (() => {
              const oldQty = fromDb(position.qty);
              const newQty = oldQty.add(qty);
              // 평균 진입가 = (기존 진입가 × 기존 수량 + 이번 체결 금액) ÷ 새 수량
              const entryPrice = fromDb(position.entryPrice)
                .mul(oldQty)
                .add(fill.notional)
                .div(newQty);
              return {
                qty: toDb(newQty),
                entryPrice: toDb(entryPrice),
                isolatedMargin: toDb(
                  fromDb(position.isolatedMargin).add(margin),
                ),
              };
            })(),
          })
        : await tx.position.create({
            data: {
              userId,
              symbol,
              side: positionSide,
              qty,
              entryPrice: toDb(avgPrice),
              leverage,
              isolatedMargin: toDb(margin),
            },
          });

      // 7. 주문 기록
      const order = await tx.order.create({
        data: {
          userId,
          symbol,
          side,
          type: 'MARKET',
          status: 'FILLED',
          qty,
          leverage,
          avgFillPrice: toDb(avgPrice),
          fee: toDb(fee),
        },
      });

      // 8. 수수료만큼 잔고를 줄이고 원장에 남긴다 (증거금은 잔고에서 빼지 않고 "사용 중"으로만 센다)
      const balanceAfter = balance.sub(fee);
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: toDb(balanceAfter) },
      });
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: 'TRADING_FEE',
          amount: toDb(fee.neg()),
          balanceAfter: toDb(balanceAfter),
          orderId: order.id,
        },
      });

      return { order, position: saved };
    });
  }
}
