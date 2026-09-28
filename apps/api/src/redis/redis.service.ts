import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.js';

/** ioredis 클라이언트. PrismaService처럼 앱 시작 시 연결을 확인하고 종료 시 닫는다 */
@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<Env, true>) {
    super(config.get('REDIS_URL', { infer: true }), {
      // 연결 실패 시 무한 재시도하며 멈춰 있지 않도록 시작 확인은 onModuleInit에서 한다
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleInit() {
    await this.connect();
    await this.ping();
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
