import type { AccountOrder } from '@paper-futures/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { OrderHistoryTable } from './OrderHistoryTable';

const order = (id: string, avgFillPrice: string): AccountOrder => ({
  id,
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  status: 'FILLED',
  qty: '0.01',
  price: null,
  leverage: 10,
  reduceOnly: false,
  reservedMargin: '0',
  avgFillPrice,
  fee: '0.4078255',
  realizedPnl: '0',
  createdAt: '2026-10-18T10:05:12.000Z',
  updatedAt: '2026-10-18T10:05:12.000Z',
});

describe('OrderHistoryTable', () => {
  it('최신 주문부터 보여 주고, 더 보기를 누르면 이전 주문을 아래에 붙인다', async () => {
    server.use(
      http.get('/api/orders', ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get('cursor') === 'order-2'
            ? { items: [order('order-1', '80000')], nextCursor: null }
            : { items: [order('order-2', '81000')], nextCursor: 'order-2' },
        ),
      ),
    );
    useTokenStore.getState().setAccessToken('token-1');
    renderWithProviders(
      <MemoryRouter>
        <OrderHistoryTable />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: '더 보기' }),
    );

    expect(await screen.findByText('80,000.0')).toBeInTheDocument();
    const prices = screen
      .getAllByText(/^8[01],000\.0$/)
      .map((cell) => cell.textContent);
    expect(prices).toEqual(['81,000.0', '80,000.0']);
    expect(
      screen.queryByRole('button', { name: '더 보기' }),
    ).not.toBeInTheDocument();
  });
});
