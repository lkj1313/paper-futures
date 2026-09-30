import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createEngineContext,
  createTestApp,
  publishTrade,
  resetData,
  seedDepth,
  seedTrade,
  signupAndLogin,
} from './utils.js';

describe('지정가 체결 감시: 체결가 구독 (e2e)', () => {
  let app: INestApplication;
  let engine: TestingModule | undefined;
  let prisma: PrismaService;

  /** 80,000에 0.1개 매수 대기 주문을 넣고 id를 돌려준다 */
  const placeBuy = async (): Promise<string> => {
    const token = await signupAndLogin(app);
    await seedDepth(app, 'BTCUSDT', {
      bids: [['82999', '1']],
      asks: [['83000', '1']],
    });
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        price: '80000',
        qty: '0.1',
      });
    expect(res.body.order.status).toBe('NEW');
    return res.body.order.id;
  };
  const statusOf = async (id: string) =>
    (await prisma.order.findUniqueOrThrow({ where: { id } })).status;
  /** engine이 비동기로 처리하므로 체결될 때까지 기다린다 */
  const waitUntilFilled = (id: string) =>
    vi.waitFor(async () => expect(await statusOf(id)).toBe('FILLED'), {
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
    await engine?.close();
    engine = undefined;
  });

  afterAll(async () => {
    await app.close();
  });

  it('체결가 방송이 지정가에 닿으면 0.1초 안에 체결한다', async () => {
    const id = await placeBuy();
    engine = await createEngineContext({ monitor: true });

    await publishTrade(app, 'BTCUSDT', '81000');
    await publishTrade(app, 'BTCUSDT', '79990'); // 스쳐 지나감
    await publishTrade(app, 'BTCUSDT', '81500');

    await waitUntilFilled(id);
  });

  it('꺼져 있는 동안 놓친 체결은 시작할 때 저장된 최신 체결가로 처리한다', async () => {
    const id = await placeBuy();
    await seedTrade(app, 'BTCUSDT', '79990'); // 주문 뒤에 일어난 거래 (방송 없이 저장만)

    engine = await createEngineContext({ monitor: true });

    await waitUntilFilled(id);
  });

  it('주문을 넣기 전에 저장된 체결가로는 체결하지 않는다', async () => {
    await seedTrade(app, 'BTCUSDT', '79990');
    const id = await placeBuy();

    engine = await createEngineContext({ monitor: true });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(await statusOf(id)).toBe('NEW');
  });
});
