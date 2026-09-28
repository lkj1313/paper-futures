import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp, resetDatabase, signupAndLogin } from './utils.js';

describe('GET /api/users/me (e2e)', () => {
  let app: INestApplication;

  const me = (token?: string) => {
    const req = request(app.getHttpServer()).get('/api/users/me');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('정상 토큰이면 200과 내 정보를 준다', async () => {
    const token = await signupAndLogin(app, 'me@test.com');

    const res = await me(token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: 'me@test.com',
      createdAt: expect.any(String),
    });
  });

  it('토큰이 없으면 401 UNAUTHORIZED', async () => {
    const res = await me();

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('다른 비밀키로 만든(위조된) 토큰이면 401', async () => {
    const forged = await new JwtService({
      secret: 'another-secret-that-is-at-least-32-characters',
    }).signAsync({ sub: '00000000-0000-7000-8000-000000000000' });

    const res = await me(forged);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('만료된 토큰이면 401', async () => {
    const secret = app
      .get(ConfigService)
      .getOrThrow<string>('JWT_ACCESS_SECRET');
    const expired = await new JwtService({ secret }).signAsync({
      sub: '00000000-0000-7000-8000-000000000000',
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    const res = await me(expired);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('Bearer 형식이 아니면 401', async () => {
    const token = await signupAndLogin(app);

    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Token ${token}`);

    expect(res.status).toBe(401);
  });
});
