import type { PositionSide } from '../trading.js';
import { type Decimal, type DecimalLike, toDecimal } from './decimal.js';

/**
 * 포지션이 펀딩 회차에 주고받는 금액 (받으면 +, 내면 −)
 * 펀딩비 = 수량 × 마크가격 × 펀딩비율. 비율이 +면 롱이 숏에게 내고, −면 숏이 롱에게 낸다.
 */
export function fundingPayment(
  side: PositionSide,
  qty: DecimalLike,
  markPrice: DecimalLike,
  fundingRate: DecimalLike,
): Decimal {
  const amount = toDecimal(qty).mul(markPrice).mul(fundingRate);
  return side === 'LONG' ? amount.neg() : amount;
}
