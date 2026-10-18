import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { BinanceRestClient } from './binance-rest.client.js';

const config = {
  get: () => 'https://binance.test',
} as unknown as ConfigService<Env, true>;

describe('BinanceRestClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('종목, 봉 간격, 개수로 klines를 요청하고 받은 JSON을 그대로 돌려준다', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([[1, '2']]));
    vi.stubGlobal('fetch', fetch);

    const body = await new BinanceRestClient(config).getKlines(
      'BTCUSDT',
      '15m',
      2,
    );

    expect(body).toEqual([[1, '2']]);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      'https://binance.test/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=2',
    );
  });

  it('바이낸스가 실패 상태로 답하면 에러를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: -1003, msg: 'Too many requests' },
            { status: 429 },
          ),
        ),
    );

    await expect(
      new BinanceRestClient(config).getKlines('BTCUSDT', '15m', 2),
    ).rejects.toThrow('429');
  });
});
