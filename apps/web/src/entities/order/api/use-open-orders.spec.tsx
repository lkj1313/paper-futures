import type { AccountOrder } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useOpenOrders } from './use-open-orders';

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

function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useOpenOrders', () => {
  it('로그인 전에는 요청하지 않는다', () => {
    const { result } = renderHook(() => useOpenOrders(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('로그인하면 대기 중인 주문만 한 번에 가져온다', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get('/api/orders', ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ items: [LIMIT_BUY], nextCursor: null });
      }),
    );
    useTokenStore.getState().setAccessToken('token-1');

    const { result } = renderHook(() => useOpenOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual([LIMIT_BUY]));
    expect(query?.get('status')).toBe('NEW');
    expect(query?.get('limit')).toBe('100');
  });
});
