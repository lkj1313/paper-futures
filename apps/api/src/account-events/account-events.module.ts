import { Module } from '@nestjs/common';
import { AccountEventsService } from './account-events.service.js';

/** 계정 변경 신호 방송. api와 engine 양쪽에서 쓴다 */
@Module({
  providers: [AccountEventsService],
  exports: [AccountEventsService],
})
export class AccountEventsModule {}
