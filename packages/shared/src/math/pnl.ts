import type { PositionSide } from '../trading.js';
import { type DecimalLike, toDecimal, type Decimal } from './decimal.js';

/**
 * 미실현 손익 (아직 포지션을 닫지 않은 상태의 손익)
 * 롱: (마크가격 − 진입가) × 수량
 * 숏: (진입가 − 마크가격) × 수량
 */
export function unrealizedPnl(
  side: PositionSide,
  entryPrice: DecimalLike,
  markPrice: DecimalLike,
  qty: DecimalLike,
): Decimal {
  const diff = toDecimal(markPrice).sub(entryPrice);
  const signed = side === 'LONG' ? diff : diff.neg();
  return signed.mul(qty);
}

/** ROE: 넣은 증거금 대비 수익률 (0.24 = 24%) */
export function roe(pnl: DecimalLike, margin: DecimalLike): Decimal {
  const m = toDecimal(margin);
  return m.isZero() ? toDecimal(0) : toDecimal(pnl).div(m);
}
