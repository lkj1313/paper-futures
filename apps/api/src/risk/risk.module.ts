import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.js';
import { MarketModule } from '../market/market.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { LiquidationService } from './liquidation.service.js';
import { RiskMonitorService } from './risk-monitor.service.js';

/** risk 프로세스 전용 루트 모듈. HTTP 없이 마크가격을 보고 청산만 담당한다 */
@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    MarketModule,
    WalletModule,
  ],
  providers: [LiquidationService, RiskMonitorService],
})
export class RiskModule {}
