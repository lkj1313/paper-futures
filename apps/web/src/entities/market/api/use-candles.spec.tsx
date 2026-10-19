import type { Candle } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useCandles } from './use-candles';

const CANDLES: Candle[] = [
  {
    time: 1792328400000,
    open: '81952.40',
    high: '81952.50',
    low: '81870.30',
    close: '81877.10',
    volume: '413.252',
  },
];

function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useCandles', () => {
  it('로그인 없이 그 종목·간격의 지난 캔들을 받아 온다', async () => {
    let requested: { symbol?: string; interval?: string | null } = {};
    server.use(
      http.get('/api/markets/:symbol/candles', ({ params, request }) => {
        requested = {
          symbol: String(params.symbol),
          interval: new URL(request.url).searchParams.get('interval'),
        };
        return HttpResponse.json(CANDLES);
      }),
    );

    const { result } = renderHook(() => useCandles('ETHUSDT', '1h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(CANDLES));
    expect(requested).toEqual({ symbol: 'ETHUSDT', interval: '1h' });
  });
});
