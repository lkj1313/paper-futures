import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { LogoutButton } from './LogoutButton';

function loggedInWithCache() {
  useTokenStore.getState().setAccessToken('token-1');
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(['me'], { id: 'user-1', email: 'a@b.com' });
  return queryClient;
}

describe('LogoutButton', () => {
  it('서버에 로그아웃을 알리고 토큰과 캐시를 비운다', async () => {
    const calls = { count: 0 };
    server.use(
      http.post('/api/auth/logout', () => {
        calls.count += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = loggedInWithCache();
    renderWithProviders(<LogoutButton />, queryClient);

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() =>
      expect(useTokenStore.getState().accessToken).toBeNull(),
    );
    expect(calls.count).toBe(1);
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
  });

  it('서버 요청이 실패해도 이 브라우저에서는 로그아웃한다', async () => {
    server.use(http.post('/api/auth/logout', () => HttpResponse.error()));
    const queryClient = loggedInWithCache();
    renderWithProviders(<LogoutButton />, queryClient);

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() =>
      expect(useTokenStore.getState().accessToken).toBeNull(),
    );
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
  });
});
