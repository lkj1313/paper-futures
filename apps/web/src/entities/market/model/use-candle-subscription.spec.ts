import type { CandleInterval } from '@paper-futures/shared';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeCandles, unsubscribeCandles } from '@/shared/socket';
import { useCandleSubscription } from './use-candle-subscription';

vi.mock('@/shared/socket', () => ({
  subscribeCandles: vi.fn(),
  unsubscribeCandles: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('useCandleSubscription', () => {
  it('화면에 나타나면 그 종목·간격을 구독하고, 간격이 바뀌면 이전 것을 해제한 뒤 새로 구독한다', () => {
    const { rerender, unmount } = renderHook(
      ({ interval }: { interval: CandleInterval }) =>
        useCandleSubscription('BTCUSDT', interval),
      { initialProps: { interval: '15m' } },
    );
    expect(subscribeCandles).toHaveBeenCalledExactlyOnceWith({
      symbol: 'BTCUSDT',
      interval: '15m',
    });

    rerender({ interval: '1h' });

    expect(unsubscribeCandles).toHaveBeenCalledExactlyOnceWith({
      symbol: 'BTCUSDT',
      interval: '15m',
    });
    expect(subscribeCandles).toHaveBeenLastCalledWith({
      symbol: 'BTCUSDT',
      interval: '1h',
    });

    unmount();

    expect(unsubscribeCandles).toHaveBeenLastCalledWith({
      symbol: 'BTCUSDT',
      interval: '1h',
    });
  });
});
