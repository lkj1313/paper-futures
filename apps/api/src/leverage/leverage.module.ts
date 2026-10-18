import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module.js';
import { LeverageController } from './leverage.controller.js';
import { LeverageService } from './leverage.service.js';

@Module({
  imports: [WalletModule],
  controllers: [LeverageController],
  providers: [LeverageService],
  exports: [LeverageService],
})
export class LeverageModule {}
