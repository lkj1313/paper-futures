import type { AccountPosition } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { usePosition, usePositions } from './use-positions';

const BTC_LONG: AccountPosition = {
  symbol: 'BTCUSDT',
  side: 'LONG',
  qty: '0.010',
  entryPrice: '81565.0',
  leverage: 10,
  isolatedMargin: '81.565',
  liquidationPrice: '73734.76',
};

function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function servePositions() {
  server.use(
    http.get('/api/positions', () =>
      HttpResponse.json([
        {
          ...BTC_LONG,
          markPrice: '81600.0',
          unrealizedPnl: '0.35',
          roe: '0.43',
          stale: false,
        },
      ]),
    ),
  );
  useTokenStore.getState().setAccessToken('token-1');
}

describe('usePositions', () => {
  it('로그인 전에는 요청하지 않는다', () => {
    const { result } = renderHook(() => usePositions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('로그인하면 열린 포지션을 소켓 이벤트와 같은 모양으로 가져온다', async () => {
    servePositions();

    const { result } = renderHook(() => usePositions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual([BTC_LONG]));
  });
});

describe('usePosition', () => {
  it('그 종목의 포지션만 주고, 없으면 undefined', async () => {
    servePositions();
    const wrapper = createWrapper();

    const btc = renderHook(() => usePosition('BTCUSDT'), { wrapper });
    const eth = renderHook(() => usePosition('ETHUSDT'), { wrapper });

    await waitFor(() => expect(btc.result.current).toEqual(BTC_LONG));
    expect(eth.result.current).toBeUndefined();
  });
});
