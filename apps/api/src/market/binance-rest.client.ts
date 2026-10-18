import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CandleInterval, MarketSymbol } from '@paper-futures/shared';
import type { Env } from '../config/env.js';

const TIMEOUT_MS = 5_000;

@Injectable()
export class BinanceRestClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get('BINANCE_FUTURES_REST_URL', { infer: true });
  }

  async getKlines(
    symbol: MarketSymbol,
    interval: CandleInterval,
    limit: number,
  ): Promise<unknown> {
    const url = new URL('/fapi/v1/klines', this.baseUrl);
    url.search = new URLSearchParams({
      symbol,
      interval,
      limit: String(limit),
    }).toString();

    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Binance klines 요청 실패: ${res.status}`);
    return res.json();
  }
}
