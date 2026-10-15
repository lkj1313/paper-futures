import { HttpResponse, delay, http as rest } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/server';
import { restoreSession } from './restore-session';
import { setSessionExpiredHandler } from './session-expired';
import { useTokenStore } from './token-store';

function refreshEndpoint(respond: () => Response) {
  const calls = { count: 0 };
  server.use(
    rest.post('/api/auth/refresh', async () => {
      calls.count += 1;
      await delay(20);
      return respond();
    }),
  );
  return calls;
}

describe('restoreSession', () => {
  it('refresh 쿠키가 살아 있으면 새 토큰을 받아 로그인 상태가 된다', async () => {
    refreshEndpoint(() => HttpResponse.json({ accessToken: 'token-1' }));

    await restoreSession();

    expect(useTokenStore.getState().accessToken).toBe('token-1');
  });

  it('쿠키가 없거나 만료됐으면 에러 없이 로그아웃 상태로 끝난다', async () => {
    refreshEndpoint(() =>
      HttpResponse.json(
        {
          statusCode: 401,
          code: 'INVALID_REFRESH_TOKEN',
          message: '다시 로그인해야 합니다.',
        },
        { status: 401 },
      ),
    );
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);

    await expect(restoreSession()).resolves.toBeUndefined();
    expect(useTokenStore.getState().accessToken).toBeNull();
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('이미 토큰이 있으면 refresh하지 않는다', async () => {
    const refresh = refreshEndpoint(() =>
      HttpResponse.json({ accessToken: 'token-2' }),
    );
    useTokenStore.getState().setAccessToken('token-1');

    await restoreSession();

    expect(refresh.count).toBe(0);
    expect(useTokenStore.getState().accessToken).toBe('token-1');
  });

  it('동시에 여러 번 불러도 refresh는 한 번만 보낸다', async () => {
    const refresh = refreshEndpoint(() =>
      HttpResponse.json({ accessToken: 'token-1' }),
    );

    await Promise.all([restoreSession(), restoreSession(), restoreSession()]);

    expect(refresh.count).toBe(1);
  });
});
