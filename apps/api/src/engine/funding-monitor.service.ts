import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  type MarketSymbol,
  type MarkPriceInfo,
  SYMBOLS,
} from '@paper-futures/shared';
import { MarketService } from '../market/market.service.js';
import { FundingService } from './funding.service.js';

/** 펀딩 시각이 지났는지 확인하는 주기 (마크가격이 1초마다 갱신된다) */
const CHECK_INTERVAL_MS = 1_000;

const errorDetail = (error: unknown) =>
  error instanceof Error ? error.stack : String(error);

/**
 * 펀딩 시각이 지났는지 1초마다 확인하고 정산을 부른다.
 * 저장된 마크가격의 다음 펀딩 시각(nextFundingTime)이 다음 회차로 넘어가면,
 * 넘어가기 직전에 본 펀딩비율과 마크가격으로 방금 지난 회차를 정산한다.
 * engine이 꺼져 있던 동안 지나간 회차는 건너뛴다 (그 순간 누가 어떤 포지션을 들고 있었는지 알 수 없으므로)
 */
@Injectable()
export class FundingMonitorService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(FundingMonitorService.name);
  private timer?: NodeJS.Timeout;
  private stopped = false;
  /** 종목별로 마지막에 본 마크가격 정보 */
  private readonly lastSeen = new Map<MarketSymbol, MarkPriceInfo>();
  /** 진행 중인 정산 (종료할 때 끝날 때까지 기다린다) */
  private readonly running = new Set<Promise<unknown>>();

  constructor(
    private readonly market: MarketService,
    private readonly funding: FundingService,
  ) {}

  async onApplicationBootstrap() {
    await this.poll();
    this.timer = setInterval(() => void this.poll(), CHECK_INTERVAL_MS);
  }

  async onModuleDestroy() {
    // Nest는 이 모듈을 DB 모듈보다 먼저 끄므로, 여기서 진행 중인 정산을 끝내고 넘긴다
    this.stopped = true;
    clearInterval(this.timer);
    await this.idle();
  }

  /** 저장된 최신 마크가격을 읽어서 종목마다 확인한다 */
  async poll() {
    try {
      const marks = await this.market.getMarkPrices();
      for (const symbol of SYMBOLS) {
        const mark = marks[symbol];
        if (mark) this.observe(symbol, mark);
      }
    } catch (error) {
      this.logger.error('펀딩 시각 확인 실패', errorDetail(error));
    }
  }

  /** 마크가격 하나를 본다. 다음 펀딩 시각이 넘어갔으면 직전 회차를 정산한다 */
  observe(symbol: MarketSymbol, mark: MarkPriceInfo) {
    if (this.stopped) return;
    const prev = this.lastSeen.get(symbol);
    this.lastSeen.set(symbol, mark);

    // 처음 보는 종목(시작 직후)이거나 아직 같은 회차면 할 일이 없다
    if (!prev || mark.nextFundingTime <= prev.nextFundingTime) return;
    // 이전 펀딩 시각이 실제로 지났을 때만 (데이터가 이상하게 바뀐 경우를 막는다)
    if (mark.time < prev.nextFundingTime) return;

    const job = this.funding
      .settle({
        symbol,
        fundingTime: prev.nextFundingTime,
        fundingRate: prev.fundingRate,
        markPrice: prev.markPrice,
      })
      .catch((error: unknown) =>
        this.logger.error(`${symbol} 펀딩비 정산 실패`, errorDetail(error)),
      )
      .finally(() => this.running.delete(job));
    this.running.add(job);
  }

  /** 진행 중인 정산이 모두 끝날 때까지 기다린다 */
  async idle() {
    await Promise.all(this.running);
  }
}
