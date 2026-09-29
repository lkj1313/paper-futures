import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module.js';
import { PositionsController } from './positions.controller.js';
import { PositionsService } from './positions.service.js';

@Module({
  imports: [MarketModule],
  controllers: [PositionsController],
  providers: [PositionsService],
})
export class PositionsModule {}
