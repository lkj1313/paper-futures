import { HttpResponse, delay, http as rest } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/server';
import { http } from './http';
import { REFRESH_LOCK_NAME } from './refresh';
import { setSessionExpiredHandler } from './session-expired';
import { useTokenStore } from './token-store';

const OLD_TOKEN = 'old-token';
const NEW_TOKEN = 'new-token';

const tokenExpired = () =>
  HttpResponse.json(
    {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: '토큰이 만료되었습니다.',
    },
    { status: 401 },
  );

const invalidRefreshToken = () =>
  HttpResponse.json(
    {
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
      message: '다시 로그인해야 합니다.',
    },
    { status: 401 },
  );

function protectedEndpoint(path: string) {
  return rest.get(path, ({ request }) =>
    request.headers.get('authorization') === `Bearer ${NEW_TOKEN}`
      ? HttpResponse.json({ path })
      : tokenExpired(),
  );
}

function refreshEndpoint(
  respond: () => Response = () => HttpResponse.json({ accessToken: NEW_TOKEN }),
) {
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

describe('토큰 만료 시 자동 갱신', () => {
  it('만료되면 refresh하고 새 토큰으로 다시 보낸다', async () => {
    server.use(protectedEndpoint('/api/users/me'));
    const refresh = refreshEndpoint();
    useTokenStore.getState().setAccessToken(OLD_TOKEN);

    const res = await http.get('/users/me');

    expect(res.data).toEqual({ path: '/api/users/me' });
    expect(refresh.count).toBe(1);
    expect(useTokenStore.getState().accessToken).toBe(NEW_TOKEN);
  });

  it('요청 세 개가 동시에 만료돼도 refresh는 한 번만 보낸다', async () => {
    server.use(
      protectedEndpoint('/api/wallet'),
      protectedEndpoint('/api/positions'),
      protectedEndpoint('/api/orders'),
    );
    const refresh = refreshEndpoint();
    useTokenStore.getState().setAccessToken(OLD_TOKEN);

    const results = await Promise.all([
      http.get('/wallet'),
      http.get('/positions'),
      http.get('/orders'),
    ]);

    expect(refresh.count).toBe(1);
    expect(results.map((res) => res.data)).toEqual([
      { path: '/api/wallet' },
      { path: '/api/positions' },
      { path: '/api/orders' },
    ]);
  });

  it('refresh가 거절되면 토큰을 지우고 세션 종료를 알린다', async () => {
    server.use(protectedEndpoint('/api/users/me'));
    refreshEndpoint(invalidRefreshToken);
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    useTokenStore.getState().setAccessToken(OLD_TOKEN);

    await expect(http.get('/users/me')).rejects.toMatchObject({
      response: { status: 401, data: { code: 'INVALID_REFRESH_TOKEN' } },
    });
    expect(useTokenStore.getState().accessToken).toBeNull();
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it('만료가 아닌 401에는 refresh하지 않는다', async () => {
    server.use(
      rest.get('/api/users/me', () =>
        HttpResponse.json(
          {
            statusCode: 401,
            code: 'UNAUTHORIZED',
            message: '인증이 필요합니다.',
          },
          { status: 401 },
        ),
      ),
    );
    const refresh = refreshEndpoint();

    await expect(http.get('/users/me')).rejects.toMatchObject({
      response: { data: { code: 'UNAUTHORIZED' } },
    });
    expect(refresh.count).toBe(0);
  });

  it('다시 보낸 요청이 또 만료돼도 refresh는 한 번만 하고 실패로 끝낸다', async () => {
    server.use(rest.get('/api/users/me', () => tokenExpired()));
    const refresh = refreshEndpoint();
    useTokenStore.getState().setAccessToken(OLD_TOKEN);

    await expect(http.get('/users/me')).rejects.toMatchObject({
      response: { data: { code: 'TOKEN_EXPIRED' } },
    });
    expect(refresh.count).toBe(1);
  });

  it('refresh 요청 자체는 인터셉터가 다시 갱신하지 않는다', async () => {
    server.use(protectedEndpoint('/api/users/me'));
    const refresh = refreshEndpoint(tokenExpired);
    useTokenStore.getState().setAccessToken(OLD_TOKEN);

    await expect(http.get('/users/me')).rejects.toBeDefined();
    expect(refresh.count).toBe(1);
  });

  it('refresh가 네트워크 문제로 실패하면 세션은 끝내지 않는다', async () => {
    server.use(protectedEndpoint('/api/users/me'));
    refreshEndpoint(() => HttpResponse.error());
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    useTokenStore.getState().setAccessToken(OLD_TOKEN);

    await expect(http.get('/users/me')).rejects.toBeDefined();
    expect(onExpired).not.toHaveBeenCalled();
    expect(useTokenStore.getState().accessToken).toBe(OLD_TOKEN);
  });

  it('다른 요청이 이미 토큰을 갱신했으면 refresh 없이 새 토큰으로 다시 보낸다', async () => {
    server.use(
      rest.get('/api/users/me', ({ request }) => {
        if (request.headers.get('authorization') === `Bearer ${NEW_TOKEN}`) {
          return HttpResponse.json({ path: '/api/users/me' });
        }
        useTokenStore.getState().setAccessToken(NEW_TOKEN);
        return tokenExpired();
      }),
    );
    const refresh = refreshEndpoint();
    useTokenStore.getState().setAccessToken(OLD_TOKEN);

    const res = await http.get('/users/me');

    expect(res.data).toEqual({ path: '/api/users/me' });
    expect(refresh.count).toBe(0);
  });

  it('Web Locks가 있으면 잠금 안에서 refresh한다', async () => {
    const request = vi.fn((_name: string, task: () => Promise<unknown>) =>
      task(),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });
    try {
      server.use(protectedEndpoint('/api/users/me'));
      const refresh = refreshEndpoint();
      useTokenStore.getState().setAccessToken(OLD_TOKEN);

      await http.get('/users/me');

      expect(request).toHaveBeenCalledWith(
        REFRESH_LOCK_NAME,
        expect.any(Function),
      );
      expect(refresh.count).toBe(1);
    } finally {
      Reflect.deleteProperty(navigator, 'locks');
    }
  });
});
