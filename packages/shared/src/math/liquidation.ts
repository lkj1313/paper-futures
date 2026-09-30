import type { PositionSide } from '../trading.js';
import { Decimal, type DecimalLike, toDecimal } from './decimal.js';

export interface IsolatedPosition {
  side: PositionSide;
  entryPrice: DecimalLike;
  qty: DecimalLike;
  /** 이 포지션에 묶어둔 증거금 */
  isolatedMargin: DecimalLike;
  maintenanceMarginRate: DecimalLike;
}

/**
 * 격리 마진 청산가: "증거금 + 손익"이 "유지증거금"과 같아지는 가격 P
 *
 * 롱: 증거금 + (P − 진입가) × 수량 = 유지증거금률 × P × 수량
 *     → P = (진입가 × 수량 − 증거금) ÷ (수량 × (1 − 유지증거금률))
 * 숏: 증거금 + (진입가 − P) × 수량 = 유지증거금률 × P × 수량
 *     → P = (진입가 × 수량 + 증거금) ÷ (수량 × (1 + 유지증거금률))
 *
 * 수수료는 반영하지 않는다. 증거금이 충분히 커서 롱이 절대 청산되지 않으면 0을 돌려준다.
 */
export function isolatedLiquidationPrice({
  side,
  entryPrice,
  qty,
  isolatedMargin,
  maintenanceMarginRate,
}: IsolatedPosition): Decimal {
  const q = toDecimal(qty);
  const entryValue = toDecimal(entryPrice).mul(q);
  const mmr = toDecimal(maintenanceMarginRate);

  const price =
    side === 'LONG'
      ? entryValue.sub(isolatedMargin).div(q.mul(toDecimal(1).sub(mmr)))
      : entryValue.add(isolatedMargin).div(q.mul(toDecimal(1).add(mmr)));

  return Decimal.max(price, 0);
}

/**
 * 마크가격이 청산가에 닿았는지. 롱은 마크가격 ≤ 청산가, 숏은 마크가격 ≥ 청산가
 * (청산가가 0인 롱은 마크가격이 0보다 크므로 청산되지 않는다)
 */
export function isLiquidatable(
  side: PositionSide,
  liquidationPrice: DecimalLike,
  markPrice: DecimalLike,
): boolean {
  const mark = toDecimal(markPrice);
  return side === 'LONG'
    ? mark.lte(liquidationPrice)
    : mark.gte(liquidationPrice);
}
