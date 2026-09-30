import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createTestApp,
  resetData,
  seedDepth,
  signupAndLogin,
} from './utils.js';

type Level = [string, string];

// 롱을 열 때 쓰는 호가: 0.1개 매수 → 평균 83,000.5
const openBook = {
  bids: [
    ['82999', '0.05'],
    ['82998', '0.1'],
  ] as Level[],
  asks: [
    ['83000', '0.05'],
    ['83001', '0.1'],
  ] as Level[],
};
// 한 가격에 충분한 물량이 있는 호가
const flatBook = (price: string) => ({
  bids: [[price, '10']] as Level[],
  asks: [[price, '10']] as Level[],
});

describe('포지션 줄이기, 닫기 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const order = (body: object) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', type: 'MARKET', ...body });
  const wallet = async () =>
    (
      await request(app.getHttpServer())
        .get('/api/wallet')
        .set('Authorization', `Bearer ${token}`)
    ).body;

  /** 롱 0.1개를 83,000.5에 연다 (증거금 830.005, 수수료 4.150025, 잔고 9,995.849975) */
  const openLong = async () => {
    await seedDepth(app, 'BTCUSDT', openBook);
    const res = await order({ side: 'BUY', qty: '0.1', leverage: 10 });
    expect(res.status).toBe(201);
  };

  const ledgerSumEqualsBalance = async () => {
    const w = await prisma.wallet.findFirstOrThrow();
    const { _sum } = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
    });
    expect(_sum.amount?.toString()).toBe(w.balance.toString());
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetData(app);
    token = await signupAndLogin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('롱 일부를 85,000에 줄인다: 손익 확정, 진입가 유지, 증거금 비율만큼 풀림', async () => {
    await openLong();
    await seedDepth(app, 'BTCUSDT', flatBook('85000'));

    const res = await order({ side: 'SELL', qty: '0.04' });

    // 실현 손익 = 3,400 − 83,000.5 × 0.04 = 79.98, 수수료 = 3,400 × 0.05% = 1.7
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      side: 'SELL',
      qty: '0.04',
      avgFillPrice: '85000',
      realizedPnl: '79.98',
      fee: '1.7',
      reduceOnly: false,
    });
    expect(res.body.position).toEqual({
      symbol: 'BTCUSDT',
      side: 'LONG',
      qty: '0.06',
      entryPrice: '83000.5',
      leverage: 10,
      isolatedMargin: '498.003', // 830.005 × 0.6
      // 수량과 증거금이 같은 비율로 줄어서 청산가는 그대로
      liquidationPrice: '75000.45180723',
    });
    expect(await wallet()).toEqual({
      asset: 'USDT',
      balance: '10074.129975', // 9,995.849975 + 79.98 − 1.7
      usedMargin: '498.003',
      availableBalance: '9576.126975',
    });

    // 원장: 실현 손익 → 수수료 순서로 한 줄씩, 둘 다 이 주문과 연결
    const entries = await prisma.ledgerEntry.findMany({
      where: { orderId: res.body.order.id },
      orderBy: { id: 'asc' },
    });
    expect(
      entries.map((e) => [
        e.type,
        e.amount.toString(),
        e.balanceAfter.toString(),
      ]),
    ).toEqual([
      ['REALIZED_PNL', '79.98', '10075.829975'],
      ['TRADING_FEE', '-1.7', '10074.129975'],
    ]);
    await ledgerSumEqualsBalance();
  });

  it('전부 팔면 포지션을 닫는다: 포지션 null, 사용 중 증거금 0', async () => {
    await openLong();
    await seedDepth(app, 'BTCUSDT', flatBook('85000'));

    const res = await order({ side: 'SELL', qty: '0.1' });

    expect(res.status).toBe(201);
    expect(res.body.order.realizedPnl).toBe('199.95'); // 8,500 − 8,300.05
    expect(res.body.position).toBeNull();
    expect(await prisma.position.count()).toBe(0);
    expect(await wallet()).toMatchObject({
      balance: '10191.549975', // 9,995.849975 + 199.95 − 4.25
      usedMargin: '0',
    });
    await ledgerSumEqualsBalance();
  });

  it('숏은 가격이 내리면 이익을 보고 닫는다', async () => {
    await seedDepth(app, 'BTCUSDT', openBook);
    await order({ side: 'SELL', qty: '0.1' }); // 82,999 × 0.05 + 82,998 × 0.05 = 8,299.85
    await seedDepth(app, 'BTCUSDT', flatBook('80000'));

    const res = await order({ side: 'BUY', qty: '0.1', reduceOnly: true });

    expect(res.status).toBe(201);
    expect(res.body.order.realizedPnl).toBe('299.85'); // 8,299.85 − 8,000
    expect(res.body.position).toBeNull();
  });

  it('청산가를 지나쳐 닫아도 잔고는 증거금만큼만 줄어든다 (손실 상한)', async () => {
    await openLong();
    const before = await wallet();
    await seedDepth(app, 'BTCUSDT', flatBook('70000'));

    const res = await order({ side: 'SELL', qty: '0.1' });

    // 계산상 손실 1,300.05 > 증거금 830.005 → 수수료 3.5 + 손실 826.505 = 830.005
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      fee: '3.5',
      realizedPnl: '-826.505',
    });
    const after = await wallet();
    expect(after.balance).toBe('9165.844975'); // 9,995.849975 − 830.005
    expect(after.availableBalance).toBe(before.availableBalance);
    await ledgerSumEqualsBalance();
  });

  it('포지션보다 큰 반대 주문은 400 POSITION_FLIP_NOT_SUPPORTED, 아무것도 바뀌지 않는다', async () => {
    await openLong();
    await seedDepth(app, 'BTCUSDT', flatBook('85000'));

    const res = await order({ side: 'SELL', qty: '0.2' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('POSITION_FLIP_NOT_SUPPORTED');
    expect(await prisma.order.count()).toBe(1);
    expect((await wallet()).balance).toBe('9995.849975');
  });

  it.each([
    ['포지션이 없음', async () => {}, { side: 'SELL', qty: '0.1' }],
    ['같은 방향(롱에 BUY)', 'openLong', { side: 'BUY', qty: '0.01' }],
    ['포지션보다 큰 수량', 'openLong', { side: 'SELL', qty: '0.2' }],
  ] as const)(
    'reduceOnly: %s → 400 REDUCE_ONLY_REJECTED',
    async (_, setup, body) => {
      if (setup === 'openLong') await openLong();
      await seedDepth(app, 'BTCUSDT', flatBook('85000'));

      const res = await order({ ...body, reduceOnly: true });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('REDUCE_ONLY_REJECTED');
    },
  );

  it('최소 주문 금액보다 작게 남은 포지션도 닫을 수 있다', async () => {
    await openLong();
    await seedDepth(app, 'BTCUSDT', flatBook('85000'));
    await order({ side: 'SELL', qty: '0.099' });

    // 0.001 × 85,000 = 85 USDT < 최소 주문 금액 100
    const res = await order({ side: 'SELL', qty: '0.001' });

    expect(res.status).toBe(201);
    expect(res.body.position).toBeNull();
    await ledgerSumEqualsBalance();
  });
});
