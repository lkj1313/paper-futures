import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { marketKey } from '@paper-futures/shared';
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

  it('같은 이름의 채널로 방송한다', async () => {
    // 구독 전용 연결이 따로 필요하다 (구독 중인 연결은 다른 명령을 못 쓴다)
    const subscriber = new Redis(redis.options);
    const received = new Promise<string>((resolve) =>
      subscriber.on('message', (_channel, message) => resolve(message)),
    );
    await subscriber.subscribe(marketKey('ETHUSDT', 'mark'));

    await writer.handleMessage(markMessage);

    expect(JSON.parse(await received)).toMatchObject({ markPrice: '3120.50' });
    await subscriber.quit();
  });

  it('처리할 수 없는 메시지는 저장하지 않는다', async () => {
    expect(await writer.handleMessage('garbage')).toBe(false);
    expect(await redis.keys('market:*')).toHaveLength(0);
  });
});
