import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

/** main.ts와 같은 설정으로 테스트용 앱을 띄운다 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  setupApp(app);
  await app.init();
  return app;
}

/** 테스트 DB의 모든 테이블(마이그레이션 기록 제외)과 테스트용 Redis를 비운다 */
export async function resetData(app: INestApplication) {
  await app.get(RedisService).flushdb();

  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const names = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} CASCADE`);
}

/** 가입 후 로그인해서 accessToken을 돌려준다 */
export async function signupAndLogin(
  app: INestApplication,
  email = 'user@test.com',
  password = 'password123',
): Promise<string> {
  const server = app.getHttpServer();
  await request(server).post('/api/auth/signup').send({ email, password });
  const res = await request(server)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.accessToken;
}
