import type { MarketTrade } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { priceDirection } from './price-direction';

const newestFirst = (...prices: string[]): MarketTrade[] =>
  prices.map((price, i) => ({
    id: prices.length - i,
    price,
    qty: '0.001',
    side: 'BUY',
    time: 0,
    receivedAt: 0,
  }));

describe('priceDirection', () => {
  it('맨 앞 가격이 처음으로 다른 직전 가격보다 높으면 up', () => {
    expect(priceDirection(newestFirst('82156.1', '82156.1', '82156.0'))).toBe(
      'up',
    );
  });

  it('낮으면 down', () => {
    expect(priceDirection(newestFirst('82155.9', '82156.0'))).toBe('down');
  });

  it('비교할 다른 가격이 없으면 null', () => {
    expect(priceDirection([])).toBeNull();
    expect(priceDirection(newestFirst('82156.1'))).toBeNull();
    expect(priceDirection(newestFirst('82156.1', '82156.10'))).toBeNull();
  });

  it('글자가 아니라 숫자로 비교한다', () => {
    expect(priceDirection(newestFirst('99.9', '100.0'))).toBe('down');
  });
});
