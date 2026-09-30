import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  type MarketSymbol,
  type MarkPriceInfo,
  marketKey,
  SYMBOLS,
} from '@paper-futures/shared';
import type { Redis } from 'ioredis';
import { MarketService } from '../market/market.service.js';
import { RedisService } from '../redis/redis.service.js';
import { LiquidationService } from './liquidation.service.js';

/** 방송을 놓쳤을 때를 대비한 점검 주기 */
const SWEEP_INTERVAL_MS = 5_000;

const errorDetail = (error: unknown) =>
  error instanceof Error ? error.stack : String(error);

/**
 * 마크가격을 지켜보다가 청산 점검을 부른다.
 * - 마크가격 방송을 구독해서 올 때마다 (종목마다 1초에 한 번) 점검한다
 * - 방송은 놓치면 사라지므로, 시작할 때 한 번 그리고 5초마다 Redis에 저장된 최신 마크가격으로도 점검한다
 */
@Injectable()
export class RiskMonitorService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RiskMonitorService.name);
  /** 구독 중인 연결은 다른 명령을 못 쓰므로, 구독 전용 연결을 따로 둔다 */
  private subscriber?: Redis;
  private sweepTimer?: NodeJS.Timeout;
  private stopped = false;
  /** 지금 점검 중인 종목과 그 작업 (종료할 때 끝날 때까지 기다린다) */
  private readonly running = new Map<MarketSymbol, Promise<void>>();
  /** 점검 중에 들어온 마지막 마크가격. 점검이 끝나면 이어서 한 번 더 점검한다 */
  private readonly pending = new Map<MarketSymbol, MarkPriceInfo>();

  constructor(
    private readonly redis: RedisService,
    private readonly market: MarketService,
    private readonly liquidation: LiquidationService,
  ) {}

  async onApplicationBootstrap() {
    // 채널 이름 → 종목 (예: 0:market:BTCUSDT:mark → BTCUSDT)
    const channels = new Map(
      SYMBOLS.map((s) => [this.redis.channel(marketKey(s, 'mark')), s]),
    );

    this.subscriber = this.redis.duplicate();
    this.subscriber.on('message', (channel: string, message: string) => {
      const symbol = channels.get(channel);
      if (!symbol) return;
      try {
        this.schedule(symbol, JSON.parse(message) as MarkPriceInfo);
      } catch (error) {
        this.logger.error(
          `마크가격 메시지 처리 실패: ${channel}`,
          errorDetail(error),
        );
      }
    });
    await this.subscriber.connect();
    await this.subscriber.subscribe(...channels.keys());
    this.logger.log(`마크가격 구독: ${[...channels.keys()].join(', ')}`);

    // 꺼져 있던 동안 놓친 청산을 처리하고, 이후 5초마다 반복한다
    await this.sweep();
    this.sweepTimer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
  }

  async onModuleDestroy() {
    // Nest는 이 모듈을 DB, Redis 모듈보다 먼저 끄므로, 여기서 진행 중인 점검을 끝내고 넘긴다
    this.stopped = true;
    clearInterval(this.sweepTimer);
    await this.subscriber?.quit();
    this.pending.clear();
    await this.idle();
  }

  /** Redis에 저장된 최신 마크가격으로 모든 종목을 점검한다 */
  async sweep() {
    try {
      const marks = await this.market.getMarkPrices();
      for (const symbol of SYMBOLS) {
        const mark = marks[symbol];
        if (mark) this.schedule(symbol, mark);
      }
    } catch (error) {
      this.logger.error('저장된 마크가격 점검 실패', errorDetail(error));
    }
  }

  /**
   * 종목마다 점검은 한 번에 하나만 돈다.
   * 점검 중에 온 가격은 버리지 않고 마지막 것만 기억했다가, 끝나자마자 그 가격으로 이어서 점검한다.
   */
  schedule(symbol: MarketSymbol, mark: MarkPriceInfo) {
    if (this.stopped) return;
    if (this.running.has(symbol)) {
      this.pending.set(symbol, mark);
      return;
    }
    const job = this.run(symbol, mark).finally(() =>
      this.running.delete(symbol),
    );
    this.running.set(symbol, job);
  }

  /** 진행 중인 점검이 모두 끝날 때까지 기다린다 */
  async idle() {
    await Promise.all(this.running.values());
  }

  private async run(symbol: MarketSymbol, first: MarkPriceInfo) {
    let mark: MarkPriceInfo | undefined = first;
    while (mark) {
      try {
        await this.liquidation.checkSymbol(symbol, mark);
      } catch (error) {
        this.logger.error(`${symbol} 점검 실패`, errorDetail(error));
      }
      // 점검하는 동안 새 가격이 왔으면 그 가격으로 한 번 더
      mark = this.pending.get(symbol);
      this.pending.delete(symbol);
    }
  }
}
