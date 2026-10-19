import type { AccountOrder } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Toaster } from '@/shared/ui/sonner';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useAmendOrder } from './use-amend-order';

const order = (fields: Partial<AccountOrder>): AccountOrder => ({
  id: 'order-1',
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  status: 'NEW',
  qty: '0.002',
  price: '81000',
  leverage: 10,
  reduceOnly: false,
  reservedMargin: '16.2324',
  avgFillPrice: null,
  fee: '0',
  realizedPnl: '0',
  createdAt: '2026-10-19T00:00:00.000Z',
  updatedAt: '2026-10-19T00:00:00.000Z',
  ...fields,
});

function setup(response: object, status = 200) {
  const sent: { id: string; body: unknown }[] = [];
  server.use(
    http.patch('/api/orders/:id', async ({ params, request }) => {
      sent.push({ id: String(params.id), body: await request.json() });
      return HttpResponse.json(response, { status });
    }),
  );
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
  const { result } = renderHook(() => useAmendOrder(), { wrapper });
  return { result, sent };
}

describe('useAmendOrder', () => {
  it('그 주문의 새 가격을 보내고, 대기로 남으면 가격을 바꿨다고 알린다', async () => {
    const { result, sent } = setup({ order: order({}), position: null });

    await act(() =>
      result.current.mutateAsync({
        id: 'order-1',
        symbol: 'BTCUSDT',
        price: '81000.0',
      }),
    );

    expect(sent).toEqual([{ id: 'order-1', body: { price: '81000.0' } }]);
    expect(
      await screen.findByText('주문 가격을 바꿨습니다 (81,000.0)'),
    ).toBeInTheDocument();
  });

  it('바로 체결되면 체결 결과를 알린다', async () => {
    const { result } = setup({
      order: order({
        status: 'FILLED',
        price: '83000',
        avgFillPrice: '82999.5',
      }),
      position: null,
    });

    await act(() =>
      result.current.mutateAsync({
        id: 'order-1',
        symbol: 'BTCUSDT',
        price: '83000.0',
      }),
    );

    expect(
      await screen.findByText('BTCUSDT 0.002 매수 체결 (평균 82,999.5)'),
    ).toBeInTheDocument();
  });

  it('서버가 거부하면 그 이유를 알린다', async () => {
    const { result } = setup(
      {
        statusCode: 409,
        code: 'ORDER_NOT_OPEN',
        message: '이미 체결되거나 취소된 주문입니다.',
      },
      409,
    );

    await act(() =>
      result.current
        .mutateAsync({ id: 'order-1', symbol: 'BTCUSDT', price: '80000.0' })
        .catch(() => undefined),
    );

    expect(
      await screen.findByText('이미 체결되거나 취소된 주문입니다.'),
    ).toBeInTheDocument();
  });
});
