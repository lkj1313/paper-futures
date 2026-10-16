import {
  type DepthEvent,
  type MarketSymbol,
  type MarketTrade,
  type MarkEvent,
  RECENT_TRADES_LIMIT,
  type TickerEvent,
} from '@paper-futures/shared';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RealtimeSocket } from '@/shared/socket';
import { bindMarketEvents } from './bind-market-events';
import { useMarketStore, useRecentTrades, useTicker } from './market-store';

const trade = (id: number): MarketTrade => ({
  id,
  price: String(83000 + id),
  qty: '0.001',
  side: 'BUY',
  time: id,
  receivedAt: id,
});

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const markEvent = (markPrice: string): MarkEvent => ({
  symbol: 'BTCUSDT',
  markPrice,
  indexPrice: markPrice,
  fundingRate: '0.0001',
  nextFundingTime: 0,
  time: 0,
  receivedAt: 0,
});

const depthEvent = (bestBid: string): DepthEvent => ({
  symbol: 'BTCUSDT',
  bids: [[bestBid, '1.000']],
  asks: [],
  time: 0,
  receivedAt: 0,
});

const tickerEvent = (lastPrice: string): TickerEvent => ({
  symbol: 'BTCUSDT',
  lastPrice,
  priceChange: '0',
  priceChangePercent: '0',
  openPrice: lastPrice,
  highPrice: lastPrice,
  lowPrice: lastPrice,
  volume: '0',
  quoteVolume: '0',
  time: 0,
  receivedAt: 0,
});

const store = () => useMarketStore.getState();
const tradeIds = (symbol: MarketSymbol) =>
  store().bySymbol[symbol]?.trades.map((t) => t.id);

describe('체결', () => {
  it('오래된 것부터 온 체결을 최신이 맨 앞인 목록으로 담는다', () => {
    store().applyTrades({ symbol: 'BTCUSDT', trades: [1, 2, 3].map(trade) });

    expect(tradeIds('BTCUSDT')).toEqual([3, 2, 1]);
  });

  it('새 체결은 앞에 붙고 최근 50개만 남긴다', () => {
    store().applyTrades({ symbol: 'BTCUSDT', trades: range(1, 50).map(trade) });
    store().applyTrades({ symbol: 'BTCUSDT', trades: [51, 52].map(trade) });

    const ids = tradeIds('BTCUSDT');
    expect(ids).toHaveLength(RECENT_TRADES_LIMIT);
    expect(ids?.slice(0, 3)).toEqual([52, 51, 50]);
    expect(ids?.at(-1)).toBe(3);
  });

  it('이미 받은 체결이 다시 오면 번호가 더 큰 것만 더한다', () => {
    store().applyTrades({ symbol: 'BTCUSDT', trades: range(1, 5).map(trade) });
    store().applyTrades({ symbol: 'BTCUSDT', trades: range(3, 7).map(trade) });

    expect(tradeIds('BTCUSDT')).toEqual([7, 6, 5, 4, 3, 2, 1]);
  });

  it('종목별로 따로 담는다', () => {
    store().applyTrades({ symbol: 'BTCUSDT', trades: [trade(1)] });
    store().applyTrades({ symbol: 'ETHUSDT', trades: [trade(2)] });

    expect(tradeIds('BTCUSDT')).toEqual([1]);
    expect(tradeIds('ETHUSDT')).toEqual([2]);
  });
});

describe('마크가격·호가·24시간 시세', () => {
  it('새 값으로 바꾸고, 받아 둔 체결은 그대로 둔다', () => {
    store().applyTrades({ symbol: 'BTCUSDT', trades: [trade(1)] });

    store().applyMark(markEvent('83000'));
    store().applyMark(markEvent('83001'));
    store().applyDepth(depthEvent('82999'));
    store().applyDepth(depthEvent('83000'));
    store().applyTicker(tickerEvent('83000'));
    store().applyTicker(tickerEvent('83002'));

    const btc = store().bySymbol.BTCUSDT;
    expect(btc?.mark?.markPrice).toBe('83001');
    expect(btc?.depth?.bids).toEqual([['83000', '1.000']]);
    expect(btc?.ticker?.lastPrice).toBe('83002');
    expect(tradeIds('BTCUSDT')).toEqual([1]);
  });
});

describe('읽기 훅', () => {
  it('받은 체결이 없으면 빈 목록을 준다', () => {
    const { result } = renderHook(() => useRecentTrades('BTCUSDT'));

    expect(result.current).toEqual([]);
  });

  it('시세가 오면 새 값으로 다시 그린다', () => {
    const { result } = renderHook(() => useTicker('BTCUSDT'));
    expect(result.current).toBeUndefined();

    act(() => store().applyTicker(tickerEvent('83000')));

    expect(result.current?.lastPrice).toBe('83000');
  });
});

describe('bindMarketEvents', () => {
  it('소켓으로 받은 시세를 저장소에 넣는다', () => {
    const handlers = new Map<string, (payload: unknown) => void>();
    const socket = {
      on: (event: string, handler: (payload: unknown) => void) => {
        handlers.set(event, handler);
      },
    };
    const receive = (event: string, payload: unknown) =>
      handlers.get(event)?.(payload);

    bindMarketEvents(socket as unknown as RealtimeSocket);
    receive('trades', { symbol: 'BTCUSDT', trades: [trade(1)] });
    receive('mark', markEvent('83000'));
    receive('depth', depthEvent('82999'));
    receive('ticker', tickerEvent('83001'));

    const btc = store().bySymbol.BTCUSDT;
    expect(tradeIds('BTCUSDT')).toEqual([1]);
    expect(btc?.mark?.markPrice).toBe('83000');
    expect(btc?.depth?.bids[0]).toEqual(['82999', '1.000']);
    expect(btc?.ticker?.lastPrice).toBe('83001');
  });
});
