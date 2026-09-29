import { type DecimalLike, toDecimal, type Decimal } from './decimal.js';

/** 단위에 맞게 내림한다. 예: 수량 0.1234, 단위 0.001 → 0.123 */
export function floorToStep(value: DecimalLike, step: DecimalLike): Decimal {
  const s = toDecimal(step);
  return toDecimal(value).div(s).floor().mul(s);
}

/** 값이 단위의 정수배인지. 예: 가격 83000.15는 호가 단위 0.1에 맞지 않음 */
export function isMultipleOf(value: DecimalLike, step: DecimalLike): boolean {
  return toDecimal(value).mod(step).isZero();
}
