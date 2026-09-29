import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createTestApp,
  resetData,
  seedDepth,
  signupAndLogin,
} from './utils.js';

// BTC 호가: 사면 83,000에 0.05개, 83,001에 0.1개까지 체결 가능
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

describe('POST /api/orders 시장가 주문 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const order = (body: object, t = token) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${t}`)
      .send({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', ...body });
  const wallet = () =>
    request(app.getHttpServer())
      .get('/api/wallet')
      .set('Authorization', `Bearer ${token}`);

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

  it('포지션을 연다: 호가대로 체결하고 수수료를 원장에 남긴다', async () => {
    const res = await order({ qty: '0.1', leverage: 10 });

    // 83,000 × 0.05 + 83,001 × 0.05 = 8,300.05 → 평균 83,000.5
    // 수수료 = 8,300.05 × 0.05% = 4.150025, 증거금 = 8,300.05 ÷ 10 = 830.005
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      status: 'FILLED',
      qty: '0.1',
      leverage: 10,
      avgFillPrice: '83000.5',
      fee: '4.150025',
      realizedPnl: '0',
    });
    expect(res.body.position).toEqual({
      symbol: 'BTCUSDT',
      side: 'LONG',
      qty: '0.1',
      entryPrice: '83000.5',
      leverage: 10,
      isolatedMargin: '830.005',
    });

    // 증거금은 잔고에서 빠지지 않고 "사용 중"으로만 잡힌다
    expect((await wallet()).body).toEqual({
      asset: 'USDT',
      balance: '9995.849975',
      usedMargin: '830.005',
      availableBalance: '9165.844975',
    });

    const fee = await prisma.ledgerEntry.findFirstOrThrow({
      where: { type: 'TRADING_FEE' },
    });
    expect(fee.amount.toString()).toBe('-4.150025');
    expect(fee.balanceAfter.toString()).toBe('9995.849975');
    expect(fee.orderId).toBe(res.body.order.id);
  });

  it('같은 방향으로 다시 사면 포지션을 늘린다 (진입가 가중 평균, 기존 레버리지 유지)', async () => {
    await order({ qty: '0.1', leverage: 10 });
    await seedDepth(app, 'BTCUSDT', btcBook); // 첫 주문과 같은 호가

    const res = await order({ qty: '0.05', leverage: 20 });

    // (83,000.5 × 0.1 + 83,000 × 0.05) ÷ 0.15 = 83,000.333...
    expect(res.status).toBe(201);
    expect(res.body.position).toEqual({
      symbol: 'BTCUSDT',
      side: 'LONG',
      qty: '0.15',
      entryPrice: '83000.33333333',
      leverage: 10,
      isolatedMargin: '1245.005',
    });
    expect(res.body.order.leverage).toBe(10);
  });

  it('주문 가능 금액이 모자라면 400 INSUFFICIENT_MARGIN, 아무것도 바뀌지 않는다', async () => {
    await seedDepth(app, 'BTCUSDT', { bids: [], asks: [['83000', '10']] });

    // 1배 레버리지로 0.2개 = 증거금 16,600 > 잔고 10,000
    const res = await order({ qty: '0.2', leverage: 1 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_MARGIN');
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.position.count()).toBe(0);
    expect((await wallet()).body.balance).toBe('10000');
  });

  it('호가로 다 채울 수 없으면 400 INSUFFICIENT_LIQUIDITY', async () => {
    const res = await order({ qty: '1' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_LIQUIDITY');
  });

  it.each([
    ['수량 단위(0.001)에 안 맞음', '0.0001'],
    ['0', '0'],
    ['최소 주문 금액(100 USDT) 미만', '0.001'],
  ])('%s → 400 INVALID_ORDER_QTY', async (_, qty) => {
    const res = await order({ qty });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ORDER_QTY');
  });

  it('종목 최대 레버리지를 넘으면 400 INVALID_LEVERAGE (ETH는 100배)', async () => {
    await seedDepth(app, 'ETHUSDT', { bids: [], asks: [['2600', '10']] });

    const res = await order({ symbol: 'ETHUSDT', qty: '0.01', leverage: 101 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_LEVERAGE');
  });

  it.each([
    ['레버리지 200', { qty: '0.1', leverage: 200 }],
    ['지정가 주문', { qty: '0.1', type: 'LIMIT' }],
    ['없는 종목', { qty: '0.1', symbol: 'DOGEUSDT' }],
    ['숫자가 아닌 수량', { qty: 'abc' }],
  ])('%s → 400 VALIDATION_ERROR', async (_, body) => {
    const res = await order(body);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('호가가 오래됐거나 없으면 503 MARKET_DATA_UNAVAILABLE', async () => {
    await seedDepth(app, 'BTCUSDT', btcBook, Date.now() - 10_000);
    expect((await order({ qty: '0.1' })).status).toBe(503);

    const eth = await order({ symbol: 'ETHUSDT', qty: '0.01' });
    expect(eth.status).toBe(503);
    expect(eth.body.code).toBe('MARKET_DATA_UNAVAILABLE');
  });

  it('반대 방향 주문(포지션 줄이기)은 아직 400', async () => {
    await order({ qty: '0.1' });

    const res = await order({ side: 'SELL', qty: '0.05' });

    expect(res.status).toBe(400);
  });

  it('토큰 없이 주문하면 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .send({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', qty: '0.1' });

    expect(res.status).toBe(401);
  });

  it('동시에 주문해도 주문 가능 금액을 넘겨서 체결되지 않는다 (지갑 잠금)', async () => {
    await seedDepth(app, 'BTCUSDT', { bids: [], asks: [['83000', '100']] });

    // 한 건당 증거금 2,988 + 수수료 1.494 → 잔고 10,000으로는 3건까지만 가능
    const results = await Promise.all(
      Array.from({ length: 5 }, () => order({ qty: '0.036', leverage: 1 })),
    );

    const statuses = results.map((r) => r.status).sort((a, b) => a - b);
    expect(statuses).toEqual([201, 201, 201, 400, 400]);
    expect(
      results.filter((r) => r.status === 400).map((r) => r.body.code),
    ).toEqual(['INSUFFICIENT_MARGIN', 'INSUFFICIENT_MARGIN']);

    const w = (await wallet()).body;
    expect(Number(w.availableBalance)).toBeGreaterThanOrEqual(0);
    expect(w.usedMargin).toBe('8964');

    // 원장 합계 == 지갑 잔고
    const walletRow = await prisma.wallet.findFirstOrThrow();
    const { _sum } = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
    });
    expect(_sum.amount?.toString()).toBe(walletRow.balance.toString());
  });
});
