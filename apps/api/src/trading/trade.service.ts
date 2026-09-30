import { Injectable } from '@nestjs/common';
import {
  type Decimal,
  type DecimalLike,
  initialMargin,
  MARKET_SPECS,
  type MarketSymbol,
  type OrderSide,
  toDecimal,
  tradingFee,
} from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';
import { fromDb, toDb } from '../common/db-decimal.js';
import type { Position } from '../generated/prisma/client.js';
import type { PrismaTx } from '../prisma/prisma.service.js';
import { type LockedWallet, WalletService } from '../wallet/wallet.service.js';
import {
  applyIncrease,
  applyReduce,
  toPositionData,
  toPositionState,
} from './position-changes.js';

/** 체결 한 건: 누가, 어느 종목을, 어느 방향으로, 얼마만큼, 총 얼마에 */
export interface Fill {
  userId: string;
  symbol: MarketSymbol;
  side: OrderSide;
  qty: Decimal;
  /** 체결 금액 (Σ 가격 × 수량) */
  notional: Decimal;
  reduceOnly: boolean;
  /** 새 포지션을 열 때의 레버리지. 이미 포지션이 있으면 그 포지션의 레버리지를 쓴다 */
  leverage: number;
  /** 바로 체결되면 테이커, 걸어 둔 지정가가 체결되면 메이커 */
  feeRate: DecimalLike;
  /** 대기 주문이 체결되는 경우 그 주문 id. 그 주문에 묶여 있던 금액은 풀어서 계산한다 */
  openOrderId?: string;
}

/** 체결을 반영한 결과. 주문 기록과 원장에 남길 값들 */
export interface AppliedFill {
  /** 체결 후 포지션. 닫혔으면 null */
  position: Position | null;
  leverage: number;
  fee: Decimal;
  /** 포지션을 줄였을 때 확정된 손익 (열기, 늘리기는 0) */
  realizedPnl: Decimal;
}

/** 체결을 포지션과 잔고에 반영한다. 시장가 주문과 지정가 체결이 함께 쓴다 */
@Injectable()
export class TradeService {
  constructor(private readonly wallet: WalletService) {}

  /**
   * 체결 한 건을 포지션에 반영한다. 지갑은 같은 트랜잭션에서 먼저 잠가야 한다.
   * 포지션과 반대 방향이면 줄이기/닫기, 아니면 열기/늘리기.
   */
  async applyFill(
    tx: PrismaTx,
    wallet: LockedWallet,
    fill: Fill,
  ): Promise<AppliedFill> {
    const position = await tx.position.findUnique({
      where: { userId_symbol: { userId: fill.userId, symbol: fill.symbol } },
    });

    return this.isReducing(position, fill)
      ? this.reduce(tx, position!, fill)
      : this.openOrIncrease(tx, wallet, position, fill);
  }

  /**
   * 이 주문이 포지션을 줄이는지 판단한다 (반대 방향 포지션이 있으면 줄이기).
   * 할 수 없는 주문은 거부한다.
   * - reduceOnly인데 줄일 포지션이 없거나, 수량이 포지션보다 크면 REDUCE_ONLY_REJECTED
   * - 포지션보다 큰 반대 주문(방향 뒤집기)은 POSITION_FLIP_NOT_SUPPORTED
   */
  isReducing(
    position: Position | null,
    order: { side: OrderSide; qty: Decimal; reduceOnly: boolean },
  ): boolean {
    const orderSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
    const reducing = position !== null && position.side !== orderSide;

    if (!reducing) {
      if (order.reduceOnly) throw new AppException('REDUCE_ONLY_REJECTED');
      return false;
    }
    if (order.qty.gt(fromDb(position.qty))) {
      throw new AppException(
        order.reduceOnly
          ? 'REDUCE_ONLY_REJECTED'
          : 'POSITION_FLIP_NOT_SUPPORTED',
        order.reduceOnly
          ? { message: 'reduceOnly 주문 수량이 포지션 수량보다 큽니다.' }
          : {},
      );
    }
    return true;
  }

  /** 포지션을 열거나 늘릴 수 있는 크기와 레버리지인지 확인한다 */
  assertCanOpen(symbol: MarketSymbol, notional: Decimal, leverage: number) {
    const spec = MARKET_SPECS[symbol];
    // 최소 주문 금액은 열기, 늘리기에만 적용한다 (작게 남은 포지션도 닫을 수 있어야 하므로)
    if (notional.lt(spec.minNotional)) {
      throw new AppException('INVALID_ORDER_QTY', {
        message: `최소 주문 금액은 ${spec.minNotional} USDT입니다.`,
      });
    }
    if (leverage > spec.maxLeverage) {
      throw new AppException('INVALID_LEVERAGE', {
        message: `${symbol}의 최대 레버리지는 ${spec.maxLeverage}배입니다.`,
      });
    }
  }

  /** 체결 결과를 원장에 남기고 잔고를 바꾼다 (실현 손익 → 수수료 순서) */
  recordFill(
    tx: PrismaTx,
    wallet: LockedWallet,
    applied: AppliedFill,
    orderId: string,
  ) {
    return this.wallet.recordEntries(
      tx,
      wallet,
      [
        { type: 'REALIZED_PNL', amount: applied.realizedPnl },
        { type: 'TRADING_FEE', amount: applied.fee.neg() },
      ],
      { orderId },
    );
  }

  /** 포지션 열기 또는 늘리기 */
  private async openOrIncrease(
    tx: PrismaTx,
    wallet: LockedWallet,
    position: Position | null,
    fill: Fill,
  ): Promise<AppliedFill> {
    const spec = MARKET_SPECS[fill.symbol];

    // 포지션이 있으면 그 포지션의 레버리지를 쓴다
    const leverage = position?.leverage ?? fill.leverage;
    this.assertCanOpen(fill.symbol, fill.notional, leverage);

    // 주문 가능 금액(잔고 − 포지션 증거금 − 대기 주문에 묶인 금액) ≥ 필요 증거금 + 수수료
    const fee = toDecimal(toDb(tradingFee(fill.notional, fill.feeRate)));
    const margin = toDecimal(toDb(initialMargin(fill.notional, leverage)));
    const available = await this.wallet.getAvailable(
      tx,
      wallet,
      fill.userId,
      fill.openOrderId,
    );
    if (available.lt(margin.add(fee))) {
      throw new AppException('INSUFFICIENT_MARGIN', {
        message: `주문 가능 금액이 부족합니다. (필요 ${toDb(margin.add(fee))}, 가능 ${toDb(available)} USDT)`,
      });
    }

    const positionSide = fill.side === 'BUY' ? 'LONG' : 'SHORT';
    const next = applyIncrease(
      position && toPositionState(position),
      fill,
      margin,
    );
    const data = toPositionData({ side: positionSide, ...next }, spec);
    const saved = position
      ? await tx.position.update({ where: { id: position.id }, data })
      : await tx.position.create({
          data: {
            ...data,
            userId: fill.userId,
            symbol: fill.symbol,
            side: positionSide,
            leverage,
          },
        });

    return { position: saved, leverage, fee, realizedPnl: toDecimal(0) };
  }

  /** 포지션 줄이기 또는 닫기 */
  private async reduce(
    tx: PrismaTx,
    position: Position,
    fill: Fill,
  ): Promise<AppliedFill> {
    const state = toPositionState(position);
    const result = applyReduce(state, fill, fill.feeRate);

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
            MARKET_SPECS[fill.symbol],
          ),
        });

    return {
      position: saved,
      leverage: position.leverage,
      fee: result.fee,
      realizedPnl: result.realizedPnl,
    };
  }
}
