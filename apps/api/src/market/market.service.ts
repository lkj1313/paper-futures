import { Injectable } from '@nestjs/common';
import {
  isStale,
  type MarketSymbol,
  type MarketTrade,
  type MarkPriceInfo,
  marketKey,
  type OrderBookDepth,
  SYMBOLS,
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
    // 종목별 체결, 마크가격 키를 MGET 한 번으로 가져온다
    const keys = SYMBOLS.flatMap((s) => [
      marketKey(s, 'trade'),
      marketKey(s, 'mark'),
    ]);
    const values = await this.redis.mget(...keys);

    return SYMBOLS.map((symbol, i) => {
      const trade = parse<MarketTrade>(values[i * 2]);
      const mark = parse<MarkPriceInfo>(values[i * 2 + 1]);
      return {
        symbol,
        lastPrice: trade?.price ?? null,
        markPrice: mark?.markPrice ?? null,
        indexPrice: mark?.indexPrice ?? null,
        fundingRate: mark?.fundingRate ?? null,
        nextFundingTime: mark?.nextFundingTime ?? null,
        updatedAt: mark?.time ?? null,
        // 체결은 거래가 뜸하면 한동안 안 올 수 있어서, 1초마다 오는 마크가격으로 판단한다
        stale: isStale(mark?.receivedAt, now),
      };
    });
  }

  /** 모든 종목의 최신 마크가격을 MGET 한 번으로 읽는다. 받은 적 없으면 undefined */
  async getMarkPrices(): Promise<
    Record<MarketSymbol, MarkPriceInfo | undefined>
  > {
    const values = await this.redis.mget(
      ...SYMBOLS.map((s) => marketKey(s, 'mark')),
    );
    return Object.fromEntries(
      SYMBOLS.map((symbol, i) => [symbol, parse<MarkPriceInfo>(values[i])]),
    ) as Record<MarketSymbol, MarkPriceInfo | undefined>;
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
