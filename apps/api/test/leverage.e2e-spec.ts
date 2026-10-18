import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  resetData,
  seedDepth,
  signupAndLogin,
} from './utils.js';

const btcBook = {
  bids: [['82999', '1']] as [string, string][],
  asks: [['83000', '1']] as [string, string][],
};

describe('레버리지 설정 (e2e)', () => {
  let app: INestApplication;
  let token: string;

  const getLeverage = (t: string | null = token) => {
    const req = request(app.getHttpServer()).get('/api/leverage');
    return t ? req.set('Authorization', `Bearer ${t}`) : req;
  };
  const putLeverage = (
    symbol: string,
    body: object,
    t: string | null = token,
  ) => {
    const req = request(app.getHttpServer())
      .put(`/api/leverage/${symbol}`)
      .send(body);
    return t ? req.set('Authorization', `Bearer ${t}`) : req;
  };
  const openBtcLong = () =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', qty: '0.002' });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetData(app);
    token = await signupAndLogin(app);
    await seedDepth(app, 'BTCUSDT', btcBook);
  });

  afterAll(async () => {
    await app.close();
  });

  it('로그인해야 쓸 수 있다', async () => {
    expect((await getLeverage(null)).status).toBe(401);
    expect((await putLeverage('BTCUSDT', { leverage: 20 }, null)).status).toBe(
      401,
    );
  });

  it('정한 적 없으면 모든 종목이 기본 10배다', async () => {
    const res = await getLeverage();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ BTCUSDT: 10, ETHUSDT: 10 });
  });

  it('종목별로 저장하고, 다시 바꾸면 덮어쓴다', async () => {
    const saved = await putLeverage('BTCUSDT', { leverage: 20 });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ symbol: 'BTCUSDT', leverage: 20 });

    await putLeverage('ETHUSDT', { leverage: 5 });
    await putLeverage('BTCUSDT', { leverage: 25 });

    expect((await getLeverage()).body).toEqual({ BTCUSDT: 25, ETHUSDT: 5 });
  });

  it('다른 사용자의 설정과 섞이지 않는다', async () => {
    await putLeverage('BTCUSDT', { leverage: 20 });
    const other = await signupAndLogin(app, 'other@test.com');

    expect((await getLeverage(other)).body).toEqual({
      BTCUSDT: 10,
      ETHUSDT: 10,
    });
  });

  it('1 이상의 정수가 아니면 거부한다', async () => {
    for (const body of [{ leverage: 0 }, { leverage: 2.5 }, {}]) {
      const res = await putLeverage('BTCUSDT', body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it('종목의 최대 레버리지보다 크면 거부한다', async () => {
    const res = await putLeverage('ETHUSDT', { leverage: 101 });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'INVALID_LEVERAGE',
      message: 'ETHUSDT의 최대 레버리지는 100배입니다.',
    });
  });

  it('지원하지 않는 종목이면 거부한다', async () => {
    const res = await putLeverage('DOGEUSDT', { leverage: 5 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('그 종목 포지션이 열려 있으면 바꿀 수 없고, 다른 종목은 바꿀 수 있다', async () => {
    expect((await openBtcLong()).status).toBe(201);

    const locked = await putLeverage('BTCUSDT', { leverage: 20 });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('LEVERAGE_LOCKED');

    expect((await putLeverage('ETHUSDT', { leverage: 20 })).status).toBe(200);
    expect((await getLeverage()).body).toEqual({ BTCUSDT: 10, ETHUSDT: 20 });
  });
});
