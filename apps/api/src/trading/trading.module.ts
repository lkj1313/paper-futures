import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module.js';
import { TradeService } from './trade.service.js';

/** 체결을 포지션과 잔고에 반영하는 공통 모듈 (api의 주문, engine의 지정가 체결이 함께 쓴다) */
@Module({
  imports: [WalletModule],
  providers: [TradeService],
  exports: [TradeService],
})
export class TradingModule {}
