import { Injectable, Logger } from '@nestjs/common';
import { marketKey } from '@paper-futures/shared';
import { RedisService } from '../redis/redis.service.js';
import { parseBinanceMessage } from './binance.parser.js';

/** Binance 메시지를 검증해서 Redis에 최신값으로 저장하고, 같은 이름의 채널로 방송한다 */
@Injectable()
export class MarketDataWriterService {
  private readonly logger = new Logger(MarketDataWriterService.name);

  constructor(private readonly redis: RedisService) {}

  async handleMessage(raw: string): Promise<boolean> {
    const event = parseBinanceMessage(raw);
    if (!event) {
      this.logger.warn(`처리할 수 없는 메시지: ${raw.slice(0, 200)}`);
      return false;
    }

    const key = marketKey(event.symbol, event.kind);
    const payload = JSON.stringify(event.data);
    // 저장과 방송을 한 번의 왕복으로 보낸다
    await this.redis.pipeline().set(key, payload).publish(key, payload).exec();
    return true;
  }
}
