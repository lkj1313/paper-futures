import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { BinanceStream } from './binance-stream.js';
import { buildStreamUrl } from './binance.parser.js';
import { MarketDataWriterService } from './market-data-writer.service.js';

/**
 * 앱이 켜지면 Binance에 연결해서 시세를 받기 시작한다.
 * 경로에 따라 받을 수 있는 스트림이 달라서 /public, /market 두 연결을 연다.
 */
@Injectable()
export class BinanceFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BinanceFeedService.name);
  private readonly streams: BinanceStream[];

  constructor(
    private readonly writer: MarketDataWriterService,
    config: ConfigService<Env, true>,
  ) {
    const baseUrl = config.get('BINANCE_FUTURES_WS_URL', { infer: true });
    this.streams = (['public', 'market'] as const).map(
      (route) =>
        new BinanceStream({
          name: route,
          url: buildStreamUrl(baseUrl, route),
          logger: this.logger,
          onMessage: (raw) => {
            this.writer.handleMessage(raw).catch((error: unknown) => {
              this.logger.error(`Redis 저장 실패: ${String(error)}`);
            });
          },
        }),
    );
  }

  onModuleInit() {
    for (const stream of this.streams) stream.start();
  }

  onModuleDestroy() {
    for (const stream of this.streams) stream.stop();
  }
}
