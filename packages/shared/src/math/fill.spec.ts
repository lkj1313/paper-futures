import { describe, expect, it } from 'vitest';
import type { PriceLevel } from '../market.js';
import { simulateMarketFill } from './fill.js';

const book: { bids: PriceLevel[]; asks: PriceLevel[] } = {
  bids: [
    ['82999', '0.05'],
    ['82998', '0.10'],
  ],
  asks: [
    ['83000', '0.05'],
    ['83001', '0.10'],
  ],
};

describe('simulateMarketFill', () => {
  it('사기: 매도 호가를 싼 것부터 채운다 → 평균 83,000.5', () => {
    const r = simulateMarketFill('BUY', '0.1', book);

    expect(r.fullyFilled).toBe(true);
    expect(r.filledQty.toString()).toBe('0.1');
    expect(r.notional.toString()).toBe('8300.05');
    expect(r.avgPrice?.toString()).toBe('83000.5');
  });

  it('팔기: 매수 호가를 비싼 것부터 채운다 → 평균 82,998.5', () => {
    const r = simulateMarketFill('SELL', '0.1', book);

    expect(r.avgPrice?.toString()).toBe('82998.5');
  });

  it('첫 호가만으로 충분하면 그 가격 그대로', () => {
    expect(simulateMarketFill('BUY', '0.03', book).avgPrice?.toString()).toBe(
      '83000',
    );
  });

  it('호가 순서가 섞여 들어와도 유리한 가격부터 채운다', () => {
    const shuffled = { ...book, asks: [...book.asks].reverse() };

    expect(
      simulateMarketFill('BUY', '0.1', shuffled).avgPrice?.toString(),
    ).toBe('83000.5');
  });

  it('호가가 모자라면 채울 수 있는 만큼만, 나머지는 remainingQty', () => {
    const r = simulateMarketFill('BUY', '1', book);

    expect(r.fullyFilled).toBe(false);
    expect(r.filledQty.toString()).toBe('0.15');
    expect(r.remainingQty.toString()).toBe('0.85');
  });

  it('호가가 비어 있으면 평균가 null', () => {
    const r = simulateMarketFill('BUY', '0.1', { bids: [], asks: [] });

    expect(r.avgPrice).toBeNull();
    expect(r.fullyFilled).toBe(false);
  });
});
