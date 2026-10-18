import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useLeverage, useLeverageSettings } from './use-leverage';

function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useLeverage', () => {
  it('로그인 전에는 요청하지 않고 기본 10배를 준다', () => {
    const wrapper = createWrapper();
    const settings = renderHook(() => useLeverageSettings(), { wrapper });
    const btc = renderHook(() => useLeverage('BTCUSDT'), { wrapper });

    expect(settings.result.current.fetchStatus).toBe('idle');
    expect(btc.result.current).toBe(10);
  });

  it('로그인하면 저장된 종목별 레버리지를 가져온다', async () => {
    server.use(
      http.get('/api/leverage', () =>
        HttpResponse.json({ BTCUSDT: 20, ETHUSDT: 5 }),
      ),
    );
    useTokenStore.getState().setAccessToken('token-1');
    const wrapper = createWrapper();

    const btc = renderHook(() => useLeverage('BTCUSDT'), { wrapper });
    const eth = renderHook(() => useLeverage('ETHUSDT'), { wrapper });

    await waitFor(() => expect(btc.result.current).toBe(20));
    expect(eth.result.current).toBe(5);
  });
});
