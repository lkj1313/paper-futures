import { Injectable, Logger } from '@nestjs/common';
import {
  isLiquidatable,
  isStale,
  type MarketSymbol,
  type MarkPriceInfo,
  toDecimal,
} from '@paper-futures/shared';
import { fromDb, toDb } from '../common/db-decimal.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WalletService } from '../wallet/wallet.service.js';

/** 청산 대상 조회 결과. 지갑을 잠그려면 사용자 id가 필요하다 */
export interface LiquidationTarget {
  id: string;
  userId: string;
}

@Injectable()
export class LiquidationService {
  private readonly logger = new Logger(LiquidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * 한 종목 점검: 마크가격 기준 청산 대상을 찾아 하나씩 청산한다. 청산한 개수를 돌려준다
   */
  async checkSymbol(
    symbol: MarketSymbol,
    mark: MarkPriceInfo,
    now = Date.now(),
  ) {
    // 오래된 가격으로는 청산하지 않는다 (시세가 끊긴 사이 가격이 돌아왔을 수 있다)
    if (isStale(mark.receivedAt, now)) return 0;

    const targets = await this.findTargets(symbol, mark.markPrice);
    let count = 0;
    for (const target of targets) {
      try {
        if (await this.liquidate(target, mark.markPrice)) count++;
      } catch (error) {
        // 한 건이 실패해도 나머지 대상은 계속 처리한다
        this.logger.error(
          `청산 실패: 포지션 ${target.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return count;
  }

  /**
   * 청산가에 닿은 포지션들. (symbol, side, liquidationPrice) 인덱스로 범위만 읽는다
   * - 롱: 청산가 ≥ 마크가격 (가격이 내려와서 닿음)
   * - 숏: 청산가 ≤ 마크가격 (가격이 올라가서 닿음)
   */
  findTargets(
    symbol: MarketSymbol,
    markPrice: string,
  ): Promise<LiquidationTarget[]> {
    return this.prisma.position.findMany({
      where: {
        symbol,
        OR: [
          { side: 'LONG', liquidationPrice: { gte: markPrice } },
          { side: 'SHORT', liquidationPrice: { lte: markPrice } },
        ],
      },
      select: { id: true, userId: true },
    });
  }

  /**
   * 포지션 하나를 마크가격으로 강제 청산한다. 격리 증거금을 전부 잃고, 이 종목의 대기 주문은 취소된다.
   * 청산했으면 true, 그 사이에 포지션이 닫혔거나 청산가가 바뀌어 조건이 안 맞으면 false
   */
  async liquidate(target: LiquidationTarget, markPrice: string) {
    return this.prisma.transaction(async (tx) => {
      // 1. 주문과 같은 지갑 잠금을 잡아서, 사용자 주문과 동시에 처리되지 않게 한다
      const wallet = await this.wallet.lockByUserId(tx, target.userId);

      // 2. 잠근 뒤 포지션을 다시 읽고 조건을 다시 확인한다
      //    (대상을 조회한 뒤 사용자가 먼저 닫거나 늘렸을 수 있다)
      const position = await tx.position.findUnique({
        where: { id: target.id },
      });
      if (
        !position ||
        !isLiquidatable(
          position.side,
          position.liquidationPrice.toString(),
          markPrice,
        )
      ) {
        return false;
      }

      // 3. 포지션을 닫고, 청산 주문과 원장을 남긴다
      const loss = fromDb(position.isolatedMargin).neg();
      await tx.position.delete({ where: { id: position.id } });
      // 이 종목의 대기 주문도 시스템 취소한다 (바이낸스도 청산할 때 대기 주문을 취소한다)
      await tx.order.updateMany({
        where: {
          userId: position.userId,
          symbol: position.symbol,
          status: 'NEW',
        },
        data: { status: 'EXPIRED' },
      });
      const order = await tx.order.create({
        data: {
          userId: position.userId,
          symbol: position.symbol,
          side: position.side === 'LONG' ? 'SELL' : 'BUY',
          type: 'LIQUIDATION',
          status: 'FILLED',
          qty: position.qty,
          leverage: position.leverage,
          reduceOnly: true,
          avgFillPrice: toDb(toDecimal(markPrice)),
          fee: '0',
          realizedPnl: toDb(loss),
        },
      });
      await this.wallet.recordEntries(
        tx,
        wallet,
        [{ type: 'LIQUIDATION', amount: loss }],
        order.id,
      );

      this.logger.warn(
        `청산: ${position.symbol} ${position.side} ${position.qty.toString()}개, 마크가격 ${markPrice}, 손실 ${toDb(loss)} USDT (사용자 ${position.userId})`,
      );
      return true;
    });
  }
}
