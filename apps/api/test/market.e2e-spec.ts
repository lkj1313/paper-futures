import type { INestApplication } from '@nestjs/common';
import {
  type MarketTrade,
  type MarkPriceInfo,
  marketKey,
  type OrderBookDepth,
} from '@paper-futures/shared';
import request from 'supertest';
import { RedisService } from '../src/redis/redis.service.js';
import { createTestApp, resetData } from './utils.js';

describe('시세 조회 (e2e)', () => {
  let app: INestApplication;
  let redis: RedisService;

  const get = (path: string) => request(app.getHttpServer()).get(path);

  // market-data 프로세스 대신 테스트용 Redis에 직접 시세를 넣는다
  const seed = async (
    trade: MarketTrade,
    mark: MarkPriceInfo,
    depth: OrderBookDepth,
  ) => {
    await redis.mset(
      marketKey('BTCUSDT', 'trade'),
      JSON.stringify(trade),
      marketKey('BTCUSDT', 'mark'),
      JSON.stringify(mark),
      marketKey('BTCUSDT', 'depth'),
      JSON.stringify(depth),
    );
  };

  const fresh = () => {
    const now = Date.now();
    return {
      trade: {
        price: '83105.30',
        qty: '0.100',
        time: now - 100,
        receivedAt: now,
      },
      mark: {
        markPrice: '83105.59',
        indexPrice: '83145.80',
        fundingRate: '-0.00002539',
        nextFundingTime: 1790582400000,
        time: now - 50,
        receivedAt: now,
      },
      depth: {
        bids: [['83105.30', '18.833']],
        asks: [['83105.40', '1.224']],
        time: now - 30,
        receivedAt: now,
      } as OrderBookDepth,
    };
  };

  beforeAll(async () => {
    app = await createTestApp();
    redis = app.get(RedisService);
  });

  beforeEach(async () => {
    await resetData(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/markets: 받은 시세는 문자열로, 받지 못한 종목은 null과 stale', async () => {
    const { trade, mark, depth } = fresh();
    await seed(trade, mark, depth);

    const res = await get('/api/markets'); // 토큰 없이 호출 (공개 API)

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        symbol: 'BTCUSDT',
        lastPrice: '83105.30',
        markPrice: '83105.59',
        indexPrice: '83145.80',
        fundingRate: '-0.00002539',
        nextFundingTime: 1790582400000,
        updatedAt: mark.time,
        stale: false,
      },
      {
        symbol: 'ETHUSDT',
        lastPrice: null,
        markPrice: null,
        indexPrice: null,
        fundingRate: null,
        nextFundingTime: null,
        updatedAt: null,
        stale: true,
      },
    ]);
  });

  it('받은 지 오래된 마크가격이면 stale: true', async () => {
    const { trade, mark, depth } = fresh();
    await seed(trade, { ...mark, receivedAt: Date.now() - 10_000 }, depth);

    const res = await get('/api/markets');

    expect(res.body[0]).toMatchObject({ symbol: 'BTCUSDT', stale: true });
  });

  it('GET /api/markets/:symbol/depth: 호가를 준다 (소문자 종목도 허용)', async () => {
    const { trade, mark, depth } = fresh();
    await seed(trade, mark, depth);

    const res = await get('/api/markets/btcusdt/depth');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      symbol: 'BTCUSDT',
      bids: [['83105.30', '18.833']],
      asks: [['83105.40', '1.224']],
      updatedAt: depth.time,
      stale: false,
    });
  });

  it('호가를 아직 받지 못했으면 503 MARKET_DATA_UNAVAILABLE', async () => {
    const res = await get('/api/markets/ETHUSDT/depth');

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('MARKET_DATA_UNAVAILABLE');
  });

  it('지원하지 않는 종목이면 404', async () => {
    const res = await get('/api/markets/DOGEUSDT/depth');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 'NOT_FOUND',
      message: '지원하지 않는 종목입니다.',
    });
  });
});
