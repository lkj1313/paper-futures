import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import {
  type MarketSymbol,
  marketKey,
  type OrderBookDepth,
  type PriceLevel,
} from '@paper-futures/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

/**
 * main.ts와 같은 설정으로 테스트용 앱을 띄운다.
 * configure로 특정 서비스를 가짜로 바꿔 끼울 수 있다 (overrideProvider).
 */
export async function createTestApp(
  configure: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<INestApplication> {
  const moduleRef = await configure(
    Test.createTestingModule({ imports: [AppModule] }),
  ).compile();

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

/** market-data 프로세스 대신 테스트용 Redis에 호가를 넣는다 */
export async function seedDepth(
  app: INestApplication,
  symbol: MarketSymbol,
  book: { bids: PriceLevel[]; asks: PriceLevel[] },
  receivedAt = Date.now(),
) {
  const depth: OrderBookDepth = { ...book, time: receivedAt, receivedAt };
  await app
    .get(RedisService)
    .set(marketKey(symbol, 'depth'), JSON.stringify(depth));
}
