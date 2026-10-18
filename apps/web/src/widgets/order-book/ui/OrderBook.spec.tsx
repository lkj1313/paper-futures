import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMarketStore } from '@/entities/market/model/market-store';
import { useOrderDraft } from '@/features/place-order';
import { subscribeMarket } from '@/shared/socket';
import { OrderBook } from './OrderBook';

vi.mock('@/shared/socket', () => ({
  subscribeMarket: vi.fn(),
  unsubscribeMarket: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function receiveDepth(bestBid: string) {
  useMarketStore.getState().applyDepth({
    symbol: 'ETHUSDT',
    bids: [[bestBid, '12.000']],
    asks: [['2426.52', '3.500']],
    time: Date.now(),
    receivedAt: Date.now(),
  });
}

const bestBid = () =>
  within(screen.getByRole('list', { name: '매수 호가' })).getAllByRole(
    'listitem',
  )[0].firstElementChild?.children[1]?.textContent;

describe('OrderBook', () => {
  it('종목을 구독하고, 저장소의 호가를 그린다', () => {
    receiveDepth('2426.51');

    render(<OrderBook symbol="ETHUSDT" />);

    expect(subscribeMarket).toHaveBeenCalledWith('ETHUSDT');
    expect(
      within(screen.getByRole('list', { name: '매수 호가' })).getByText(
        '2,426.51',
      ),
    ).toBeInTheDocument();
  });

  it('호가가 연달아 바뀌면 화면은 바로 따라가지 않고, 멈추고 0.5초 뒤 마지막 값을 보여 준다', () => {
    vi.useFakeTimers();
    receiveDepth('2426.10');
    render(<OrderBook symbol="ETHUSDT" />);

    act(() => receiveDepth('2426.11'));
    expect(bestBid()).toBe('2,426.11');

    for (const price of ['2426.12', '2426.13', '2426.14']) {
      act(() => vi.advanceTimersByTime(100));
      act(() => receiveDepth(price));
    }
    act(() => vi.advanceTimersByTime(499));
    expect(bestBid()).toBe('2,426.11');

    act(() => vi.advanceTimersByTime(1));
    expect(bestBid()).toBe('2,426.14');
  });

  it('호가 줄을 누르면 주문폼이 그 가격의 지정가가 된다', async () => {
    receiveDepth('2426.10');
    useOrderDraft.getState().setType('MARKET');
    render(<OrderBook symbol="ETHUSDT" />);

    await userEvent.click(
      screen.getByRole('button', { name: '2,426.10에 지정가 주문' }),
    );

    expect(useOrderDraft.getState()).toMatchObject({
      type: 'LIMIT',
      price: '2426.10',
    });
  });
});
