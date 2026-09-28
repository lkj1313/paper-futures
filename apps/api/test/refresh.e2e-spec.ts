import type { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { RedisService } from '../src/redis/redis.service.js';
import { createTestApp, resetData } from './utils.js';

// Set-Cookie 헤더에서 refresh_token 줄을 찾는다
function refreshSetCookie(res: Response): string | undefined {
  const cookies = res.get('Set-Cookie') ?? [];
  return cookies.find((c) => c.startsWith('refresh_token='));
}

// 'refresh_token=abc; Path=...' → 'refresh_token=abc' (요청의 Cookie 헤더에 쓰는 형태)
function cookiePair(setCookie: string | undefined): string {
  if (!setCookie) throw new Error('refresh_token 쿠키가 없습니다.');
  return setCookie.split(';')[0];
}

describe('refresh 토큰, 로그아웃 (e2e)', () => {
  let app: INestApplication;
  const credentials = { email: 'a@b.com', password: 'password123' };

  const server = () => app.getHttpServer();
  const login = () =>
    request(server()).post('/api/auth/login').send(credentials);
  const refresh = (cookie?: string) => {
    const req = request(server()).post('/api/auth/refresh');
    return cookie ? req.set('Cookie', cookie) : req;
  };
  const logout = (cookie: string) =>
    request(server()).post('/api/auth/logout').set('Cookie', cookie);
  const me = (accessToken: string) =>
    request(server())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetData(app);
    await request(server()).post('/api/auth/signup').send(credentials);
  });

  afterAll(async () => {
    await app.close();
  });

  it('로그인하면 refresh 토큰을 httpOnly 쿠키로 준다', async () => {
    const res = await login();
    const setCookie = refreshSetCookie(res);

    expect(res.status).toBe(200);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/api/auth');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
  });

  it('Redis에는 토큰 원문이 아니라 해시를 저장한다', async () => {
    const token = cookiePair(refreshSetCookie(await login())).split('=')[1];

    const keys = await app.get(RedisService).keys('refresh:*');
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^refresh:[0-9a-f]{64}$/);
    expect(keys[0]).not.toContain(token);
  });

  it('refresh 쿠키로 새 accessToken과 새 refresh 토큰을 받는다', async () => {
    const oldCookie = cookiePair(refreshSetCookie(await login()));

    const res = await refresh(oldCookie);
    const newCookie = cookiePair(refreshSetCookie(res));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accessToken: expect.any(String) });
    expect(newCookie).not.toBe(oldCookie);
    expect((await me(res.body.accessToken)).status).toBe(200);
  });

  it('이미 교체된 refresh 토큰을 다시 쓰면 도용으로 보고 새 토큰까지 무효화한다', async () => {
    const oldCookie = cookiePair(refreshSetCookie(await login()));
    const newCookie = cookiePair(refreshSetCookie(await refresh(oldCookie)));

    const reuse = await refresh(oldCookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe('INVALID_REFRESH_TOKEN');

    const afterReuse = await refresh(newCookie);
    expect(afterReuse.status).toBe(401);
  });

  it('refresh 쿠키가 없으면 401 INVALID_REFRESH_TOKEN', async () => {
    const res = await refresh();

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('잘못된 refresh 쿠키면 401이고 쿠키를 지운다', async () => {
    const res = await refresh('refresh_token=not-a-real-token');

    expect(res.status).toBe(401);
    expect(refreshSetCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('로그아웃하면 204, 쿠키를 지우고 그 refresh 토큰은 더 이상 쓸 수 없다', async () => {
    const cookie = cookiePair(refreshSetCookie(await login()));

    const res = await logout(cookie);
    expect(res.status).toBe(204);
    expect(refreshSetCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);

    expect((await refresh(cookie)).status).toBe(401);
    expect(await app.get(RedisService).keys('refresh:*')).toHaveLength(0);
  });
});
