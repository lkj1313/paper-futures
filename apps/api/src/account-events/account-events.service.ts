import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

/** 계정 변경 신호를 방송하는 채널 (앞에 DB 번호가 붙는다) */
export const ACCOUNT_CHANNEL = 'account';

/** 누구의 무엇이 바뀌었는지. 최신 상태는 받는 쪽이 DB에서 읽는다 */
export interface AccountSignal {
  userId: string;
  /** 바뀐 주문 (없으면 빈 배열: 펀딩처럼 포지션과 지갑만 바뀐 경우) */
  orderIds: string[];
}

/**
 * "이 사용자의 주문, 포지션, 지갑이 바뀌었다"는 신호를 Redis로 방송한다.
 * api(주문, 취소)와 engine(청산, 지정가 체결, 펀딩)이 트랜잭션을 커밋한 뒤에 부르고,
 * api의 실시간 연결이 받아서 그 사용자에게 최신 상태를 보낸다.
 */
@Injectable()
export class AccountEventsService {
  private readonly logger = new Logger(AccountEventsService.name);

  constructor(private readonly redis: RedisService) {}

  /** 알림이 실패해도 이미 끝난 거래를 되돌릴 수는 없으므로 로그만 남긴다 */
  async notify(userId: string, orderIds: string[] = []) {
    const signal: AccountSignal = { userId, orderIds };
    try {
      await this.redis.publish(
        this.redis.channel(ACCOUNT_CHANNEL),
        JSON.stringify(signal),
      );
    } catch (error) {
      this.logger.error(
        `계정 변경 신호 방송 실패: 사용자 ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
