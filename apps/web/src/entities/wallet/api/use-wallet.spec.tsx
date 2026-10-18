import type { AccountWallet } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useWallet } from './use-wallet';

const WALLET: AccountWallet = {
  asset: 'USDT',
  balance: '10000',
  usedMargin: '81.56',
  openOrderMargin: '0',
  availableBalance: '9918.44',
};

function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useWallet', () => {
  it('로그인 전에는 요청하지 않는다', () => {
    const { result } = renderHook(() => useWallet(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('로그인하면 지갑을 가져온다', async () => {
    server.use(http.get('/api/wallet', () => HttpResponse.json(WALLET)));
    useTokenStore.getState().setAccessToken('token-1');

    const { result } = renderHook(() => useWallet(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(WALLET));
  });
});
