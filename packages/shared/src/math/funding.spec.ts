import { describe, expect, it } from 'vitest';
import { fundingPayment } from './funding.js';

// BTC 0.1개, 마크가격 83,000 → 포지션 규모 8,300
describe('fundingPayment', () => {
  it.each([
    ['LONG', '0.0001', '-0.83'], // 비율 +: 롱이 낸다
    ['SHORT', '0.0001', '0.83'], // 숏은 받는다
    ['LONG', '-0.0001', '0.83'], // 비율 −: 롱이 받는다
    ['SHORT', '-0.0001', '-0.83'],
    ['LONG', '0', '0'],
  ] as const)('%s, 펀딩비율 %s → %s', (side, rate, expected) => {
    expect(fundingPayment(side, '0.1', '83000', rate).toString()).toBe(
      expected,
    );
  });
});
