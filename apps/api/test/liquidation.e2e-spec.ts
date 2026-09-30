import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { LiquidationService } from '../src/risk/liquidation.service.js';
import {
  createRiskContext,
  createTestApp,
  markInfo,
  resetData,
  seedDepth,
  signupAndLogin,
} from './utils.js';

type Level = [string, string];

// 사면 평균 83,000.5, 팔면 평균 82,998.5 (0.1개 기준)
const btcBook = {
  bids: [
    ['82999', '0.05'],
    ['82998', '0.1'],
  ] as Level[],
  asks: [
    ['83000', '0.05'],
    ['83001', '0.1'],
  ] as Level[],
};

describe('강제 청산 한 건 처리 (e2e)', () => {
  let app: INestApplication;
  let risk: TestingModule;
  let prisma: PrismaService;
  let liquidation: LiquidationService;
  let token: string;

  const order = (body: object, t = token) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${t}`)
      .send({ symbol: 'BTCUSDT', type: 'MARKET', qty: '0.1', ...body });
  const wallet = async () =>
    (
      await request(app.getHttpServer())
        .get('/api/wallet')
        .set('Authorization', `Bearer ${token}`)
    ).body;

  /** 10배로 포지션을 열고, 청산 대상 조회 결과와 같은 모양으로 돌려준다 */
  const open = async (side: 'BUY' | 'SELL') => {
    expect((await order({ side, leverage: 10 })).status).toBe(201);
    return prisma.position.findFirstOrThrow({
      select: { id: true, userId: true },
    });
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
    risk = await createRiskContext();
    prisma = app.get(PrismaService);
    liquidation = risk.get(LiquidationService);
  });

  beforeEach(async () => {
    await resetData(app);
    token = await signupAndLogin(app);
    await seedDepth(app, 'BTCUSDT', btcBook);
  });

  afterAll(async () => {
    await risk.close();
    await app.close();
  });

  it('롱: 마크가격이 청산가 아래면 증거금을 전부 잃고 포지션이 닫힌다', async () => {
    // 진입 83,000.5, 증거금 830.005, 청산가 75,000.45180723, 잔고 9,995.849975
    const target = await open('BUY');

    expect(await liquidation.liquidate(target, '75000')).toBe(true);

    expect(await prisma.position.count()).toBe(0);
    const [liq] = await prisma.order.findMany({
      where: { type: 'LIQUIDATION' },
    });
    expect({
      side: liq?.side,
      qty: liq?.qty.toString(),
      avgFillPrice: liq?.avgFillPrice.toString(),
      fee: liq?.fee.toString(),
      realizedPnl: liq?.realizedPnl.toString(),
      reduceOnly: liq?.reduceOnly,
      leverage: liq?.leverage,
    }).toEqual({
      side: 'SELL',
      qty: '0.1',
      avgFillPrice: '75000',
      fee: '0',
      realizedPnl: '-830.005',
      reduceOnly: true,
      leverage: 10,
    });

    const entry = await prisma.ledgerEntry.findFirstOrThrow({
      where: { type: 'LIQUIDATION' },
    });
    expect(entry.amount.toString()).toBe('-830.005');
    expect(entry.balanceAfter.toString()).toBe('9165.844975');
    expect(entry.orderId).toBe(liq?.id);

    expect(await wallet()).toEqual({
      asset: 'USDT',
      balance: '9165.844975', // 9,995.849975 − 830.005
      usedMargin: '0',
      availableBalance: '9165.844975',
    });
    await ledgerSumEqualsBalance();
  });

  it('숏: 마크가격이 청산가와 같아도 청산된다 (반대 방향 BUY로 기록)', async () => {
    // 진입 82,998.5, 증거금 829.985, 청산가 90,934.61155378
    const target = await open('SELL');

    expect(await liquidation.liquidate(target, '90934.61155378')).toBe(true);

    expect(await prisma.position.count()).toBe(0);
    const liq = await prisma.order.findFirstOrThrow({
      where: { type: 'LIQUIDATION' },
    });
    expect(liq.side).toBe('BUY');
    expect(liq.realizedPnl.toString()).toBe('-829.985');
    await ledgerSumEqualsBalance();
  });

  it('청산가에 닿지 않았으면 아무것도 바꾸지 않는다', async () => {
    const target = await open('BUY');

    expect(await liquidation.liquidate(target, '75000.46')).toBe(false);

    expect(await prisma.position.count()).toBe(1);
    expect(await prisma.order.count({ where: { type: 'LIQUIDATION' } })).toBe(
      0,
    );
    expect((await wallet()).balance).toBe('9995.849975');
  });

  it('조회 뒤에 사용자가 먼저 닫았으면 건너뛴다', async () => {
    const target = await open('BUY');
    expect((await order({ side: 'SELL', reduceOnly: true })).status).toBe(201);

    expect(await liquidation.liquidate(target, '75000')).toBe(false);
    expect(await prisma.order.count({ where: { type: 'LIQUIDATION' } })).toBe(
      0,
    );
  });

  it('사용자의 닫기 주문과 동시에 처리돼도 한쪽만 반영된다 (지갑 잠금)', async () => {
    const target = await open('BUY');

    const [closeRes, liquidated] = await Promise.all([
      order({ side: 'SELL', reduceOnly: true }),
      liquidation.liquidate(target, '75000'),
    ]);

    // 청산이 먼저면 닫기 주문은 줄일 포지션이 없어 거부되고, 닫기가 먼저면 청산을 건너뛴다
    if (liquidated) {
      expect(closeRes.status).toBe(400);
      expect(closeRes.body.code).toBe('REDUCE_ONLY_REJECTED');
    } else {
      expect(closeRes.status).toBe(201);
    }
    expect(await prisma.position.count()).toBe(0);
    await ledgerSumEqualsBalance();
  });

  describe('checkSymbol: 종목 점검', () => {
    /** 새 사용자로 가입해서 포지션을 연다 (수량 0.1) */
    const openAs = async (email: string, body: object) => {
      const t = await signupAndLogin(app, email);
      expect((await order(body, t)).status).toBe(201);
    };
    /** 남아 있는 포지션의 주인 이메일 */
    const owners = async () =>
      (
        await prisma.position.findMany({
          select: { user: { select: { email: true } } },
        })
      )
        .map((p) => p.user.email)
        .sort();

    it('청산가에 닿은 포지션만 청산한다 (롱은 하락, 숏은 상승)', async () => {
      await seedDepth(app, 'ETHUSDT', {
        bids: [['2600', '10']],
        asks: [['2600', '10']],
      });
      await openAs('a@test.com', { side: 'BUY', leverage: 10 }); // 롱, 청산가 75,000.45
      await openAs('b@test.com', { side: 'BUY', leverage: 50 }); // 롱, 청산가 81,667.16
      await openAs('c@test.com', { side: 'SELL', leverage: 50 }); // 숏, 청산가 84,321.19
      await openAs('d@test.com', { side: 'SELL', leverage: 10 }); // 숏, 청산가 90,934.61
      // ETH 숏, 청산가 2,845.77: 종목 조건이 없으면 BTC 81,000에 잘못 걸린다
      await openAs('e@test.com', {
        symbol: 'ETHUSDT',
        side: 'SELL',
        leverage: 10,
      });

      // 81,000으로 하락: 청산가가 그보다 위인 롱 B만
      expect(await liquidation.checkSymbol('BTCUSDT', markInfo('81000'))).toBe(
        1,
      );
      expect(await owners()).toEqual([
        'a@test.com',
        'c@test.com',
        'd@test.com',
        'e@test.com',
      ]);

      // 85,000으로 상승: 청산가가 그보다 아래인 숏 C만
      expect(await liquidation.checkSymbol('BTCUSDT', markInfo('85000'))).toBe(
        1,
      );
      expect(await owners()).toEqual([
        'a@test.com',
        'd@test.com',
        'e@test.com',
      ]);
    });

    it('시세가 5초 넘게 지났으면 청산하지 않는다', async () => {
      await openAs('b@test.com', { side: 'BUY', leverage: 50 }); // 청산가 81,667.16

      const stale = markInfo('70000', Date.now() - 10_000);
      expect(await liquidation.checkSymbol('BTCUSDT', stale)).toBe(0);
      expect(await prisma.position.count()).toBe(1);
    });
  });
});
