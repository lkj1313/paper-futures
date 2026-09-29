import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  resetData,
  seedDepth,
  seedMark,
  signupAndLogin,
} from './utils.js';

type Level = [string, string];

// 0.1개 매수 → 평균 83,000.5
const openBook = {
  bids: [['82999', '0.05']] as Level[],
  asks: [
    ['83000', '0.05'],
    ['83001', '0.1'],
  ] as Level[],
};
const deepBook = (price: string) => ({
  bids: [[price, '100']] as Level[],
  asks: [[price, '100']] as Level[],
});

describe('포지션, 주문 조회 (e2e)', () => {
  let app: INestApplication;
  let alice: string;
  let bob: string;

  const get = (path: string, token?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };
  const order = (token: string, body: object) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'MARKET', ...body });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetData(app);
    alice = await signupAndLogin(app, 'alice@test.com');
    bob = await signupAndLogin(app, 'bob@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/positions', () => {
    it('마크가격 기준 미실현 손익, ROE, 청산가를 함께 준다', async () => {
      await seedDepth(app, 'BTCUSDT', openBook);
      await order(alice, {
        symbol: 'BTCUSDT',
        side: 'BUY',
        qty: '0.1',
        leverage: 10,
      });
      await seedMark(app, 'BTCUSDT', '85000');

      const res = await get('/api/positions', alice);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          symbol: 'BTCUSDT',
          side: 'LONG',
          qty: '0.1',
          entryPrice: '83000.5',
          leverage: 10,
          isolatedMargin: '830.005',
          markPrice: '85000',
          unrealizedPnl: '199.95',
          roe: '0.24090216',
          liquidationPrice: '75000.45180723',
          stale: false,
        },
      ]);
    });

    it('마크가격이 없으면 손익과 ROE는 null, 청산가는 있다', async () => {
      await seedDepth(app, 'BTCUSDT', openBook);
      await order(alice, {
        symbol: 'BTCUSDT',
        side: 'BUY',
        qty: '0.1',
        leverage: 10,
      });

      const [position] = (await get('/api/positions', alice)).body;

      expect(position).toMatchObject({
        markPrice: null,
        unrealizedPnl: null,
        roe: null,
        liquidationPrice: '75000.45180723',
        stale: true,
      });
    });

    it('포지션이 없으면 빈 배열', async () => {
      expect((await get('/api/positions', alice)).body).toEqual([]);
    });
  });

  describe('GET /api/orders', () => {
    // BTC 3건, ETH 1건 주문
    const placeOrders = async () => {
      await seedDepth(app, 'BTCUSDT', deepBook('83000'));
      await seedDepth(app, 'ETHUSDT', deepBook('2600'));
      for (const qty of ['0.01', '0.02', '0.03']) {
        await order(alice, { symbol: 'BTCUSDT', side: 'BUY', qty });
      }
      await order(alice, { symbol: 'ETHUSDT', side: 'BUY', qty: '0.1' });
    };

    it('최신순으로 limit개씩, nextCursor로 이어서 가져온다', async () => {
      await placeOrders();

      const page1 = await get('/api/orders?limit=3', alice);
      expect(page1.status).toBe(200);
      expect(page1.body.items.map((o: { qty: string }) => o.qty)).toEqual([
        '0.1', // ETH
        '0.03',
        '0.02',
      ]);
      expect(page1.body.nextCursor).toEqual(expect.any(String));

      const page2 = await get(
        `/api/orders?limit=3&cursor=${page1.body.nextCursor}`,
        alice,
      );
      expect(page2.body.items.map((o: { qty: string }) => o.qty)).toEqual([
        '0.01',
      ]);
      expect(page2.body.nextCursor).toBeNull();
    });

    it('symbol로 거를 수 있다 (소문자 허용)', async () => {
      await placeOrders();

      const res = await get('/api/orders?symbol=ethusdt', alice);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        symbol: 'ETHUSDT',
        qty: '0.1',
      });
    });

    it('잘못된 쿼리는 400 VALIDATION_ERROR', async () => {
      for (const q of ['limit=0', 'cursor=abc', 'symbol=DOGEUSDT']) {
        const res = await get(`/api/orders?${q}`, alice);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  it('다른 사용자의 포지션과 주문은 보이지 않는다', async () => {
    await seedDepth(app, 'BTCUSDT', deepBook('83000'));
    await order(alice, { symbol: 'BTCUSDT', side: 'BUY', qty: '0.01' });

    expect((await get('/api/positions', bob)).body).toEqual([]);
    expect((await get('/api/orders', bob)).body).toEqual({
      items: [],
      nextCursor: null,
    });
    expect((await get('/api/positions', alice)).body).toHaveLength(1);
  });

  it('토큰 없이 조회하면 401', async () => {
    expect((await get('/api/positions')).status).toBe(401);
    expect((await get('/api/orders')).status).toBe(401);
  });
});
