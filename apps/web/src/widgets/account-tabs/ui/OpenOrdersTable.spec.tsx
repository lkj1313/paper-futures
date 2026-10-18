import type { AccountOrder } from '@paper-futures/shared';
import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { OpenOrdersTable } from './OpenOrdersTable';

const LIMIT_BUY: AccountOrder = {
  id: 'order-1',
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  status: 'NEW',
  qty: '0.002',
  price: '70000',
  leverage: 10,
  reduceOnly: false,
  reservedMargin: '14.028',
  avgFillPrice: null,
  fee: '0',
  realizedPnl: '0',
  createdAt: '2026-10-18T10:05:12.000Z',
  updatedAt: '2026-10-18T10:05:12.000Z',
};

describe('OpenOrdersTable', () => {
  it('받아 온 대기 주문을 줄마다 취소 버튼과 함께 보여 준다', async () => {
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.json({
          items: [LIMIT_BUY, { ...LIMIT_BUY, id: 'order-2', price: '69000' }],
          nextCursor: null,
        }),
      ),
    );
    useTokenStore.getState().setAccessToken('token-1');

    renderWithProviders(
      <MemoryRouter>
        <OpenOrdersTable />
      </MemoryRouter>,
    );

    const row = within((await screen.findByText('69,000.0')).closest('tr')!);
    expect(row.getByRole('button', { name: '취소' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '취소' })).toHaveLength(2);
  });
});
