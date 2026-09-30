import { describe, expect, it } from 'vitest';
import type { PriceLevel } from '../market.js';
import { isMarketable, simulateLimitFill, simulateMarketFill } from './fill.js';

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

describe('isMarketable', () => {
  // 매수 호가 82,999 / 매도 호가 83,000
  const book = {
    bids: [['82999', '1']] as PriceLevel[],
    asks: [['83000', '1']] as PriceLevel[],
  };

  it.each([
    ['BUY', '82999.9', false], // 매도 호가보다 싸게 사려고 함 → 대기
    ['BUY', '83000', true], // 매도 호가에 닿음 → 바로 체결
    ['SELL', '83000', false], // 매수 호가보다 비싸게 팔려고 함 → 대기
    ['SELL', '82999', true],
  ] as const)('%s 지정가 %s → %s', (side, price, expected) => {
    expect(isMarketable(side, price, book)).toBe(expected);
  });

  it('반대편 호가가 비어 있으면 바로 체결될 수 없다', () => {
    expect(isMarketable('BUY', '90000', { bids: book.bids, asks: [] })).toBe(
      false,
    );
  });
});

describe('simulateLimitFill', () => {
  const book = {
    bids: [
      ['82999', '0.05'],
      ['82998', '0.1'],
    ] as PriceLevel[],
    asks: [
      ['83000', '0.05'],
      ['83001', '0.1'],
      ['83005', '1'],
    ] as PriceLevel[],
  };

  it('매수: 지정가 이하 호가로만 채운다', () => {
    const fill = simulateLimitFill('BUY', '0.1', '83001', book);

    expect(fill.fullyFilled).toBe(true);
    expect(fill.avgPrice?.toString()).toBe('83000.5'); // 83,005는 쓰지 않음
  });

  it('매수: 지정가 안에서 모자라면 채운 만큼만 (시장가라면 83,005까지 감)', () => {
    const fill = simulateLimitFill('BUY', '0.1', '83000', book);

    expect(fill.fullyFilled).toBe(false);
    expect(fill.filledQty.toString()).toBe('0.05');
  });

  it('매도: 지정가 이상 호가로만 채운다', () => {
    const fill = simulateLimitFill('SELL', '0.1', '82998', book);

    expect(fill.fullyFilled).toBe(true);
    expect(fill.avgPrice?.toString()).toBe('82998.5');
  });
});
