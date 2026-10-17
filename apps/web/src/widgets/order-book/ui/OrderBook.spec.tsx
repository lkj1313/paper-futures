import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMarketStore } from '@/entities/market/model/market-store';
import { subscribeMarket } from '@/shared/socket';
import { OrderBook } from './OrderBook';

vi.mock('@/shared/socket', () => ({
  subscribeMarket: vi.fn(),
  unsubscribeMarket: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('OrderBook', () => {
  it('종목을 구독하고, 저장소의 호가를 그린다', () => {
    useMarketStore.getState().applyDepth({
      symbol: 'ETHUSDT',
      bids: [['2426.51', '12.000']],
      asks: [['2426.52', '3.500']],
      time: Date.now(),
      receivedAt: Date.now(),
    });

    render(<OrderBook symbol="ETHUSDT" />);

    expect(subscribeMarket).toHaveBeenCalledWith('ETHUSDT');
    expect(
      within(screen.getByRole('list', { name: '매수 호가' })).getByText(
        '2,426.51',
      ),
    ).toBeInTheDocument();
  });
});
