import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createEngineContext,
  createTestApp,
  resetData,
  seedDepth,
  seedMark,
  signupAndLogin,
} from './utils.js';

describe('펀딩 감시: 펀딩 시각 넘어감 감지 (e2e)', () => {
  let app: INestApplication;
  let engine: TestingModule | undefined;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetData(app);
  });

  afterEach(async () => {
    await engine?.close();
    engine = undefined;
  });

  afterAll(async () => {
    await app.close();
  });

  it('다음 펀딩 시각이 넘어가면 직전 비율로 그 회차를 정산한다', async () => {
    const token = await signupAndLogin(app);
    await seedDepth(app, 'BTCUSDT', {
      bids: [['82999', '1']],
      asks: [['83000', '1']],
    });
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', qty: '0.1' });

    // 펀딩 시각 T1 직전: 비율 0.01%
    const t1 = Date.now();
    await seedMark(app, 'BTCUSDT', '83000', t1 - 500, {
      fundingRate: '0.0001',
      nextFundingTime: t1,
    });
    engine = await createEngineContext({ monitor: true }); // 시작하며 한 번 봄

    // T1이 지나고 다음 회차로 넘어감 (새 비율 0.02%는 다음 회차 것)
    await seedMark(app, 'BTCUSDT', '83100', Date.now(), {
      fundingRate: '0.0002',
      nextFundingTime: t1 + 8 * 60 * 60 * 1000,
    });

    await vi.waitFor(
      async () =>
        expect(
          await prisma.ledgerEntry.count({ where: { type: 'FUNDING_FEE' } }),
        ).toBe(1),
      { timeout: 3000, interval: 50 },
    );
    const round = await prisma.fundingRound.findFirstOrThrow({
      include: { entries: true },
    });
    expect(round.fundingTime.getTime()).toBe(t1);
    expect(round.fundingRate.toString()).toBe('0.0001'); // 넘어가기 직전 비율
    expect(round.entries[0]?.amount.toString()).toBe('-0.83'); // 0.1 × 83,000 × 0.01%
  });
});
