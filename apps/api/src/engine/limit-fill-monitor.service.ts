import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  type Decimal,
  isStale,
  type MarketSymbol,
  type MarketTrade,
  marketKey,
  SYMBOLS,
  toDecimal,
} from '@paper-futures/shared';
import type { Redis } from 'ioredis';
import { MarketService } from '../market/market.service.js';
import { RedisService } from '../redis/redis.service.js';
import { LimitFillService } from './limit-fill.service.js';

/** 체결가를 모았다가 점검하는 주기. 체결가는 초당 수십 번 오므로 그때마다 DB를 조회하지 않는다 */
const BATCH_INTERVAL_MS = 100;
/** 방송을 놓쳤을 때를 대비한 점검 주기 */
const SWEEP_INTERVAL_MS = 5_000;

const errorDetail = (error: unknown) =>
  error instanceof Error ? error.stack : String(error);

/** 아직 점검하지 않은 체결가의 최저, 최고와 그 체결을 받은 시각 */
interface PendingRange {
  low: Decimal;
  lowAt: number;
  high: Decimal;
  highAt: number;
}

/**
 * 실제 체결가를 지켜보다가 지정가 체결 점검을 부른다.
 * - 체결가 방송이 오면 메모리에 종목별 최저, 최고만 갱신한다 (DB는 안 간다)
 * - 0.1초마다 모인 범위로 점검한다. 종목마다 점검은 한 번에 하나만 돌고, 그동안 온 가격은 계속 모인다
 * - 방송은 놓치면 사라지므로, 시작할 때 한 번 그리고 5초마다 Redis에 저장된 최신 체결가도 모은다
 */
@Injectable()
export class LimitFillMonitorService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(LimitFillMonitorService.name);
  /** 구독 중인 연결은 다른 명령을 못 쓰므로, 구독 전용 연결을 따로 둔다 */
  private subscriber?: Redis;
  private batchTimer?: NodeJS.Timeout;
  private sweepTimer?: NodeJS.Timeout;
  private stopped = false;
  /** 종목별로 아직 점검하지 않은 체결가 범위 */
  private readonly pending = new Map<MarketSymbol, PendingRange>();
  /** 지금 점검 중인 종목과 그 작업 (종료할 때 끝날 때까지 기다린다) */
  private readonly running = new Map<MarketSymbol, Promise<void>>();

  constructor(
    private readonly redis: RedisService,
    private readonly market: MarketService,
    private readonly limitFill: LimitFillService,
  ) {}

  async onApplicationBootstrap() {
    // 채널 이름 → 종목 (예: 0:market:BTCUSDT:trade → BTCUSDT)
    const channels = new Map(
      SYMBOLS.map((s) => [this.redis.channel(marketKey(s, 'trade')), s]),
    );

    this.subscriber = this.redis.duplicate();
    this.subscriber.on('message', (channel: string, message: string) => {
      const symbol = channels.get(channel);
      if (!symbol) return;
      try {
        const trade = JSON.parse(message) as MarketTrade;
        this.record(symbol, trade.price, trade.receivedAt);
      } catch (error) {
        this.logger.error(
          `체결 메시지 처리 실패: ${channel}`,
          errorDetail(error),
        );
      }
    });
    await this.subscriber.connect();
    await this.subscriber.subscribe(...channels.keys());
    this.logger.log(`체결가 구독: ${[...channels.keys()].join(', ')}`);

    await this.sweep();
    this.batchTimer = setInterval(() => this.flush(), BATCH_INTERVAL_MS);
    this.sweepTimer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
  }

  async onModuleDestroy() {
    // Nest는 이 모듈을 DB, Redis 모듈보다 먼저 끄므로, 여기서 진행 중인 점검을 끝내고 넘긴다
    this.stopped = true;
    clearInterval(this.batchTimer);
    clearInterval(this.sweepTimer);
    await this.subscriber?.quit();
    this.pending.clear();
    await this.idle();
  }

  /** 체결가 하나를 모은다. 종목별로 최저, 최고만 남긴다 */
  record(symbol: MarketSymbol, price: string, at: number) {
    if (this.stopped) return;
    const p = toDecimal(price);
    const range = this.pending.get(symbol);
    if (!range) {
      this.pending.set(symbol, { low: p, lowAt: at, high: p, highAt: at });
      return;
    }
    // 같은 가격이 다시 오면 더 늦은 시각을 남긴다 (그 사이에 넣은 주문도 체결될 수 있게)
    if (p.lt(range.low) || (p.eq(range.low) && at > range.lowAt)) {
      range.low = p;
      range.lowAt = at;
    }
    if (p.gt(range.high) || (p.eq(range.high) && at > range.highAt)) {
      range.high = p;
      range.highAt = at;
    }
  }

  /** 모인 범위로 종목마다 점검을 시작한다. 점검 중인 종목은 건너뛰고, 그 종목의 가격은 계속 모인다 */
  flush() {
    for (const [symbol, range] of this.pending) {
      if (this.running.has(symbol)) continue;
      this.pending.delete(symbol);
      const job = this.check(symbol, range).finally(() =>
        this.running.delete(symbol),
      );
      this.running.set(symbol, job);
    }
  }

  /** Redis에 저장된 가장 최근 체결가를 모은다 (방송을 놓쳤을 때 대비). 오래된 체결은 쓰지 않는다 */
  async sweep() {
    try {
      const trades = await this.market.getLastTrades();
      for (const symbol of SYMBOLS) {
        const trade = trades[symbol];
        if (trade && !isStale(trade.receivedAt)) {
          this.record(symbol, trade.price, trade.receivedAt);
        }
      }
    } catch (error) {
      this.logger.error('저장된 체결가 점검 실패', errorDetail(error));
    }
  }

  /** 진행 중인 점검이 모두 끝날 때까지 기다린다 */
  async idle() {
    await Promise.all(this.running.values());
  }

  private async check(symbol: MarketSymbol, range: PendingRange) {
    try {
      await this.limitFill.checkSymbol(symbol, {
        low: range.low.toFixed(),
        lowAt: range.lowAt,
        high: range.high.toFixed(),
        highAt: range.highAt,
      });
    } catch (error) {
      this.logger.error(`${symbol} 지정가 점검 실패`, errorDetail(error));
    }
  }
}
