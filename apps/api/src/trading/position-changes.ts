import {
  Decimal,
  type DecimalLike,
  isolatedLiquidationPrice,
  type MarketSpec,
  type PositionSide,
  toDecimal,
} from '@paper-futures/shared';
import { toDb } from '../common/db-decimal.js';

// DB 컬럼이 Decimal(20, 8)이라 저장할 값은 소수 8자리로 맞춘다
const DB_SCALE = 8;
const round = (value: Decimal) => value.toDecimalPlaces(DB_SCALE);

export interface PositionState {
  side: PositionSide;
  qty: Decimal;
  entryPrice: Decimal;
  isolatedMargin: Decimal;
}

/** 이번 주문의 체결 결과 */
export interface FillAmount {
  qty: Decimal;
  /** 체결 금액 (Σ 가격 × 수량) */
  notional: Decimal;
}

/**
 * 포지션 열기 또는 늘리기
 * - 진입가 = (기존 진입가 × 기존 수량 + 이번 체결 금액) ÷ 새 수량 (가중 평균)
 * - 증거금은 더한다
 */
export function applyIncrease(
  position: PositionState | null,
  fill: FillAmount,
  addedMargin: Decimal,
) {
  if (!position) {
    return {
      qty: fill.qty,
      entryPrice: round(fill.notional.div(fill.qty)),
      isolatedMargin: addedMargin,
    };
  }

  const qty = position.qty.add(fill.qty);
  return {
    qty,
    entryPrice: round(
      position.entryPrice.mul(position.qty).add(fill.notional).div(qty),
    ),
    isolatedMargin: position.isolatedMargin.add(addedMargin),
  };
}

export interface ReduceResult {
  /** 남은 수량. 0이면 포지션이 닫힌 것 */
  remainingQty: Decimal;
  remainingMargin: Decimal;
  /** 줄인 비율만큼 풀려나는 증거금 */
  releasedMargin: Decimal;
  /** 확정된 손익 (손실 상한 적용 후) */
  realizedPnl: Decimal;
  /** 수수료 (손실 상한 적용 후) */
  fee: Decimal;
  closed: boolean;
}

/**
 * 포지션 줄이기 또는 닫기. fill.qty ≤ position.qty 를 전제로 한다.
 * - 실현 손익: 롱 = 체결 금액 − 진입가 × 수량, 숏 = 진입가 × 수량 − 체결 금액
 * - 풀리는 증거금 = 증거금 × (줄인 수량 ÷ 포지션 수량)
 * - 진입가는 바뀌지 않는다
 *
 * 손실 상한(격리 마진): 줄이는 부분에서 잃는 돈(손실 + 수수료)은 풀리는 증거금을 넘지 않는다.
 * 청산가를 지나친 뒤에 닫아도 그 포지션에 넣은 돈 이상은 잃지 않는다.
 */
export function applyReduce(
  position: PositionState,
  fill: FillAmount,
  feeRate: DecimalLike,
): ReduceResult {
  const closed = fill.qty.eq(position.qty);
  const releasedMargin = closed
    ? position.isolatedMargin
    : round(position.isolatedMargin.mul(fill.qty).div(position.qty));

  const cost = position.entryPrice.mul(fill.qty);
  const rawPnl =
    position.side === 'LONG'
      ? fill.notional.sub(cost)
      : cost.sub(fill.notional);
  const rawFee = fill.notional.mul(feeRate);

  // 수수료를 먼저 떼고, 손실은 남은 증거금까지만 반영한다
  const fee = round(Decimal.min(rawFee, releasedMargin));
  const realizedPnl = round(Decimal.max(rawPnl, fee.sub(releasedMargin)));

  return {
    remainingQty: position.qty.sub(fill.qty),
    remainingMargin: position.isolatedMargin.sub(releasedMargin),
    releasedMargin,
    realizedPnl,
    fee,
    closed,
  };
}

export const toPositionState = (position: {
  side: PositionSide;
  qty: DecimalLike | { toString(): string };
  entryPrice: DecimalLike | { toString(): string };
  isolatedMargin: DecimalLike | { toString(): string };
}): PositionState => ({
  side: position.side,
  qty: toDecimal(position.qty.toString()),
  entryPrice: toDecimal(position.entryPrice.toString()),
  isolatedMargin: toDecimal(position.isolatedMargin.toString()),
});

/**
 * 포지션 테이블에 저장할 값. 청산가도 저장할 때마다 다시 계산한다
 * (engine이 이 값으로 청산 대상을 찾는다)
 */
export const toPositionData = (position: PositionState, spec: MarketSpec) => ({
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
