import { Module } from '@nestjs/common';
import { BinanceRestClient } from './binance-rest.client.js';
import { MarketController } from './market.controller.js';
import { MarketService } from './market.service.js';

@Module({
  controllers: [MarketController],
  providers: [MarketService, BinanceRestClient],
  exports: [MarketService],
})
export class MarketModule {}
