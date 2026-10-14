import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useMe } from './use-me';

function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useMe', () => {
  it('로그인 전에는 요청하지 않는다', () => {
    const { result } = renderHook(() => useMe(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('로그인하면 현재 사용자를 가져온다', async () => {
    server.use(
      http.get('/api/users/me', () =>
        HttpResponse.json({
          id: 'user-1',
          email: 'a@b.com',
          createdAt: '2026-10-14T00:00:00.000Z',
        }),
      ),
    );
    useTokenStore.getState().setAccessToken('token-1');

    const { result } = renderHook(() => useMe(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data?.email).toBe('a@b.com'));
  });
});
