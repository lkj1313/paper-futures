import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMarketStore } from '@/entities/market/model/market-store';
import { useOrderDraft } from '@/features/place-order';
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

  it('체결 줄을 누르면 주문폼이 그 가격의 지정가가 된다', async () => {
    useMarketStore.getState().applyTrades({
      symbol: 'ETHUSDT',
      trades: [
        {
          id: 1,
          price: '2426.5',
          qty: '1.000',
          side: 'BUY',
          time: Date.now(),
          receivedAt: Date.now(),
        },
      ],
    });
    render(<RecentTrades symbol="ETHUSDT" />);

    await userEvent.click(
      screen.getByRole('button', { name: '2,426.50에 지정가 주문' }),
    );

    expect(useOrderDraft.getState()).toMatchObject({
      type: 'LIMIT',
      price: '2426.50',
    });
  });
});
