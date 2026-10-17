import type { MarketSymbol } from '@paper-futures/shared';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeMarket, unsubscribeMarket } from '@/shared/socket';
import { useMarketSubscription } from './use-market-subscription';

vi.mock('@/shared/socket', () => ({
  subscribeMarket: vi.fn(),
  unsubscribeMarket: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMarketSubscription', () => {
  it('화면에 나타나면 구독하고, 사라지면 해제한다', () => {
    const { unmount } = renderHook(() => useMarketSubscription('BTCUSDT'));

    expect(subscribeMarket).toHaveBeenCalledExactlyOnceWith('BTCUSDT');
    expect(unsubscribeMarket).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeMarket).toHaveBeenCalledExactlyOnceWith('BTCUSDT');
  });

  it('종목이 바뀌면 이전 종목을 해제한 뒤 새 종목을 구독한다', () => {
    const { rerender } = renderHook(
      ({ symbol }: { symbol: MarketSymbol }) => useMarketSubscription(symbol),
      { initialProps: { symbol: 'BTCUSDT' } },
    );
    vi.mocked(subscribeMarket).mockClear();

    rerender({ symbol: 'ETHUSDT' });

    expect(unsubscribeMarket).toHaveBeenCalledExactlyOnceWith('BTCUSDT');
    expect(subscribeMarket).toHaveBeenCalledExactlyOnceWith('ETHUSDT');
    expect(
      vi.mocked(unsubscribeMarket).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(subscribeMarket).mock.invocationCallOrder[0]);
  });
});
