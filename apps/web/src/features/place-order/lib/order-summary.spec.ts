import type { AccountPosition, PositionSide } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { buildOrderSummary } from './order-summary';

const position = (side: PositionSide, leverage = 5): AccountPosition => ({
  symbol: 'BTCUSDT',
  side,
  qty: '0.01',
  entryPrice: '81565.0',
  leverage,
  isolatedMargin: '163.13',
  liquidationPrice: '65578.42',
});

const base = {
  symbol: 'BTCUSDT',
  type: 'LIMIT',
  price: '81565.0',
  qty: '0.01',
  available: '10000',
  savedLeverage: 10,
  bestBid: '81564.9',
  bestAsk: '81565.1',
  lastPrice: '81565.0',
} as const;

describe('buildOrderSummary', () => {
  it('지정가는 입력한 가격으로 양쪽 비용과 최대 수량을 계산한다', () => {
    const summary = buildOrderSummary(base);

    expect(summary.BUY).toEqual({
      referencePrice: '81565.0',
      reduces: false,
      cost: '81.72813',
      maxQty: '1.223',
    });
    expect(summary.SELL).toEqual(summary.BUY);
    expect(summary.leverage).toBe(10);
  });

  it('지정가인데 가격이 비었으면 기준가 없이 비용 0, 최대 0', () => {
    const summary = buildOrderSummary({ ...base, price: '' });

    expect(summary.BUY).toMatchObject({
      referencePrice: null,
      cost: '0',
      maxQty: '0',
    });
  });

  it('시장가는 매수에 가장 싼 매도 호가, 매도에 가장 비싼 매수 호가를 쓴다', () => {
    const summary = buildOrderSummary({ ...base, type: 'MARKET' });

    expect(summary.BUY.referencePrice).toBe('81565.1');
    expect(summary.SELL.referencePrice).toBe('81564.9');
  });

  it('시장가인데 호가가 없으면 최근 체결가를 쓰고, 그것도 없으면 기준가가 없다', () => {
    const noBook = {
      ...base,
      type: 'MARKET',
      bestBid: undefined,
      bestAsk: undefined,
    } as const;

    expect(buildOrderSummary(noBook).BUY.referencePrice).toBe('81565.0');
    expect(
      buildOrderSummary({ ...noBook, lastPrice: undefined }).SELL
        .referencePrice,
    ).toBeNull();
  });

  it('롱이 있으면 매도는 줄이는 쪽이라 비용이 없고 최대는 포지션 수량이다', () => {
    const summary = buildOrderSummary({ ...base, position: position('LONG') });

    expect(summary.SELL).toMatchObject({
      reduces: true,
      cost: null,
      maxQty: '0.01',
    });
    expect(summary.BUY.reduces).toBe(false);
    expect(summary.openingSide).toBe('BUY');
  });

  it('포지션이 있으면 그 레버리지로 계산한다', () => {
    const summary = buildOrderSummary({
      ...base,
      position: position('LONG', 5),
    });

    expect(summary.leverage).toBe(5);
    expect(summary.BUY.cost).toBe('163.29313');
  });

  it('숏이 있으면 늘리는 쪽은 매도다', () => {
    const summary = buildOrderSummary({ ...base, position: position('SHORT') });

    expect(summary.openingSide).toBe('SELL');
    expect(summary.BUY.reduces).toBe(true);
  });

  it('지갑을 아직 못 받았으면 최대는 0', () => {
    const summary = buildOrderSummary({ ...base, available: undefined });

    expect(summary.BUY.maxQty).toBe('0');
  });
});
