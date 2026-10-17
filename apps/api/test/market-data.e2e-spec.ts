import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  marketKey,
  RECENT_TRADES_LIMIT,
  recentTradesKey,
} from '@paper-futures/shared';
import { Redis } from 'ioredis';
import { AppConfigModule } from '../src/config/app-config.module.js';
import { MarketDataWriterService } from '../src/market-data/market-data-writer.service.js';
import { RedisModule } from '../src/redis/redis.module.js';
import { RedisService } from '../src/redis/redis.service.js';

// Binance 연결(BinanceFeedService)은 빼고, 메시지를 Redis에 쓰는 부분만 테스트한다
describe('MarketDataWriterService (e2e)', () => {
  let moduleRef: TestingModule;
  let writer: MarketDataWriterService;
  let redis: RedisService;

  const markMessage = JSON.stringify({
    stream: 'ethusdt@markPrice@1s',
    data: {
      e: 'markPriceUpdate',
      E: 1790578730000,
      s: 'ETHUSDT',
      p: '3120.50',
      i: '3121.00',
      r: '0.0001',
      T: 1790582400000,
    },
  });

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, RedisModule],
      providers: [MarketDataWriterService],
    }).compile();
    await moduleRef.init();
    writer = moduleRef.get(MarketDataWriterService);
    redis = moduleRef.get(RedisService);
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('최신 시세를 market:{종목}:{종류} 키에 저장한다', async () => {
    await writer.handleMessage(markMessage);

    const saved = JSON.parse((await redis.get(marketKey('ETHUSDT', 'mark')))!);
    expect(saved).toMatchObject({
      markPrice: '3120.50',
      fundingRate: '0.0001',
    });
  });

  it('DB 번호를 붙인 같은 이름의 채널로 방송한다', async () => {
    // 구독 전용 연결이 따로 필요하다 (구독 중인 연결은 다른 명령을 못 쓴다)
    const subscriber = new Redis(redis.options);
    const received = new Promise<string>((resolve) =>
      subscriber.on('message', (_channel, message) => resolve(message)),
    );
    const channel = redis.channel(marketKey('ETHUSDT', 'mark'));
    expect(channel).toMatch(/^[1-9]\d*:market:ETHUSDT:mark$/); // 테스트용 DB 번호 (0번 아님)
    await subscriber.subscribe(channel);

    await writer.handleMessage(markMessage);

    expect(JSON.parse(await received)).toMatchObject({ markPrice: '3120.50' });
    await subscriber.quit();
  });

  it('체결은 최근 목록에도 넣고, 50개를 넘으면 오래된 것부터 버린다', async () => {
    const tradeMessage = (price: string) =>
      JSON.stringify({
        stream: 'ethusdt@aggTrade',
        data: {
          e: 'aggTrade',
          s: 'ETHUSDT',
          a: Number(price),
          p: price,
          q: '0.010',
          T: 1,
          m: false,
        },
      });
    const prices = Array.from({ length: RECENT_TRADES_LIMIT + 2 }, (_, i) =>
      String(3000 + i),
    );
    for (const price of prices) await writer.handleMessage(tradeMessage(price));

    const saved = (await redis.lrange(recentTradesKey('ETHUSDT'), 0, -1)).map(
      (raw) => (JSON.parse(raw) as { price: string }).price,
    );
    expect(saved).toHaveLength(RECENT_TRADES_LIMIT);
    expect(saved[0]).toBe(prices.at(-1));
    expect(saved.at(-1)).toBe(prices[2]);
    expect(
      JSON.parse((await redis.get(marketKey('ETHUSDT', 'trade')))!),
    ).toMatchObject({ price: prices.at(-1) });
  });

  it('24시간 통계를 market:{종목}:ticker에 저장한다', async () => {
    await writer.handleMessage(
      JSON.stringify({
        stream: 'ethusdt@ticker',
        data: {
          e: '24hrTicker',
          E: 1792051154614,
          s: 'ETHUSDT',
          p: '-12.50',
          P: '-0.400',
          c: '3108.00',
          o: '3120.50',
          h: '3150.00',
          l: '3050.00',
          v: '1000.000',
          q: '3110000.00',
        },
      }),
    );

    expect(
      JSON.parse((await redis.get(marketKey('ETHUSDT', 'ticker')))!),
    ).toMatchObject({ lastPrice: '3108.00', priceChangePercent: '-0.400' });
  });

  it('처리할 수 없는 메시지는 저장하지 않는다', async () => {
    expect(await writer.handleMessage('garbage')).toBe(false);
    expect(await redis.keys('market:*')).toHaveLength(0);
  });
});
