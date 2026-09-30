import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import {
  type ClientToServerEvents,
  type DepthEvent,
  type MarkEvent,
  REALTIME_PATH,
  type ServerToClientEvents,
  type TradesEvent,
} from '@paper-futures/shared';
import { io, type Socket } from 'socket.io-client';
import {
  createTestApp,
  publishDepth,
  publishMark,
  publishTrade,
  resetData,
  seedDepth,
  seedMark,
  seedTrade,
} from './utils.js';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('실시간 시세 (e2e)', () => {
  let app: INestApplication;
  let url: string;
  const clients: Client[] = [];

  /** 웹 브라우저처럼 socket.io로 연결한다 */
  const connect = async (): Promise<Client> => {
    const client: Client = io(url, {
      path: REALTIME_PATH,
      transports: ['websocket'],
    });
    clients.push(client);
    await new Promise((resolve) => client.once('connect', () => resolve(null)));
    return client;
  };

  /** ms 동안 받은 이벤트를 모은다 */
  const collect = <T>(
    client: Client,
    event: keyof ServerToClientEvents,
    ms = 300,
  ): Promise<T[]> => {
    const received: T[] = [];
    const listener = (payload: T) => received.push(payload);
    client.on(event, listener as never);
    return new Promise((resolve) =>
      setTimeout(() => {
        client.off(event, listener as never);
        resolve(received);
      }, ms),
    );
  };

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0); // 실제 포트를 열어야 socket.io로 연결할 수 있다
    const { port } = app.getHttpServer().address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
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

  it('방에 들어가자마자 저장된 최신 시세를 받는다', async () => {
    await seedMark(app, 'BTCUSDT', '83000');
    await seedTrade(app, 'BTCUSDT', '83001');
    await seedDepth(app, 'BTCUSDT', { bids: [], asks: [['83002', '1']] });
    const client = await connect();

    const marks = collect<MarkEvent>(client, 'mark');
    const trades = collect<TradesEvent>(client, 'trades');
    const depths = collect<DepthEvent>(client, 'depth');
    await client.emitWithAck('subscribe', 'BTCUSDT');

    expect((await marks).map((m) => m.markPrice)).toEqual(['83000']);
    expect((await trades).map((t) => t.trades[0]?.price)).toEqual(['83001']);
    expect((await depths).map((d) => d.asks)).toEqual([[['83002', '1']]]);
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
});
