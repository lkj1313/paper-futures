import { Decimal as DecimalJs } from 'decimal.js';

/**
 * 돈 계산용 Decimal. JS number는 0.1 + 0.2 = 0.30000000000000004 같은 오차가 있어서 쓰지 않는다.
 * 설정을 한곳에 모으려고 복제본을 만들어 쓴다. api와 web 모두 이것을 쓴다.
 */
export const Decimal = DecimalJs.clone({
  precision: 40,
  rounding: DecimalJs.ROUND_HALF_UP,
});
export type Decimal = InstanceType<typeof Decimal>;

/** Decimal로 바꿀 수 있는 값: 문자열, 숫자, Decimal */
export type DecimalLike = string | number | Decimal;

export const toDecimal = (value: DecimalLike): Decimal => new Decimal(value);
