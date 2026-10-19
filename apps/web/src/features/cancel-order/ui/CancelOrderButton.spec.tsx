import type { AccountOrder } from '@paper-futures/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { CancelOrderButton } from './CancelOrderButton';

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
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
};

describe('CancelOrderButton', () => {
  it('누르면 그 주문의 취소를 보내고, 취소했다고 알린다', async () => {
    const canceled: string[] = [];
    server.use(
      http.delete('/api/orders/:id', ({ params }) => {
        canceled.push(String(params.id));
        return HttpResponse.json({ ...LIMIT_BUY, status: 'CANCELED' });
      }),
    );
    renderWithProviders(<CancelOrderButton order={LIMIT_BUY} />);

    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(
      await screen.findByText('지정가 매수 주문을 취소했습니다 (70,000.0)'),
    ).toBeInTheDocument();
    expect(canceled).toEqual(['order-1']);
  });

  it('서버가 거부하면 그 이유를 알린다', async () => {
    server.use(
      http.delete('/api/orders/:id', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            code: 'ORDER_NOT_OPEN',
            message: '이미 체결되거나 취소된 주문입니다.',
          },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<CancelOrderButton order={LIMIT_BUY} />);

    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(
      await screen.findByText('이미 체결되거나 취소된 주문입니다.'),
    ).toBeInTheDocument();
  });

  it('취소를 보내는 동안에는 다시 누를 수 없다', async () => {
    server.use(
      http.delete('/api/orders/:id', async () => {
        await delay('infinite');
        return HttpResponse.json(LIMIT_BUY);
      }),
    );
    renderWithProviders(<CancelOrderButton order={LIMIT_BUY} />);

    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(await screen.findByRole('button', { name: '취소' })).toBeDisabled();
  });
});
