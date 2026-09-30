import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module.js';
import { MarketRelayService } from './market-relay.service.js';
import { MarketGateway } from './market.gateway.js';

/** 웹 브라우저로 실시간 데이터를 보내는 모듈 (api 프로세스에서만 쓴다) */
@Module({
  imports: [MarketModule],
  providers: [MarketGateway, MarketRelayService],
})
export class RealtimeModule {}
