import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createTestApp,
  resetData,
  seedDepth,
  signupAndLogin,
} from './utils.js';

// 지금 BTC: 매수 호가 82,999 / 매도 호가 83,000
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

describe('지정가 주문: 대기, 취소, 조회 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const order = (body: object, t = token) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${t}`)
      .send({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', ...body });
  const cancel = (id: string, t = token) =>
    request(app.getHttpServer())
      .delete(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${t}`);
  const get = (path: string) =>
    request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  const wallet = async () => (await get('/api/wallet')).body;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetData(app);
    token = await signupAndLogin(app);
    await seedDepth(app, 'BTCUSDT', btcBook);
  });

  afterAll(async () => {
    await app.close();
  });

  it('지금 체결될 수 없는 가격이면 대기(NEW)로 저장하고 증거금 + 수수료를 묶는다', async () => {
    const res = await order({ price: '80000', qty: '0.1', leverage: 10 });

    // 8,000 ÷ 10 = 800 (증거금) + 8,000 × 0.02% = 1.6 (메이커 수수료)
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      type: 'LIMIT',
      status: 'NEW',
      side: 'BUY',
      qty: '0.1',
      price: '80000',
      leverage: 10,
      reservedMargin: '801.6',
      avgFillPrice: null,
      fee: '0',
    });
    expect(res.body.position).toBeNull();

    // 잔고는 그대로, 주문 가능 금액만 줄어든다
    expect(await wallet()).toEqual({
      asset: 'USDT',
      balance: '10000',
      usedMargin: '0',
      openOrderMargin: '801.6',
      availableBalance: '9198.4',
    });
    expect(await prisma.ledgerEntry.count()).toBe(1); // 가입 보너스뿐
  });

  it('묶인 금액은 시장가 주문에 쓸 수 없다', async () => {
    // 1배로 묶기: 8,000 + 1.6 → 남은 주문 가능 금액 1,998.4
    await order({ price: '80000', qty: '0.1', leverage: 1 });

    // 시장가 0.03개 1배: 증거금 2,490 + 수수료 1.245 > 1,998.4
    const res = await order({ type: 'MARKET', qty: '0.03', leverage: 1 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_MARGIN');
  });

  it('묶을 금액이 주문 가능 금액보다 크면 400 INSUFFICIENT_MARGIN', async () => {
    const res = await order({ price: '80000', qty: '0.2', leverage: 1 }); // 16,003.2

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_MARGIN');
    expect(await prisma.order.count()).toBe(0);
  });

  it('취소하면 CANCELED가 되고 묶인 금액이 풀린다. 두 번은 취소할 수 없다', async () => {
    const placed = await order({ price: '80000', qty: '0.1' });

    const res = await cancel(placed.body.order.id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: placed.body.order.id,
      status: 'CANCELED',
    });
    expect(await wallet()).toMatchObject({
      openOrderMargin: '0',
      availableBalance: '10000',
    });

    const again = await cancel(placed.body.order.id);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ORDER_NOT_OPEN');
  });

  it('남의 주문은 없는 주문처럼 404, 그대로 대기 중', async () => {
    const placed = await order({ price: '80000', qty: '0.1' });
    const bob = await signupAndLogin(app, 'bob@test.com');

    const res = await cancel(placed.body.order.id, bob);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    const saved = await prisma.order.findUniqueOrThrow({
      where: { id: placed.body.order.id },
    });
    expect(saved.status).toBe('NEW');
  });

  it('id 형식이 잘못되면 400 VALIDATION_ERROR', async () => {
    const res = await cancel('not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/orders?status=NEW 는 대기 주문만 준다', async () => {
    await order({ type: 'MARKET', qty: '0.01' });
    const placed = await order({ price: '80000', qty: '0.1' });

    const res = await get('/api/orders?status=NEW');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(placed.body.order.id);
  });

  describe('reduceOnly', () => {
    it('줄일 포지션이 없으면 400 REDUCE_ONLY_REJECTED', async () => {
      const res = await order({
        side: 'SELL',
        price: '90000',
        qty: '0.1',
        reduceOnly: true,
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('REDUCE_ONLY_REJECTED');
    });

    it('롱을 줄이는 매도 지정가(익절)는 돈을 묶지 않는다', async () => {
      await order({ type: 'MARKET', qty: '0.1', leverage: 10 });
      const before = await wallet();

      const res = await order({
        side: 'SELL',
        price: '90000',
        qty: '0.1',
        reduceOnly: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.order).toMatchObject({
        status: 'NEW',
        reservedMargin: '0',
      });
      expect(await wallet()).toEqual(before);
    });

    it('reduceOnly가 아닌데 포지션보다 크면 400 POSITION_FLIP_NOT_SUPPORTED', async () => {
      await order({ type: 'MARKET', qty: '0.1', leverage: 10 });

      const res = await order({ side: 'SELL', price: '90000', qty: '0.2' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('POSITION_FLIP_NOT_SUPPORTED');
    });
  });

  it.each([
    ['호가 단위(0.1)에 안 맞음', { price: '80000.15' }, 'INVALID_ORDER_PRICE'],
    ['가격 0', { price: '0' }, 'INVALID_ORDER_PRICE'],
    [
      '최소 주문 금액 미만 (80,000 × 0.001 = 80)',
      { qty: '0.001' },
      'INVALID_ORDER_QTY',
    ],
    ['최대 레버리지 초과', { leverage: 126 }, 'VALIDATION_ERROR'],
  ])('%s → 400 %s', async (_, body, code) => {
    const res = await order({ price: '80000', qty: '0.1', ...body });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
  });

  describe('넣자마자 체결될 가격', () => {
    it('매수: 지정가 이하 매도 호가로 바로 체결한다 (테이커 수수료, 묶는 금액 없음)', async () => {
      // 매도 호가 83,000(0.05개), 83,001(0.1개) → 83,001 이하로 0.1개 채움
      const res = await order({ price: '83001', qty: '0.1', leverage: 10 });

      // 83,000 × 0.05 + 83,001 × 0.05 = 8,300.05 → 평균 83,000.5, 수수료 × 0.05%
      expect(res.status).toBe(201);
      expect(res.body.order).toMatchObject({
        type: 'LIMIT',
        status: 'FILLED',
        price: '83001',
        avgFillPrice: '83000.5',
        fee: '4.150025',
        reservedMargin: '0',
      });
      expect(res.body.position).toMatchObject({
        side: 'LONG',
        qty: '0.1',
        entryPrice: '83000.5',
      });
      expect(await wallet()).toMatchObject({
        usedMargin: '830.005',
        openOrderMargin: '0',
      });
    });

    it('매도: 지정가 이상 매수 호가로 바로 체결한다', async () => {
      const res = await order({ side: 'SELL', price: '82998', qty: '0.1' });

      expect(res.status).toBe(201);
      expect(res.body.order).toMatchObject({
        status: 'FILLED',
        avgFillPrice: '82998.5',
      });
      expect(res.body.position.side).toBe('SHORT');
    });

    it('지정가 안의 호가로 전부 못 채우면 400 INSUFFICIENT_LIQUIDITY (지정가보다 비싸게 사지 않음)', async () => {
      // 83,000 이하 매도 호가는 0.05개뿐 (시장가라면 83,001까지 채웠을 것)
      const res = await order({ price: '83000', qty: '0.1' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INSUFFICIENT_LIQUIDITY');
      expect(await prisma.order.count()).toBe(0);
      expect(await prisma.position.count()).toBe(0);
    });
  });
});
