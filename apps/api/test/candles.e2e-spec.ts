import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { BinanceRestClient } from '../src/market/binance-rest.client.js';
import { createTestApp } from './utils.js';

const KLINES = [
  [
    1792328400000,
    '81952.40',
    '81952.50',
    '81870.30',
    '81877.10',
    '413.252',
    1792329299999,
    '33848136.96150',
    12791,
    '182.930',
    '14983637.77990',
    '0',
  ],
];

describe('GET /api/markets/:symbol/candles (e2e)', () => {
  let app: INestApplication;
  const binance = { getKlines: vi.fn() };

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(BinanceRestClient).useValue(binance),
    );
  });

  beforeEach(() => {
    binance.getKlines.mockReset().mockResolvedValue(KLINES);
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string) => request(app.getHttpServer()).get(path);

  it('로그인 없이 바이낸스 klines를 Candle 목록으로 바꿔 준다', async () => {
    const res = await get('/api/markets/BTCUSDT/candles?interval=15m&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        time: 1792328400000,
        open: '81952.40',
        high: '81952.50',
        low: '81870.30',
        close: '81877.10',
        volume: '413.252',
      },
    ]);
    expect(binance.getKlines).toHaveBeenCalledWith('BTCUSDT', '15m', 2);
  });

  it('개수를 비우면 500개를 요청한다', async () => {
    await get('/api/markets/ETHUSDT/candles?interval=1h');

    expect(binance.getKlines).toHaveBeenCalledWith('ETHUSDT', '1h', 500);
  });

  it('봉 간격이 없거나 지원하지 않거나, 개수가 1~1000을 벗어나면 400', async () => {
    for (const query of [
      '',
      '?interval=3m',
      '?interval=15m&limit=0',
      '?interval=15m&limit=1001',
      '?interval=15m&limit=abc',
    ]) {
      const res = await get(`/api/markets/BTCUSDT/candles${query}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    }
    expect(binance.getKlines).not.toHaveBeenCalled();
  });

  it('지원하지 않는 종목이면 404', async () => {
    const res = await get('/api/markets/DOGEUSDT/candles?interval=15m');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('바이낸스 호출이 실패하거나 응답 모양이 다르면 503', async () => {
    binance.getKlines.mockRejectedValueOnce(new Error('timeout'));
    const failed = await get('/api/markets/BTCUSDT/candles?interval=15m');

    binance.getKlines.mockResolvedValueOnce({ code: -1120 });
    const malformed = await get('/api/markets/BTCUSDT/candles?interval=15m');

    for (const res of [failed, malformed]) {
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('MARKET_DATA_UNAVAILABLE');
    }
  });
});
