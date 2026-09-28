import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, resetDatabase } from './utils.js';

describe('POST /api/auth/signup (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const signup = (body: object) =>
    request(app.getHttpServer()).post('/api/auth/signup').send(body);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('가입하면 201과 공개 정보만 돌려주고, 비밀번호는 해시로 저장한다', async () => {
    const res = await signup({ email: 'a@b.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: 'a@b.com',
      createdAt: expect.any(String),
    });

    const saved = await prisma.user.findUniqueOrThrow({
      where: { email: 'a@b.com' },
      omit: { passwordHash: false },
    });
    expect(saved.passwordHash).not.toBe('password123');
    expect(saved.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('이메일은 공백을 지우고 소문자로 저장한다', async () => {
    const res = await signup({ email: '  A@B.COM ', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('a@b.com');
  });

  it('이미 가입된 이메일이면 409 EMAIL_ALREADY_EXISTS', async () => {
    await signup({ email: 'a@b.com', password: 'password123' });
    const res = await signup({ email: 'A@B.com', password: 'another-pass' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: '이미 가입된 이메일입니다.',
    });
  });

  it('형식이 틀리면 400 VALIDATION_ERROR와 필드별 상세', async () => {
    const res = await signup({ email: 'not-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        { path: 'email', message: '이메일 형식이 아닙니다.' },
        {
          path: 'password',
          message: '비밀번호는 8자 이상 128자 이하여야 합니다.',
        },
      ]),
    );
  });

  it('DTO에 없는 필드를 보내면 거부한다', async () => {
    const res = await signup({
      email: 'a@b.com',
      password: 'password123',
      balance: 999999,
    });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([
      { path: 'balance', message: expect.any(String) },
    ]);
  });
});
