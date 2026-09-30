import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createRiskContext,
  createTestApp,
  publishMark,
  resetData,
  seedDepth,
  seedMark,
  signupAndLogin,
} from './utils.js';

describe('risk 프로세스: 마크가격 감시 (e2e)', () => {
  let app: INestApplication;
  let risk: TestingModule | undefined;
  let prisma: PrismaService;

  /** 50배 롱 0.1개를 83,000.5에 연다 → 청산가 81,667.15863454 */
  const openLong = async () => {
    const token = await signupAndLogin(app);
    await seedDepth(app, 'BTCUSDT', {
      bids: [['82999', '1']],
      asks: [
        ['83000', '0.05'],
        ['83001', '0.1'],
      ],
    });
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        qty: '0.1',
        leverage: 50,
      });
    expect(res.status).toBe(201);
    expect(res.body.position.liquidationPrice).toBe('81667.15863454');
  };

  /** risk가 비동기로 처리하므로 포지션이 사라질 때까지 기다린다 */
  const waitUntilLiquidated = () =>
    vi.waitFor(async () => expect(await prisma.position.count()).toBe(0), {
      timeout: 3000,
      interval: 50,
    });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetData(app);
  });

  afterEach(async () => {
    await risk?.close();
    risk = undefined;
  });

  afterAll(async () => {
    await app.close();
  });

  it('마크가격 방송을 받으면 바로 점검해서 청산한다', async () => {
    await openLong();
    risk = await createRiskContext({ monitor: true });

    // 저장 없이 방송만: 청산됐다면 방송을 듣고 처리한 것
    await publishMark(app, 'BTCUSDT', '81000');

    await waitUntilLiquidated();
    const liq = await prisma.order.findFirstOrThrow({
      where: { type: 'LIQUIDATION' },
    });
    expect(liq.avgFillPrice?.toString()).toBe('81000');
  });

  it('청산가에 닿지 않는 가격이 방송되면 그대로 둔다', async () => {
    await openLong();
    risk = await createRiskContext({ monitor: true });

    await publishMark(app, 'BTCUSDT', '82000');
    // 방송 처리가 끝날 시간을 준 뒤 확인
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(await prisma.position.count()).toBe(1);
  });

  it('꺼져 있는 동안 놓친 청산은 시작할 때 저장된 마크가격으로 처리한다', async () => {
    await openLong();
    // 방송 없이 저장만 된 상태 (risk가 꺼져 있던 동안 가격이 내려감)
    await seedMark(app, 'BTCUSDT', '81000');

    risk = await createRiskContext({ monitor: true });

    await waitUntilLiquidated();
  });
});
