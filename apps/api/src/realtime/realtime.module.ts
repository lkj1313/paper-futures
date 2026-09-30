import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MarketModule } from '../market/market.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AccountRelayService } from './account-relay.service.js';
import { MarketRelayService } from './market-relay.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

/** 웹 브라우저로 실시간 데이터를 보내는 모듈 (api 프로세스에서만 쓴다) */
@Module({
  imports: [AuthModule, MarketModule, WalletModule],
  providers: [RealtimeGateway, MarketRelayService, AccountRelayService],
})
export class RealtimeModule {}
