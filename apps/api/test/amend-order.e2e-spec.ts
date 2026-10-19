import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  resetData,
  seedDepth,
  setLeverage,
  signupAndLogin,
} from './utils.js';

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

describe('PATCH /api/orders/:id 주문 가격 정정 (e2e)', () => {
  let app: INestApplication;
  let token: string;

  const place = async (body: object, t = token) =>
    (
      await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${t}`)
        .send({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', ...body })
    ).body.order as { id: string };
  const amend = (id: string, body: object, t = token) =>
    request(app.getHttpServer())
      .patch(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${t}`)
      .send(body);
  const get = (path: string) =>
    request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetData(app);
    token = await signupAndLogin(app);
    await seedDepth(app, 'BTCUSDT', btcBook);
  });

  afterAll(async () => {
    await app.close();
  });

  it('대기로 남는 가격이면 같은 주문의 가격과 묶인 금액을 새 가격 기준으로 바꾼다', async () => {
    const { id } = await place({ price: '80000', qty: '0.1' });

    const res = await amend(id, { price: '79000' });

    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({
      id,
      status: 'NEW',
      price: '79000',
      reservedMargin: '791.58',
    });
    expect(res.body.position).toBeNull();
    expect((await get('/api/wallet')).body).toMatchObject({
      openOrderMargin: '791.58',
      availableBalance: '9208.42',
    });
  });

  it('바로 체결될 가격으로 옮기면 그 자리에서 테이커로 체결하고, 같은 주문을 체결로 바꾼다', async () => {
    const { id } = await place({ price: '80000', qty: '0.05' });

    const res = await amend(id, { price: '83000' });

    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({
      id,
      status: 'FILLED',
      price: '83000',
      avgFillPrice: '83000',
      fee: '2.075',
    });
    expect(res.body.position).toMatchObject({
      side: 'LONG',
      qty: '0.05',
      entryPrice: '83000',
    });
    expect((await get('/api/wallet')).body).toMatchObject({
      openOrderMargin: '0',
      usedMargin: '415',
    });
    expect((await get('/api/orders')).body.items).toHaveLength(1);
  });

  it('그 주문에 묶여 있던 금액은 빼고 계산해서, 잔고 대부분을 묶은 주문도 옮길 수 있다', async () => {
    const { id } = await place({ price: '80000', qty: '1.24' });

    const res = await amend(id, { price: '79000' });

    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({
      price: '79000',
      reservedMargin: '9815.592',
    });
  });

  it('바로 체결할 때도 그 주문에 묶여 있던 금액은 빼고, 주문에 저장된 레버리지로 체결한다', async () => {
    await seedDepth(app, 'BTCUSDT', {
      bids: btcBook.bids,
      asks: [['83000', '2']],
    });
    const { id } = await place({ price: '80000', qty: '1.19' });
    await setLeverage(app, token, 'BTCUSDT', 20);

    const res = await amend(id, { price: '83000' });

    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({ status: 'FILLED', leverage: 10 });
    expect(res.body.position).toMatchObject({
      leverage: 10,
      isolatedMargin: '9877',
    });
  });

  it('지정가 안의 호가로 전부 못 채우면 400 INSUFFICIENT_LIQUIDITY이고 주문은 그대로다', async () => {
    const { id } = await place({ price: '80000', qty: '0.2' });

    const res = await amend(id, { price: '83000' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_LIQUIDITY');
    expect((await get('/api/orders?status=NEW')).body.items[0]).toMatchObject({
      id,
      price: '80000',
    });
  });

  it('새 가격으로 묶을 금액이 모자라면 400 INSUFFICIENT_MARGIN이고 주문은 그대로다', async () => {
    const { id } = await place({ price: '80000', qty: '1.24' });

    const res = await amend(id, { price: '82000' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_MARGIN');
    expect((await get('/api/orders?status=NEW')).body.items[0]).toMatchObject({
      id,
      price: '80000',
      reservedMargin: '9939.84',
    });
  });

  it('가격이 호가 단위가 아니면 400 INVALID_ORDER_PRICE, 숫자 문자열이 아니면 400 VALIDATION_ERROR', async () => {
    const { id } = await place({ price: '80000', qty: '0.1' });

    const offTick = await amend(id, { price: '80000.05' });
    const notNumber = await amend(id, { price: 'abc' });

    expect(offTick.status).toBe(400);
    expect(offTick.body.code).toBe('INVALID_ORDER_PRICE');
    expect(notNumber.status).toBe(400);
    expect(notNumber.body.code).toBe('VALIDATION_ERROR');
  });

  it('이미 취소된 주문은 409 ORDER_NOT_OPEN, 남의 주문은 404', async () => {
    const { id } = await place({ price: '80000', qty: '0.1' });
    await request(app.getHttpServer())
      .delete(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${token}`);
    const other = await signupAndLogin(app, 'other@test.com');
    const { id: othersId } = await place({ price: '80000', qty: '0.1' }, other);

    const canceled = await amend(id, { price: '79000' });
    const others = await amend(othersId, { price: '79000' });

    expect(canceled.status).toBe(409);
    expect(canceled.body.code).toBe('ORDER_NOT_OPEN');
    expect(others.status).toBe(404);
  });
});
