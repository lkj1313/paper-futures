import { Injectable } from '@nestjs/common';
import {
  isStale,
  type MarketDataKind,
  type MarketSymbol,
  type MarketTrade,
  type MarkPriceInfo,
  marketKey,
  type OrderBookDepth,
  recentTradesKey,
  SYMBOLS,
  type Ticker24h,
} from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';
import { RedisService } from '../redis/redis.service.js';
import type { MarketSummaryDto, OrderBookDto } from './dto/market.dto.js';

// Redis 값은 market-data 프로세스가 검증해서 넣은 JSON이다
const parse = <T>(value: string | null): T | undefined =>
  value === null ? undefined : (JSON.parse(value) as T);

/** market-data 프로세스가 Redis에 넣어둔 시세를 읽는다 (api는 읽기만 한다) */
@Injectable()
export class MarketService {
  constructor(private readonly redis: RedisService) {}

  async getSummaries(now = Date.now()): Promise<MarketSummaryDto[]> {
    // 종목별 체결, 마크가격, 24시간 통계 키를 MGET 한 번으로 가져온다
    const keys = SYMBOLS.flatMap((s) => [
      marketKey(s, 'trade'),
      marketKey(s, 'mark'),
      marketKey(s, 'ticker'),
    ]);
    const values = await this.redis.mget(...keys);

    return SYMBOLS.map((symbol, i) => {
      const trade = parse<MarketTrade>(values[i * 3]);
      const mark = parse<MarkPriceInfo>(values[i * 3 + 1]);
      const ticker = parse<Ticker24h>(values[i * 3 + 2]);
      return {
        symbol,
        lastPrice: trade?.price ?? null,
        markPrice: mark?.markPrice ?? null,
        indexPrice: mark?.indexPrice ?? null,
        fundingRate: mark?.fundingRate ?? null,
        nextFundingTime: mark?.nextFundingTime ?? null,
        priceChange: ticker?.priceChange ?? null,
        priceChangePercent: ticker?.priceChangePercent ?? null,
        highPrice: ticker?.highPrice ?? null,
        lowPrice: ticker?.lowPrice ?? null,
        volume: ticker?.volume ?? null,
        quoteVolume: ticker?.quoteVolume ?? null,
        updatedAt: mark?.time ?? null,
        // 체결은 거래가 뜸하면 한동안 안 올 수 있어서, 1초마다 오는 마크가격으로 판단한다
        stale: isStale(mark?.receivedAt, now),
      };
    });
  }

  /** 한 종목의 최근 체결 목록(오래된 것부터), 마크가격, 호가, 24시간 통계를 읽는다. 받은 적 없으면 undefined */
  async getSnapshot(symbol: MarketSymbol) {
    const [[mark = null, depth = null, ticker = null], recentTrades] =
      await Promise.all([
        this.redis.mget(
          marketKey(symbol, 'mark'),
          marketKey(symbol, 'depth'),
          marketKey(symbol, 'ticker'),
        ),
        this.redis.lrange(recentTradesKey(symbol), 0, -1),
      ]);
    return {
      trades: recentTrades
        .reverse()
        .map((raw) => JSON.parse(raw) as MarketTrade),
      mark: parse<MarkPriceInfo>(mark),
      depth: parse<OrderBookDepth>(depth),
      ticker: parse<Ticker24h>(ticker),
    };
  }

  /** 모든 종목의 최신 마크가격을 MGET 한 번으로 읽는다. 받은 적 없으면 undefined */
  getMarkPrices() {
    return this.getLatest<MarkPriceInfo>('mark');
  }

  /** 모든 종목의 가장 최근 체결을 MGET 한 번으로 읽는다. 받은 적 없으면 undefined */
  getLastTrades() {
    return this.getLatest<MarketTrade>('trade');
  }

  private async getLatest<T>(
    kind: MarketDataKind,
  ): Promise<Record<MarketSymbol, T | undefined>> {
    const values = await this.redis.mget(
      ...SYMBOLS.map((s) => marketKey(s, kind)),
    );
    return Object.fromEntries(
      SYMBOLS.map((symbol, i) => [symbol, parse<T>(values[i])]),
    ) as Record<MarketSymbol, T | undefined>;
  }

  /**
   * 주문 체결에 쓸 호가. 없거나 오래됐으면 거부한다 (오래된 가격으로 체결하지 않는다)
   */
  async getFreshDepth(symbol: MarketSymbol, now = Date.now()) {
    const depth = await this.getDepth(symbol, now);
    if (depth.stale) {
      throw new AppException('MARKET_DATA_UNAVAILABLE', {
        message: '시세가 지연되고 있어 지금은 주문할 수 없습니다.',
      });
    }
    return depth;
  }

  async getDepth(
    symbol: MarketSymbol,
    now = Date.now(),
  ): Promise<OrderBookDto> {
    const depth = parse<OrderBookDepth>(
      await this.redis.get(marketKey(symbol, 'depth')),
    );
    if (!depth) throw new AppException('MARKET_DATA_UNAVAILABLE');

    return {
      symbol,
      bids: depth.bids,
      asks: depth.asks,
      updatedAt: depth.time,
      stale: isStale(depth.receivedAt, now),
    };
  }
}
