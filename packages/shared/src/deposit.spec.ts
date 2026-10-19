import { describe, expect, it } from 'vitest';
import { checkDepositAmount, MAX_DEPOSIT_USDT } from './deposit.js';

describe('checkDepositAmount', () => {
  it('0보다 크고 최대 금액 이하이며 소수 둘째 자리까지면 통과한다', () => {
    for (const amount of ['0.01', '1', '10000', '99999.99', MAX_DEPOSIT_USDT]) {
      expect(checkDepositAmount(amount)).toBeNull();
    }
  });

  it('숫자가 아니거나 소수 셋째 자리 이상이면 형식을 알려 준다', () => {
    for (const amount of ['', 'abc', '-5', '1.234', '1e5', '.5']) {
      expect(checkDepositAmount(amount)).toBe(
        '충전 금액은 숫자로, 소수 둘째 자리까지 입력하세요.',
      );
    }
  });

  it('0이거나 최대 금액을 넘으면 범위를 알려 준다', () => {
    for (const amount of ['0', '0.00', '100000.01', '1000000']) {
      expect(checkDepositAmount(amount)).toBe(
        '충전 금액은 0보다 크고 100,000 USDT 이하여야 합니다.',
      );
    }
  });
});
