import { Injectable } from '@nestjs/common';
import { SIGNUP_BONUS_USDT } from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';
import { Prisma } from '../generated/prisma/client.js';
import { LedgerEntryType } from '../generated/prisma/enums.js';
import { PrismaService, type PrismaTx } from '../prisma/prisma.service.js';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 가입 보너스를 넣은 지갑과 첫 원장 기록을 만든다.
   * 회원가입 트랜잭션 안에서 호출되도록 db(트랜잭션 클라이언트)를 받는다.
   */
  createWithSignupBonus(userId: string, db: PrismaTx = this.prisma) {
    const bonus = new Prisma.Decimal(SIGNUP_BONUS_USDT);
    return db.wallet.create({
      data: {
        userId,
        balance: bonus,
        entries: {
          create: {
            type: LedgerEntryType.SIGNUP_BONUS,
            amount: bonus,
            balanceAfter: bonus,
          },
        },
      },
    });
  }

  async getByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new AppException('NOT_FOUND', {
        message: '지갑을 찾을 수 없습니다.',
      });
    }
    return wallet;
  }

  /** 원장을 최신순으로 limit개씩 가져온다. cursor는 이전 페이지의 마지막 기록 id */
  async listLedger(
    userId: string,
    { limit, cursor }: { limit: number; cursor?: string },
  ) {
    const wallet = await this.getByUserId(userId);

    // UUID v7은 생성 시간 순으로 커지므로 id만으로 최신순 정렬과 커서 비교가 된다
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id, ...(cursor && { id: { lt: cursor } }) },
      orderBy: { id: 'desc' },
      take: limit + 1, // 하나 더 가져와서 다음 페이지가 있는지 확인한다
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }
}
