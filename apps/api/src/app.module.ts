import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { RequestLoggerMiddleware } from './common/request-logger.middleware.js';
import { AppConfigModule } from './config/app-config.module.js';
import { HealthModule } from './health/health.module.js';
import { MarketModule } from './market/market.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PositionsModule } from './positions/positions.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { RedisModule } from './redis/redis.module.js';
import { WalletModule } from './wallet/wallet.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    WalletModule,
    MarketModule,
    OrdersModule,
    PositionsModule,
    RealtimeModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*path}');
  }
}
