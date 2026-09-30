import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import {
  ACCOUNT_CHANNEL,
  type AccountSignal,
} from '../account-events/account-events.service.js';
import { OrderDto, PositionDto } from '../orders/dto/order-response.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { WalletResponseDto } from '../wallet/dto/wallet-response.dto.js';
import { WalletService } from '../wallet/wallet.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

/**
 * api와 engine이 방송한 계정 변경 신호를 받아서, 그 사용자에게 최신 주문, 포지션, 지갑을 보낸다.
 * 신호에는 누가 바뀌었는지만 있고, 최신 상태는 여기서 DB를 읽어서 만든다.
 */
@Injectable()
export class AccountRelayService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AccountRelayService.name);
  /** 구독 중인 연결은 다른 명령을 못 쓰므로, 구독 전용 연결을 따로 둔다 */
  private subscriber?: Redis;
  /**
   * 사용자별로 처리 중인 작업. 같은 사용자의 신호는 한 줄로 세워서 순서대로 보낸다
   * (먼저 온 신호의 느린 조회가 나중 결과를 덮어쓰지 않게)
   */
  private readonly queues = new Map<string, Promise<void>>();

  constructor(
    private readonly redis: RedisService,
    private readonly gateway: RealtimeGateway,
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async onApplicationBootstrap() {
    this.subscriber = this.redis.duplicate();
    this.subscriber.on('message', (_channel: string, message: string) => {
      try {
        this.enqueue(JSON.parse(message) as AccountSignal);
      } catch (error) {
        this.logger.error(
          '계정 변경 신호 처리 실패',
          error instanceof Error ? error.stack : String(error),
        );
      }
    });
    await this.subscriber.connect();
    await this.subscriber.subscribe(this.redis.channel(ACCOUNT_CHANNEL));
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
    await Promise.all(this.queues.values());
  }

  /** 같은 사용자의 앞 작업이 끝난 뒤에 이어서 처리한다 */
  enqueue(signal: AccountSignal) {
    const previous = this.queues.get(signal.userId) ?? Promise.resolve();
    const job = previous
      .then(() => this.push(signal))
      .catch((error: unknown) =>
        this.logger.error(
          `계정 변경 전달 실패: 사용자 ${signal.userId}`,
          error instanceof Error ? error.stack : String(error),
        ),
      )
      .finally(() => {
        // 뒤에 이어진 작업이 없으면 정리한다
        if (this.queues.get(signal.userId) === job) {
          this.queues.delete(signal.userId);
        }
      });
    this.queues.set(signal.userId, job);
  }

  /** 연결돼 있는 사용자면 최신 상태를 읽어서 보낸다 */
  private async push({ userId, orderIds }: AccountSignal) {
    if (!this.gateway.isOnline(userId)) return;

    const orders =
      orderIds.length > 0
        ? await this.prisma.order.findMany({
            where: { id: { in: orderIds }, userId },
            orderBy: { id: 'asc' },
          })
        : [];
    const positions = await this.prisma.position.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    const wallet = await this.wallet.getSummary(userId);

    this.gateway.sendAccount(userId, {
      orders: orders.map((order) => OrderDto.from(order)),
      positions: positions.map((position) => PositionDto.from(position)),
      wallet: WalletResponseDto.from(wallet),
    });
  }
}
