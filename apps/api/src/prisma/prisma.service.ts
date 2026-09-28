import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { ITXClientDenyList } from '@prisma/client/runtime/client';
import type { Env } from '../config/env.js';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

// 비밀번호 해시가 실수로 응답에 섞이지 않도록 기본 조회에서 뺀다.
// 필요한 곳에서만 omit: { passwordHash: false }로 명시해서 꺼낸다.
const globalOmit = { user: { passwordHash: true } } as const;
type ClientOptions = Prisma.PrismaClientOptions & { omit: typeof globalOmit };

/**
 * 트랜잭션 안에서 쓰는 DB 클라이언트.
 * Prisma 기본 타입은 omit 설정이 빠져 있어서, PrismaService 기준으로 다시 정의한다.
 */
export type PrismaTx = Omit<
  PrismaService,
  ITXClientDenyList | 'onModuleInit' | 'onModuleDestroy' | 'transaction'
>;

@Injectable()
export class PrismaService
  extends PrismaClient<ClientOptions>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
      omit: globalOmit,
    });
  }

  // 앱 시작 시 실제로 쿼리를 보내 DB 연결을 확인 (실패하면 서버 시작 중단)
  async onModuleInit() {
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** 여러 작업을 하나로 묶는다. 중간에 에러가 나면 전부 취소(롤백)된다 */
  transaction<R>(fn: (tx: PrismaTx) => Promise<R>): Promise<R> {
    return this.$transaction((tx) => fn(tx as unknown as PrismaTx));
  }
}
