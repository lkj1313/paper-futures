import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  MARKET_DATA_KINDS,
  type MarketDataKind,
  type MarketSymbol,
  type MarketTrade,
  type MarkPriceInfo,
  marketKey,
  type OrderBookDepth,
  SYMBOLS,
} from '@paper-futures/shared';
import type { Redis } from 'ioredis';
import { RedisService } from '../redis/redis.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

/** 체결과 호가를 모았다가 보내는 주기 */
const BATCH_INTERVAL_MS = 100;

/**
 * market-data가 방송하는 시세를 받아 웹 브라우저로 보낸다.
 * - 마크가격(1초마다)은 오는 대로 보낸다
 * - 체결(초당 수십 번)은 0.1초 동안 모아서 배열로, 호가(0.1초마다)는 0.1초 중 가장 최근 것만 보낸다
 */
@Injectable()
export class MarketRelayService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(MarketRelayService.name);
  /** 구독 중인 연결은 다른 명령을 못 쓰므로, 구독 전용 연결을 따로 둔다 */
  private subscriber?: Redis;
  private timer?: NodeJS.Timeout;
  /** 0.1초 동안 모인 체결 */
  private readonly trades = new Map<MarketSymbol, MarketTrade[]>();
  /** 0.1초 동안 온 호가 중 가장 최근 것 */
  private readonly depths = new Map<MarketSymbol, OrderBookDepth>();

  constructor(
    private readonly redis: RedisService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async onApplicationBootstrap() {
    // 채널 이름 → 종목과 종류 (예: 0:market:BTCUSDT:trade → BTCUSDT, trade)
    const channels = new Map(
      SYMBOLS.flatMap((symbol) =>
        MARKET_DATA_KINDS.map(
          (kind) =>
            [
              this.redis.channel(marketKey(symbol, kind)),
              { symbol, kind },
            ] as const,
        ),
      ),
    );

    this.subscriber = this.redis.duplicate();
    this.subscriber.on('message', (channel: string, message: string) => {
      const target = channels.get(channel);
      if (!target) return;
      try {
        this.receive(target.symbol, target.kind, message);
      } catch (error) {
        this.logger.error(
          `시세 메시지 처리 실패: ${channel}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    });
    await this.subscriber.connect();
    await this.subscriber.subscribe(...channels.keys());

    this.timer = setInterval(() => this.flush(), BATCH_INTERVAL_MS);
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.subscriber?.quit();
  }

  /** 방송 하나를 받는다. 마크가격은 바로 보내고, 체결과 호가는 모아 둔다 */
  receive(symbol: MarketSymbol, kind: MarketDataKind, message: string) {
    switch (kind) {
      case 'mark':
        this.gateway.sendMark({
          ...(JSON.parse(message) as MarkPriceInfo),
          symbol,
        });
        return;
      case 'trade': {
        const trades = this.trades.get(symbol) ?? [];
        trades.push(JSON.parse(message) as MarketTrade);
        this.trades.set(symbol, trades);
        return;
      }
      case 'depth':
        this.depths.set(symbol, JSON.parse(message) as OrderBookDepth);
        return;
    }
  }

  /** 모아 둔 체결과 호가를 보내고 비운다 */
  flush() {
    for (const [symbol, trades] of this.trades) {
      this.gateway.sendTrades({ symbol, trades });
    }
    this.trades.clear();
    for (const [symbol, depth] of this.depths) {
      this.gateway.sendDepth({ ...depth, symbol });
    }
    this.depths.clear();
  }
}
