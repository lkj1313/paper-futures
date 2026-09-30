import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  LimitFillService,
  type TradeRange,
} from '../src/engine/limit-fill.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createEngineContext,
  createTestApp,
  resetData,
  seedDepth,
  signupAndLogin,
} from './utils.js';

// 지금 BTC: 매수 호가 82,999 / 매도 호가 83,000 (사면 0.1개 평균 83,000.5)
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

/** 점검 사이에 들어온 체결가 범위 (기본: 지금 받은 체결) */
const range = (low: string, high: string, at = Date.now()): TradeRange => ({
  low,
  lowAt: at,
  high,
  highAt: at,
});

describe('지정가 대기 주문 체결 (e2e)', () => {
  let app: INestApplication;
  let engine: TestingModule;
  let prisma: PrismaService;
  let limitFill: LimitFillService;
  let token: string;

  const order = (body: object) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', type: 'LIMIT', qty: '0.1', ...body });
  const wallet = async () =>
    (
      await request(app.getHttpServer())
        .get('/api/wallet')
        .set('Authorization', `Bearer ${token}`)
    ).body;
  const findOrder = (id: string) =>
    prisma.order.findUniqueOrThrow({ where: { id } });
  /** 체결 대상 조회 결과와 같은 모양 */
  const targetOf = async (id: string) => {
    const { userId } = await findOrder(id);
    return { id, userId };
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
    engine = await createEngineContext();
    prisma = app.get(PrismaService);
    limitFill = engine.get(LimitFillService);
  });

  beforeEach(async () => {
    await resetData(app);
    token = await signupAndLogin(app);
    await seedDepth(app, 'BTCUSDT', btcBook);
  });

  afterAll(async () => {
    await engine.close();
    await app.close();
  });

  it('매수: 최저 체결가가 지정가 이하면 지정가로 체결한다 (메이커 수수료, 묶인 금액 풀림)', async () => {
    const placed = await order({ side: 'BUY', price: '80000', leverage: 10 });
    expect((await wallet()).openOrderMargin).toBe('801.6');

    expect(
      await limitFill.checkSymbol('BTCUSDT', range('79990', '83000')),
    ).toBe(1);

    // 체결가는 79,990이 아니라 지정가 80,000. 수수료 8,000 × 0.02% = 1.6
    const filled = await findOrder(placed.body.order.id);
    expect(filled.status).toBe('FILLED');
    expect(filled.avgFillPrice?.toString()).toBe('80000');
    expect(filled.fee.toString()).toBe('1.6');

    const position = await prisma.position.findFirstOrThrow();
    expect(position.side).toBe('LONG');
    expect(position.entryPrice.toString()).toBe('80000');
    expect(position.isolatedMargin.toString()).toBe('800');

    // 묶였던 801.6 → 증거금 800으로 바뀌고 수수료 1.6이 빠짐
    expect(await wallet()).toEqual({
      asset: 'USDT',
      balance: '9998.4',
      usedMargin: '800',
      openOrderMargin: '0',
      availableBalance: '9198.4',
    });
    await ledgerSumEqualsBalance();
  });

  it('지정가에 닿지 않았으면 그대로 대기', async () => {
    const placed = await order({ side: 'BUY', price: '80000' });

    expect(
      await limitFill.checkSymbol('BTCUSDT', range('80000.1', '83000')),
    ).toBe(0);
    expect((await findOrder(placed.body.order.id)).status).toBe('NEW');
  });

  it('주문을 넣기 전에 일어난 거래로는 체결하지 않는다', async () => {
    const placed = await order({ side: 'BUY', price: '80000' });

    const before = range('79990', '83000', Date.now() - 60_000);
    expect(await limitFill.checkSymbol('BTCUSDT', before)).toBe(0);
    expect((await findOrder(placed.body.order.id)).status).toBe('NEW');
  });

  it('매도 익절(reduceOnly): 최고 체결가가 지정가 이상이면 포지션을 닫고 손익을 확정한다', async () => {
    // 롱 0.1개 83,000.5 (잔고 9,995.849975)
    await order({ type: 'MARKET', side: 'BUY', leverage: 10 });
    const tp = await order({ side: 'SELL', price: '90000', reduceOnly: true });

    expect(
      await limitFill.checkSymbol('BTCUSDT', range('83000', '90000')),
    ).toBe(1);

    // 실현 손익 9,000 − 8,300.05 = 699.95, 수수료 9,000 × 0.02% = 1.8
    const filled = await findOrder(tp.body.order.id);
    expect(filled.realizedPnl.toString()).toBe('699.95');
    expect(filled.fee.toString()).toBe('1.8');
    expect(await prisma.position.count()).toBe(0);
    expect((await wallet()).balance).toBe('10693.999975');
    await ledgerSumEqualsBalance();
  });

  it('체결하려는 순간 조건이 안 맞으면 시스템 취소(EXPIRED): 이미 닫힌 포지션의 익절 주문', async () => {
    await order({ type: 'MARKET', side: 'BUY', leverage: 10 });
    const tp = await order({ side: 'SELL', price: '90000', reduceOnly: true });
    // 사용자가 시장가로 먼저 닫음
    await order({ type: 'MARKET', side: 'SELL', reduceOnly: true });

    expect(
      await limitFill.checkSymbol('BTCUSDT', range('83000', '90000')),
    ).toBe(0);

    expect((await findOrder(tp.body.order.id)).status).toBe('EXPIRED');
    // 매도 주문이 숏을 새로 열지 않는다
    expect(await prisma.position.count()).toBe(0);
  });

  it('취소와 체결이 동시에 와도 한쪽만 반영된다 (지갑 잠금)', async () => {
    const placed = await order({ side: 'BUY', price: '80000' });
    const id: string = placed.body.order.id;

    const [cancelRes, filled] = await Promise.all([
      request(app.getHttpServer())
        .delete(`/api/orders/${id}`)
        .set('Authorization', `Bearer ${token}`),
      limitFill.fill(await targetOf(id)),
    ]);

    // 체결이 먼저면 취소는 409, 취소가 먼저면 체결은 건너뜀
    const status = (await findOrder(id)).status;
    if (filled) {
      expect(status).toBe('FILLED');
      expect(cancelRes.status).toBe(409);
    } else {
      expect(status).toBe('CANCELED');
      expect(cancelRes.status).toBe(200);
    }
    await ledgerSumEqualsBalance();
  });
});
