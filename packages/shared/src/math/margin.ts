import { type DecimalLike, toDecimal, type Decimal } from './decimal.js';

/** 명목가치: 포지션의 전체 크기 = 수량 × 가격 */
export function notional(qty: DecimalLike, price: DecimalLike): Decimal {
  return toDecimal(qty).mul(price);
}

/** 개시증거금: 포지션을 열 때 필요한 돈 = 명목가치 ÷ 레버리지 */
export function initialMargin(
  notionalValue: DecimalLike,
  leverage: number,
): Decimal {
  return toDecimal(notionalValue).div(leverage);
}

/** 유지증거금: 남은 증거금이 이 밑으로 떨어지면 청산 = 명목가치 × 유지증거금률 */
export function maintenanceMargin(
  notionalValue: DecimalLike,
  maintenanceMarginRate: DecimalLike,
): Decimal {
  return toDecimal(notionalValue).mul(maintenanceMarginRate);
}

/** 거래 수수료 = 명목가치 × 수수료율 */
export function tradingFee(
  notionalValue: DecimalLike,
  feeRate: DecimalLike,
): Decimal {
  return toDecimal(notionalValue).mul(feeRate);
}
