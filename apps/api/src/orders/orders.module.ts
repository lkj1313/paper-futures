import { Module } from '@nestjs/common';
import { AccountEventsModule } from '../account-events/account-events.module.js';
import { MarketModule } from '../market/market.module.js';
import { TradingModule } from '../trading/trading.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [MarketModule, WalletModule, TradingModule, AccountEventsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
