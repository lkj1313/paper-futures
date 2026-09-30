import { Injectable, Logger } from '@nestjs/common';
import { FEE_RATES, type MarketSymbol } from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';
import { fromDb, toDb } from '../common/db-decimal.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TradeService } from '../trading/trade.service.js';
import { WalletService } from '../wallet/wallet.service.js';

/** 체결 대상 조회 결과. 지갑을 잠그려면 사용자 id가 필요하다 */
export interface LimitFillTarget {
  id: string;
  userId: string;
}

/**
 * 점검 사이에 들어온 체결가의 최저, 최고와 그 체결을 받은 시각.
 * 주문을 넣기 전에 일어난 거래로는 체결하지 않으려고 시각도 같이 둔다.
 */
export interface TradeRange {
  low: string;
  lowAt: number;
  high: string;
  highAt: number;
}

@Injectable()
export class LimitFillService {
  private readonly logger = new Logger(LimitFillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly trade: TradeService,
  ) {}

  /** 한 종목 점검: 체결가 범위에 닿은 대기 주문을 먼저 들어온 순서대로 체결한다. 체결한 개수를 돌려준다 */
  async checkSymbol(symbol: MarketSymbol, range: TradeRange) {
    const targets = await this.findTargets(symbol, range);
    let count = 0;
    for (const target of targets) {
      try {
        if (await this.fill(target)) count++;
      } catch (error) {
        // 한 건이 실패해도 나머지 주문은 계속 처리한다 (실패한 주문은 대기로 남아 다음 점검에서 다시 시도)
        this.logger.error(
          `지정가 체결 실패: 주문 ${target.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return count;
  }

  /**
   * 지정가에 닿은 대기 주문들. (symbol, status, side, price) 인덱스로 범위만 읽는다
   * - 매수: 지정가 ≥ 최저가 (그 사이 한 번이라도 지정가 이하로 거래됨)
   * - 매도: 지정가 ≤ 최고가 (그 사이 한 번이라도 지정가 이상으로 거래됨)
   * 그 거래보다 나중에 넣은 주문은 빼고, id(생성 순서)가 빠른 주문부터 돌려준다
   */
  findTargets(
    symbol: MarketSymbol,
    range: TradeRange,
  ): Promise<LimitFillTarget[]> {
    return this.prisma.order.findMany({
      where: {
        symbol,
        status: 'NEW',
        OR: [
          {
            side: 'BUY',
            price: { gte: range.low },
            createdAt: { lte: new Date(range.lowAt) },
          },
          {
            side: 'SELL',
            price: { lte: range.high },
            createdAt: { lte: new Date(range.highAt) },
          },
        ],
      },
      select: { id: true, userId: true },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * 대기 주문 하나를 지정가로 체결한다 (메이커 수수료).
   * - 체결했으면 true, 그 사이 취소되거나 체결됐으면 false
   * - 지금 포지션이나 잔고로는 체결할 수 없으면 (reduceOnly인데 포지션이 닫힘, 금액 부족 등)
   *   시스템 취소(EXPIRED)하고 false
   */
  async fill(target: LimitFillTarget): Promise<boolean> {
    try {
      return await this.prisma.transaction(async (tx) => {
        // 1. 주문, 취소와 같은 지갑 잠금을 잡는다
        const wallet = await this.wallet.lockByUserId(tx, target.userId);

        // 2. 잠근 뒤 다시 읽는다 (그 사이 취소됐을 수 있다)
        const order = await tx.order.findUnique({ where: { id: target.id } });
        if (!order || order.status !== 'NEW' || !order.price) return false;

        // 3. 지정가로 체결을 반영하고, 주문을 FILLED로 바꾸고, 원장을 남긴다
        const qty = fromDb(order.qty);
        const applied = await this.trade.applyFill(tx, wallet, {
          userId: order.userId,
          symbol: order.symbol as MarketSymbol,
          side: order.side,
          qty,
          notional: fromDb(order.price).mul(qty),
          reduceOnly: order.reduceOnly,
          leverage: order.leverage,
          feeRate: FEE_RATES.maker,
          openOrderId: order.id,
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'FILLED',
            avgFillPrice: order.price,
            leverage: applied.leverage,
            fee: toDb(applied.fee),
            realizedPnl: toDb(applied.realizedPnl),
          },
        });
        await this.trade.recordFill(tx, wallet, applied, order.id);

        this.logger.log(
          `지정가 체결: ${order.symbol} ${order.side} ${order.qty.toString()}개 @ ${order.price.toString()} (주문 ${order.id})`,
        );
        return true;
      });
    } catch (error) {
      // 주문 조건 때문에 체결할 수 없는 경우만 취소한다. DB 오류 등은 다음 점검에서 다시 시도
      if (!(error instanceof AppException)) throw error;
      await this.expire(target, error);
      return false;
    }
  }

  private async expire(target: LimitFillTarget, reason: AppException) {
    // 아직 대기 중일 때만 바꾼다 (그 사이 사용자가 취소했으면 그대로 둔다)
    const { count } = await this.prisma.order.updateMany({
      where: { id: target.id, status: 'NEW' },
      data: { status: 'EXPIRED' },
    });
    if (count > 0) {
      this.logger.warn(
        `지정가 주문 시스템 취소: 주문 ${target.id} (${reason.code}: ${reason.message})`,
      );
    }
  }
}
