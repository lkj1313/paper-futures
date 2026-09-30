import { Injectable } from '@nestjs/common';
import { type Decimal, SIGNUP_BONUS_USDT } from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';
import {
  type CursorPageQueryDto,
  cursorPageArgs,
  toCursorPage,
} from '../common/cursor-page.js';
import { toDb } from '../common/db-decimal.js';
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

  /**
   * 지갑 행을 잠근다 (SELECT ... FOR UPDATE). 트랜잭션이 끝날 때까지 같은 사용자의
   * 다른 주문은 여기서 기다리므로, 잔고 확인과 변경 사이에 끼어들 수 없다.
   */
  async lockByUserId(tx: PrismaTx, userId: string) {
    const [wallet] = await tx.$queryRaw<
      { id: string; balance: Prisma.Decimal }[]
    >`
      SELECT "id", "balance" FROM "Wallet" WHERE "userId" = ${userId}::uuid FOR UPDATE
    `;
    if (!wallet) {
      throw new AppException('NOT_FOUND', {
        message: '지갑을 찾을 수 없습니다.',
      });
    }
    return wallet;
  }

  /**
   * 원장에 한 줄씩 기록하고 잔고를 바꾼다. 금액이 0인 줄은 건너뛴다.
   * 지갑은 같은 트랜잭션에서 lockByUserId로 먼저 잠가야 한다.
   * 증거금은 잔고에서 빼지 않고 "사용 중"으로만 세므로, 잔고는 이 함수로만 바뀐다.
   */
  async recordEntries(
    tx: PrismaTx,
    wallet: { id: string; balance: Decimal },
    entries: { type: LedgerEntryType; amount: Decimal }[],
    orderId?: string,
  ) {
    let balance = wallet.balance;
    for (const entry of entries) {
      if (entry.amount.isZero()) continue;
      balance = balance.add(entry.amount);
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: entry.type,
          amount: toDb(entry.amount),
          balanceAfter: toDb(balance),
          orderId,
        },
      });
    }
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: toDb(balance) },
    });
    return balance;
  }

  /** 열린 포지션들에 묶인 증거금 합계 */
  async getUsedMargin(userId: string, db: PrismaTx = this.prisma) {
    const { _sum } = await db.position.aggregate({
      where: { userId },
      _sum: { isolatedMargin: true },
    });
    return _sum.isolatedMargin ?? new Prisma.Decimal(0);
  }

  /** 지갑 잔고, 사용 중 증거금, 주문 가능 금액 */
  async getSummary(userId: string) {
    const wallet = await this.getByUserId(userId);
    const usedMargin = await this.getUsedMargin(userId);
    return {
      balance: wallet.balance,
      usedMargin,
      availableBalance: wallet.balance.sub(usedMargin),
    };
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

  /** 원장을 최신순으로 limit개씩 가져온다 */
  async listLedger(userId: string, query: CursorPageQueryDto) {
    const wallet = await this.getByUserId(userId);
    const page = cursorPageArgs(query);
    const rows = await this.prisma.ledgerEntry.findMany({
      ...page,
      where: { ...page.where, walletId: wallet.id },
    });
    return toCursorPage(rows, query.limit);
  }
}
