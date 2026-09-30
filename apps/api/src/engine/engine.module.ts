import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.js';
import { MarketModule } from '../market/market.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { TradingModule } from '../trading/trading.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { LimitFillService } from './limit-fill.service.js';
import { LimitFillMonitorService } from './limit-fill-monitor.service.js';
import { LiquidationService } from './liquidation.service.js';
import { LiquidationMonitorService } from './liquidation-monitor.service.js';

/** engine 프로세스 전용 루트 모듈. HTTP 없이 시세를 보고 청산, 지정가 체결을 담당한다 */
@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    MarketModule,
    WalletModule,
    TradingModule,
  ],
  providers: [
    LiquidationService,
    LiquidationMonitorService,
    LimitFillService,
    LimitFillMonitorService,
  ],
})
export class EngineModule {}
