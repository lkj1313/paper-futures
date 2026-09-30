import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import type {
  AccountOrder,
  AccountPosition,
  AccountWallet,
} from '@paper-futures/shared';
import request from 'supertest';
import { FundingService } from '../src/engine/funding.service.js';
import { LiquidationService } from '../src/engine/liquidation.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  collectEvents,
  connectRealtime,
  createEngineContext,
  createTestApp,
  listenForRealtime,
  type RealtimeClient,
  resetData,
  seedDepth,
  signupAndLogin,
} from './utils.js';

// 사면 0.1개 평균 83,000.5
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

type OrdersEvent = { orders: AccountOrder[] };
type PositionsEvent = { positions: AccountPosition[] };

describe('실시간 내 계정 이벤트 (e2e)', () => {
  let app: INestApplication;
  let engine: TestingModule;
  let prisma: PrismaService;
  let jwt: JwtService;
  let url: string;
  const clients: RealtimeClient[] = [];

  const connect = async (token?: string) => {
    const client = await connectRealtime(url, token);
    clients.push(client);
    return client;
  };
  /** 한 연결에서 ms 동안 받은 계정 이벤트를 모두 모은다 */
  const collectAccount = (client: RealtimeClient, ms = 500) => ({
    orders: collectEvents<OrdersEvent>(client, 'orders', ms),
    positions: collectEvents<PositionsEvent>(client, 'positions', ms),
    wallets: collectEvents<AccountWallet>(client, 'wallet', ms),
  });
  const order = (token: string, body: object) =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', qty: '0.1', leverage: 10, ...body });
  /**
   * 롱을 열고, 그 이벤트(지갑이 마지막)까지 다 받은 뒤에 돌아온다.
   * REST 응답이 실시간 이벤트보다 먼저 오므로, 기다리지 않으면 다음에 모으는 이벤트에 섞인다
   */
  const openAndWait = async (client: RealtimeClient, token: string) => {
    const delivered = new Promise((resolve) => client.once('wallet', resolve));
    await order(token, { type: 'MARKET', side: 'BUY' });
    await delivered;
  };
  const userIdOf = async (email: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { email } })).id;

  beforeAll(async () => {
    app = await createTestApp();
    url = await listenForRealtime(app);
    engine = await createEngineContext();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  beforeEach(async () => {
    await resetData(app);
    await seedDepth(app, 'BTCUSDT', btcBook);
  });

  afterEach(() => {
    for (const client of clients) client.disconnect();
    clients.length = 0;
  });

  afterAll(async () => {
    await engine.close();
    await app.close();
  });

  it('시장가 주문이 체결되면 주문, 포지션, 지갑을 받는다', async () => {
    const token = await signupAndLogin(app);
    const client = await connect(token);
    const events = collectAccount(client);

    await order(token, { type: 'MARKET', side: 'BUY' });

    const orders = (await events.orders).flatMap((e) => e.orders);
    expect(orders.map((o) => [o.type, o.status])).toEqual([
      ['MARKET', 'FILLED'],
    ]);
    expect((await events.positions).at(-1)?.positions).toEqual([
      expect.objectContaining({
        side: 'LONG',
        qty: '0.1',
        isolatedMargin: '830.005',
      }),
    ]);
    expect((await events.wallets).at(-1)).toMatchObject({
      balance: '9995.849975',
      usedMargin: '830.005',
    });
  });

  it('지정가를 넣고 취소하면 NEW, CANCELED 순서로 받고 묶인 금액도 따라 바뀐다', async () => {
    const token = await signupAndLogin(app);
    const client = await connect(token);
    const events = collectAccount(client);

    const placed = await order(token, {
      type: 'LIMIT',
      side: 'BUY',
      price: '80000',
    });
    await request(app.getHttpServer())
      .delete(`/api/orders/${placed.body.order.id}`)
      .set('Authorization', `Bearer ${token}`);

    const statuses = (await events.orders).flatMap((e) =>
      e.orders.map((o) => o.status),
    );
    expect(statuses).toEqual(['NEW', 'CANCELED']);
    expect((await events.wallets).map((w) => w.openOrderMargin)).toEqual([
      '801.6',
      '0',
    ]);
  });

  it('engine이 청산하면 청산 주문, 빈 포지션 목록, 줄어든 지갑을 받는다', async () => {
    const token = await signupAndLogin(app);
    const client = await connect(token);
    await openAndWait(client, token); // 청산가 75,000.45
    const position = await prisma.position.findFirstOrThrow();

    const events = collectAccount(client);
    await engine
      .get(LiquidationService)
      .liquidate({ id: position.id, userId: position.userId }, '75000');

    const orders = (await events.orders).flatMap((e) => e.orders);
    expect(orders.map((o) => [o.type, o.status])).toEqual([
      ['LIQUIDATION', 'FILLED'],
    ]);
    expect((await events.positions).at(-1)?.positions).toEqual([]);
    expect((await events.wallets).at(-1)?.balance).toBe('9165.844975');
  });

  it('펀딩비가 정산되면 주문 없이 포지션과 지갑만 받는다', async () => {
    const token = await signupAndLogin(app);
    const client = await connect(token);
    await openAndWait(client, token);

    const events = collectAccount(client);
    await engine.get(FundingService).settle({
      symbol: 'BTCUSDT',
      fundingTime: Date.now(),
      fundingRate: '0.0001',
      markPrice: '83000',
    });

    expect(await events.orders).toEqual([]);
    expect((await events.positions).at(-1)?.positions[0]?.isolatedMargin).toBe(
      '829.175', // 830.005 − 0.83
    );
    expect((await events.wallets).at(-1)?.balance).toBe('9995.019975');
  });

  it('남의 계정 이벤트는 받지 않는다 (토큰 없는 연결도 받지 않는다)', async () => {
    const alice = await connect(await signupAndLogin(app, 'alice@test.com'));
    const anonymous = await connect();
    const aliceEvents = collectAccount(alice);
    const anonymousEvents = collectAccount(anonymous);

    const bob = await signupAndLogin(app, 'bob@test.com');
    await order(bob, { type: 'MARKET', side: 'BUY' });

    for (const events of [aliceEvents, anonymousEvents]) {
      expect(await events.orders).toEqual([]);
      expect(await events.positions).toEqual([]);
      expect(await events.wallets).toEqual([]);
    }
  });

  it('틀린 토큰은 UNAUTHORIZED, 만료된 토큰은 TOKEN_EXPIRED로 연결을 거부한다', async () => {
    await expect(connect('not-a-token')).rejects.toThrow('UNAUTHORIZED');

    const expired = jwt.sign({ sub: randomUUID() }, { expiresIn: -10 });
    await expect(connect(expired)).rejects.toThrow('TOKEN_EXPIRED');
  });

  it('연결 중에 토큰이 만료되면 sessionExpired를 받고 연결이 끊긴다', async () => {
    await signupAndLogin(app);
    const shortLived = jwt.sign(
      { sub: await userIdOf('user@test.com') },
      { expiresIn: 1 },
    );
    const client = await connect(shortLived);

    await Promise.all([
      new Promise((resolve) =>
        client.once('sessionExpired', () => resolve(null)),
      ),
      new Promise((resolve) => client.once('disconnect', resolve)),
    ]);
    expect(client.connected).toBe(false);
  });
});
