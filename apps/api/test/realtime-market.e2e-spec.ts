import type { INestApplication } from '@nestjs/common';
import type {
  CandleEvent,
  DepthEvent,
  MarkEvent,
  TickerEvent,
  TradesEvent,
} from '@paper-futures/shared';
import {
  collectEvents,
  connectRealtime,
  createTestApp,
  listenForRealtime,
  publishCandle,
  publishDepth,
  publishMark,
  publishTicker,
  publishTrade,
  type RealtimeClient,
  resetData,
  seedCandle,
  seedDepth,
  seedMark,
  seedRecentTrades,
  seedTicker,
} from './utils.js';

describe('실시간 시세 (e2e)', () => {
  let app: INestApplication;
  let url: string;
  const clients: RealtimeClient[] = [];

  const connect = async () => {
    const client = await connectRealtime(url);
    clients.push(client);
    return client;
  };
  const collect = collectEvents;

  beforeAll(async () => {
    app = await createTestApp();
    url = await listenForRealtime(app);
  });

  beforeEach(async () => {
    await resetData(app);
  });

  afterEach(() => {
    for (const client of clients) client.disconnect();
    clients.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('BTC 방에 들어가면 BTC 시세만 받는다', async () => {
    const client = await connect();
    expect(await client.emitWithAck('subscribe', 'BTCUSDT')).toEqual({
      ok: true,
    });

    const marks = collect<MarkEvent>(client, 'mark');
    await publishMark(app, 'ETHUSDT', '2600');
    await publishMark(app, 'BTCUSDT', '83000');

    expect((await marks).map((m) => [m.symbol, m.markPrice])).toEqual([
      ['BTCUSDT', '83000'],
    ]);
  });

  it('체결은 0.1초씩 모아서 배열로 보낸다', async () => {
    const client = await connect();
    await client.emitWithAck('subscribe', 'BTCUSDT');

    const batches = collect<TradesEvent>(client, 'trades', 400);
    const prices = Array.from({ length: 10 }, (_, i) => String(83000 + i));
    await Promise.all(prices.map((p) => publishTrade(app, 'BTCUSDT', p)));

    const received = await batches;
    // 10건이 순서대로 다 오지만, 10번이 아니라 한두 번에 나눠서 온다
    expect(received.flatMap((b) => b.trades.map((t) => t.price))).toEqual(
      prices,
    );
    expect(received.length).toBeLessThanOrEqual(2);
  });

  it('호가는 0.1초 중 가장 최근 것만 보낸다', async () => {
    const client = await connect();
    await client.emitWithAck('subscribe', 'BTCUSDT');

    const depths = collect<DepthEvent>(client, 'depth', 400);
    for (const ask of ['83000', '83001', '83002']) {
      await publishDepth(app, 'BTCUSDT', { bids: [], asks: [[ask, '1']] });
    }

    const received = await depths;
    expect(received.length).toBeLessThan(3);
    expect(received.at(-1)?.asks).toEqual([['83002', '1']]);
  });

  it('24시간 통계는 오는 대로 보낸다', async () => {
    const client = await connect();
    await client.emitWithAck('subscribe', 'BTCUSDT');

    const tickers = collect<TickerEvent>(client, 'ticker');
    await publishTicker(app, 'ETHUSDT', '2600');
    await publishTicker(app, 'BTCUSDT', '83000');

    expect((await tickers).map((t) => [t.symbol, t.lastPrice])).toEqual([
      ['BTCUSDT', '83000'],
    ]);
  });

  it('방에 들어가자마자 저장된 최신 시세와 최근 체결 목록을 받는다', async () => {
    await seedMark(app, 'BTCUSDT', '83000');
    await seedRecentTrades(app, 'BTCUSDT', ['83001', '83002', '83003']);
    await seedDepth(app, 'BTCUSDT', { bids: [], asks: [['83002', '1']] });
    await seedTicker(app, 'BTCUSDT', '83003');
    const client = await connect();

    const marks = collect<MarkEvent>(client, 'mark');
    const trades = collect<TradesEvent>(client, 'trades');
    const depths = collect<DepthEvent>(client, 'depth');
    const tickers = collect<TickerEvent>(client, 'ticker');
    await client.emitWithAck('subscribe', 'BTCUSDT');

    expect((await marks).map((m) => m.markPrice)).toEqual(['83000']);
    expect((await trades).map((t) => t.trades.map((x) => x.price))).toEqual([
      ['83001', '83002', '83003'],
    ]);
    expect((await depths).map((d) => d.asks)).toEqual([[['83002', '1']]]);
    expect((await tickers).map((t) => t.lastPrice)).toEqual(['83003']);
  });

  it('지원하지 않는 종목은 거부한다', async () => {
    const client = await connect();

    expect(await client.emitWithAck('subscribe', 'DOGEUSDT')).toEqual({
      ok: false,
      message: '지원하지 않는 종목입니다.',
    });
  });

  it('방에서 나가면 더 이상 받지 않는다', async () => {
    const client = await connect();
    await client.emitWithAck('subscribe', 'BTCUSDT');
    await client.emitWithAck('unsubscribe', 'BTCUSDT');

    const marks = collect<MarkEvent>(client, 'mark');
    await publishMark(app, 'BTCUSDT', '83000');

    expect(await marks).toEqual([]);
  });

  describe('캔들', () => {
    it('종목·봉 간격 방에 들어가면 그 종목, 그 간격의 봉만 받는다', async () => {
      const client = await connect();
      expect(
        await client.emitWithAck('subscribeCandles', {
          symbol: 'BTCUSDT',
          interval: '15m',
        }),
      ).toEqual({ ok: true });

      const candles = collect<CandleEvent>(client, 'candle');
      await publishCandle(app, 'ETHUSDT', '15m', '2600.00');
      await publishCandle(app, 'BTCUSDT', '1h', '83100.00');
      await publishCandle(app, 'BTCUSDT', '15m', '83200.00');

      expect(
        (await candles).map((c) => [c.symbol, c.interval, c.candle.close]),
      ).toEqual([['BTCUSDT', '15m', '83200.00']]);
    });

    it('시세 방에만 들어간 연결은 봉을 받지 않는다', async () => {
      const client = await connect();
      await client.emitWithAck('subscribe', 'BTCUSDT');

      const candles = collect<CandleEvent>(client, 'candle');
      await publishCandle(app, 'BTCUSDT', '15m', '83200.00');

      expect(await candles).toEqual([]);
    });

    it('방에 들어가자마자 저장된 최신 봉을 받는다', async () => {
      await seedCandle(app, 'BTCUSDT', '1h', '83300.00');
      const client = await connect();

      const candles = collect<CandleEvent>(client, 'candle');
      await client.emitWithAck('subscribeCandles', {
        symbol: 'BTCUSDT',
        interval: '1h',
      });

      expect((await candles).map((c) => c.candle.close)).toEqual(['83300.00']);
    });

    it('지원하지 않는 종목이나 봉 간격은 거부한다', async () => {
      const client = await connect();

      expect(
        await client.emitWithAck('subscribeCandles', {
          symbol: 'DOGEUSDT' as never,
          interval: '15m',
        }),
      ).toEqual({ ok: false, message: '지원하지 않는 종목입니다.' });
      expect(
        await client.emitWithAck('subscribeCandles', {
          symbol: 'BTCUSDT',
          interval: '3m' as never,
        }),
      ).toEqual({ ok: false, message: '지원하지 않는 봉 간격입니다.' });
    });

    it('방에서 나가면 더 이상 받지 않는다', async () => {
      const client = await connect();
      const target = { symbol: 'BTCUSDT', interval: '15m' } as const;
      await client.emitWithAck('subscribeCandles', target);
      await client.emitWithAck('unsubscribeCandles', target);

      const candles = collect<CandleEvent>(client, 'candle');
      await publishCandle(app, 'BTCUSDT', '15m', '83200.00');

      expect(await candles).toEqual([]);
    });
  });
});
