import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { BinanceFeedService } from './binance-feed.service.js';
import { MarketDataWriterService } from './market-data-writer.service.js';

/** market-data 프로세스 전용 루트 모듈. HTTP 없이 Binance → Redis만 담당한다 */
@Module({
  imports: [AppConfigModule, RedisModule],
  providers: [MarketDataWriterService, BinanceFeedService],
})
export class MarketDataModule {}
