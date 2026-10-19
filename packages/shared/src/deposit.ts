import { toDecimal } from './math/decimal.js';

export const MAX_DEPOSIT_USDT = '100000';

export interface DepositRequest {
  amount: string;
}

const AMOUNT_FORMAT = /^\d+(\.\d{1,2})?$/;

export function checkDepositAmount(amount: string): string | null {
  if (!AMOUNT_FORMAT.test(amount)) {
    return '충전 금액은 숫자로, 소수 둘째 자리까지 입력하세요.';
  }
  const value = toDecimal(amount);
  if (value.lte(0) || value.gt(MAX_DEPOSIT_USDT)) {
    return '충전 금액은 0보다 크고 100,000 USDT 이하여야 합니다.';
  }
  return null;
}
