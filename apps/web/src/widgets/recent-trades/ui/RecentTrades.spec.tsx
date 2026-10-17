import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMarketStore } from '@/entities/market/model/market-store';
import { subscribeMarket } from '@/shared/socket';
import { RecentTrades } from './RecentTrades';

vi.mock('@/shared/socket', () => ({
  subscribeMarket: vi.fn(),
  unsubscribeMarket: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('RecentTrades', () => {
  it('종목을 구독하고, 저장소의 체결을 그린다', () => {
    useMarketStore.getState().applyTrades({
      symbol: 'ETHUSDT',
      trades: [
        {
          id: 1,
          price: '2426.52',
          qty: '1.000',
          side: 'SELL',
          time: Date.now(),
          receivedAt: Date.now(),
        },
      ],
    });

    render(<RecentTrades symbol="ETHUSDT" />);

    expect(subscribeMarket).toHaveBeenCalledWith('ETHUSDT');
    expect(screen.getByText('2,426.52')).toBeInTheDocument();
  });
});
