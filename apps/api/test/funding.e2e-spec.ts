import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  type FundingRoundInput,
  FundingService,
} from '../src/engine/funding.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createEngineContext,
  createTestApp,
  resetData,
  seedDepth,
  signupAndLogin,
} from './utils.js';

// 사면 0.1개 평균 83,000.5, 팔면 평균 82,998.5
const btcBook = {
  bids: [
    ['82999', '0.05'],
    ['82998', '0.1'],
  ] as [string, string][],
  asks: [
    ['83000', '0.05'],
    ['83001', '0.1'],
  ] as [string, string][],
};

const FUNDING_TIME = Date.UTC(2026, 8, 30, 8); // 2026-09-30 08:00 UTC

describe('펀딩비 정산 (e2e)', () => {
  let app: INestApplication;
  let engine: TestingModule;
  let prisma: PrismaService;
  let funding: FundingService;

  /** 새 사용자로 가입해서 10배 시장가로 포지션을 연다 */
  const openAs = async (email: string, body: object) => {
    const token = await signupAndLogin(app, email);
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        symbol: 'BTCUSDT',
        type: 'MARKET',
        qty: '0.1',
        leverage: 10,
        ...body,
      });
    expect(res.status).toBe(201);
  };
  const round = (
    fundingRate: string,
    extra: Partial<FundingRoundInput> = {},
  ): FundingRoundInput => ({
    symbol: 'BTCUSDT',
    fundingTime: FUNDING_TIME,
    fundingRate,
    markPrice: '83000',
    ...extra,
  });
  const positionOf = (email: string) =>
    prisma.position.findFirstOrThrow({ where: { user: { email } } });
  const balanceOf = async (email: string) =>
    (
      await prisma.wallet.findFirstOrThrow({ where: { user: { email } } })
    ).balance.toString();

  beforeAll(async () => {
    app = await createTestApp();
    engine = await createEngineContext();
    prisma = app.get(PrismaService);
    funding = engine.get(FundingService);
  });

  beforeEach(async () => {
    await resetData(app);
    await seedDepth(app, 'BTCUSDT', btcBook);
    await seedDepth(app, 'ETHUSDT', {
      bids: [['2600', '10']],
      asks: [['2600', '10']],
    });
  });

  afterAll(async () => {
    await engine.close();
    await app.close();
  });

  it('비율이 +면 롱이 내고 숏이 받는다: 포지션 증거금과 청산가, 잔고, 원장이 바뀐다', async () => {
    await openAs('long@test.com', { side: 'BUY' }); // 증거금 830.005, 잔고 9,995.849975
    await openAs('short@test.com', { side: 'SELL' }); // 증거금 829.985, 잔고 9,995.850075
    await openAs('eth@test.com', { symbol: 'ETHUSDT', side: 'BUY' });

    // 0.1 × 83,000 × 0.01% = 0.83
    expect(await funding.settle(round('0.0001'))).toBe(2);

    const long = await positionOf('long@test.com');
    expect(long.isolatedMargin.toString()).toBe('829.175');
    expect(long.liquidationPrice.toString()).toBe('75008.78514056'); // 청산가가 가까워짐
    expect(await balanceOf('long@test.com')).toBe('9995.019975');

    const short = await positionOf('short@test.com');
    expect(short.isolatedMargin.toString()).toBe('830.815');
    expect(short.liquidationPrice.toString()).toBe('90942.87848606');
    expect(await balanceOf('short@test.com')).toBe('9996.680075');

    // 다른 종목은 그대로
    expect((await positionOf('eth@test.com')).isolatedMargin.toString()).toBe(
      '26',
    );

    // 회차 기록과 원장
    const saved = await prisma.fundingRound.findFirstOrThrow({
      include: { entries: { orderBy: { amount: 'asc' } } },
    });
    expect(saved.fundingTime.getTime()).toBe(FUNDING_TIME);
    expect(saved.fundingRate.toString()).toBe('0.0001');
    expect(saved.entries.map((e) => [e.type, e.amount.toString()])).toEqual([
      ['FUNDING_FEE', '-0.83'],
      ['FUNDING_FEE', '0.83'],
    ]);
  });

  it('같은 회차는 두 번 정산하지 않는다', async () => {
    await openAs('long@test.com', { side: 'BUY' });

    expect(await funding.settle(round('0.0001'))).toBe(1);
    expect(await funding.settle(round('0.0001'))).toBeNull();

    expect((await positionOf('long@test.com')).isolatedMargin.toString()).toBe(
      '829.175',
    );
    expect(
      await prisma.ledgerEntry.count({ where: { type: 'FUNDING_FEE' } }),
    ).toBe(1);
  });

  it('비율이 −면 롱이 받는다', async () => {
    await openAs('long@test.com', { side: 'BUY' });

    await funding.settle(round('-0.0001'));

    const long = await positionOf('long@test.com');
    expect(long.isolatedMargin.toString()).toBe('830.835');
    expect(long.liquidationPrice.toString()).toBe('74992.1184739'); // 청산가가 멀어짐
  });

  it('낼 금액이 증거금보다 크면 증거금까지만 낸다 (증거금 0 → 청산가가 마크가격 위로)', async () => {
    await openAs('long@test.com', { side: 'BUY' });

    // 0.1 × 83,000 × 50% = 4,150 > 증거금 830.005
    await funding.settle(round('0.5'));

    const long = await positionOf('long@test.com');
    expect(long.isolatedMargin.toString()).toBe('0');
    expect(long.liquidationPrice.toString()).toBe('83333.83534137');
    expect(await balanceOf('long@test.com')).toBe('9165.844975'); // 9,995.849975 − 830.005
  });
});
