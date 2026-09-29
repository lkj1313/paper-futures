import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [MarketModule, WalletModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
