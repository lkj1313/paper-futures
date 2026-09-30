import type { INestApplication } from '@nestjs/common';
import {
  Test,
  type TestingModule,
  type TestingModuleBuilder,
} from '@nestjs/testing';
import {
  type MarketSymbol,
  marketKey,
  type MarkPriceInfo,
  type OrderBookDepth,
  type PriceLevel,
} from '@paper-futures/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';
import { RiskMonitorService } from '../src/risk/risk-monitor.service.js';
import { RiskModule } from '../src/risk/risk.module.js';

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

/**
 * risk 프로세스와 같은 모듈 구성을 띄운다 (HTTP 앱과 같은 테스트 DB, Redis를 쓴다).
 * monitor가 false면 구독과 5초 점검을 끈다 (점검 함수를 직접 부르는 테스트에 끼어들지 않게)
 */
export async function createRiskContext({
  monitor = false,
} = {}): Promise<TestingModule> {
  let builder = Test.createTestingModule({ imports: [RiskModule] });
  if (!monitor) {
    builder = builder.overrideProvider(RiskMonitorService).useValue({});
  }
  const moduleRef = await builder.compile();
  moduleRef.useLogger(false);
  await moduleRef.init();
  return moduleRef;
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

/** 테스트용 마크가격 정보 */
export const markInfo = (
  markPrice: string,
  receivedAt = Date.now(),
): MarkPriceInfo => ({
  markPrice,
  indexPrice: markPrice,
  fundingRate: '0.0001',
  nextFundingTime: receivedAt + 60_000,
  time: receivedAt,
  receivedAt,
});

/** market-data 프로세스 대신 테스트용 Redis에 마크가격을 넣는다 (방송은 하지 않는다) */
export async function seedMark(
  app: INestApplication,
  symbol: MarketSymbol,
  markPrice: string,
  receivedAt = Date.now(),
) {
  await app
    .get(RedisService)
    .set(
      marketKey(symbol, 'mark'),
      JSON.stringify(markInfo(markPrice, receivedAt)),
    );
}

/** market-data 프로세스처럼 마크가격을 방송한다 (저장은 하지 않는다) */
export async function publishMark(
  app: INestApplication,
  symbol: MarketSymbol,
  markPrice: string,
) {
  const redis = app.get(RedisService);
  await redis.publish(
    redis.channel(marketKey(symbol, 'mark')),
    JSON.stringify(markInfo(markPrice)),
  );
}
