import type { AccountOrder } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useOrderHistory } from './use-order-history';

const order = (id: string): AccountOrder => ({
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
  avgFillPrice: '81565.1',
  fee: '0.4078255',
  realizedPnl: '0',
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
});

function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useOrderHistory', () => {
  it('로그인 전에는 요청하지 않는다', () => {
    const { result } = renderHook(() => useOrderHistory(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('최신 주문부터 받고, 더 보기를 하면 다음 커서로 이어 받아 뒤에 붙인다', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get('/api/orders', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return HttpResponse.json(
          cursor === 'order-3'
            ? { items: [order('order-2'), order('order-1')], nextCursor: null }
            : {
                items: [order('order-4'), order('order-3')],
                nextCursor: 'order-3',
              },
        );
      }),
    );
    useTokenStore.getState().setAccessToken('token-1');
    const { result } = renderHook(() => useOrderHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.data?.map((o) => o.id)).toEqual([
      'order-4',
      'order-3',
      'order-2',
      'order-1',
    ]);
    expect(cursors).toEqual([null, 'order-3']);
  });
});
