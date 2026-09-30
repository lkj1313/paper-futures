import { Injectable, Logger } from '@nestjs/common';
import {
  Decimal,
  fundingPayment,
  MARKET_SPECS,
  type MarketSymbol,
  toDecimal,
} from '@paper-futures/shared';
import { toDb } from '../common/db-decimal.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  toPositionData,
  toPositionState,
} from '../trading/position-changes.js';
import { WalletService } from '../wallet/wallet.service.js';

/** 정산할 펀딩 회차 */
export interface FundingRoundInput {
  symbol: MarketSymbol;
  /** 펀딩 시각 (ms) */
  fundingTime: number;
  fundingRate: string;
  markPrice: string;
}

@Injectable()
export class FundingService {
  private readonly logger = new Logger(FundingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * 한 종목의 펀딩 회차를 정산한다. 그 종목의 모든 포지션이 펀딩비를 주고받는다.
   * - 격리 마진이라 포지션 증거금에서 빼고 넣는다 (잔고도 같은 금액만큼 바뀐다). 증거금이 줄면 청산가가 가까워진다
   * - 낼 금액이 증거금보다 크면 증거금까지만 뺀다 (증거금이 0이 되면 청산 감시가 청산한다)
   * - 회차 기록과 모든 정산을 트랜잭션 하나로 처리하고, 같은 회차는 두 번 정산하지 않는다
   * 정산한 포지션 수를 돌려주고, 이미 정산된 회차면 null
   */
  async settle(input: FundingRoundInput): Promise<number | null> {
    const { symbol, fundingRate, markPrice } = input;
    const fundingTime = new Date(input.fundingTime);

    const settled = await this.prisma.transaction(async (tx) => {
      // 1. 회차 기록. (종목, 펀딩 시각)이 이미 있으면 정산된 회차라 아무것도 하지 않는다
      const [round] = await tx.fundingRound.createManyAndReturn({
        data: [{ symbol, fundingTime, fundingRate, markPrice }],
        skipDuplicates: true,
      });
      if (!round) return null;

      // 2. 이 종목에 포지션이 있는 사용자. 여러 지갑을 잠그므로 사용자 id 순서로 잠가 교착을 피한다
      const holders = await tx.position.findMany({
        where: { symbol },
        select: { userId: true },
        orderBy: { userId: 'asc' },
      });

      let count = 0;
      for (const { userId } of holders) {
        const wallet = await this.wallet.lockByUserId(tx, userId);
        // 잠근 뒤 다시 읽는다 (그 사이 주문으로 바뀌었을 수 있다)
        const position = await tx.position.findUnique({
          where: { userId_symbol: { userId, symbol } },
        });
        if (!position) continue;

        const state = toPositionState(position);
        const payment = toDecimal(
          toDb(fundingPayment(state.side, state.qty, markPrice, fundingRate)),
        );
        // 내는 금액은 증거금까지만
        const amount = Decimal.max(payment, state.isolatedMargin.neg());
        if (amount.isZero()) continue;

        await tx.position.update({
          where: { id: position.id },
          data: toPositionData(
            { ...state, isolatedMargin: state.isolatedMargin.add(amount) },
            MARKET_SPECS[symbol],
          ),
        });
        await this.wallet.recordEntries(
          tx,
          wallet,
          [{ type: 'FUNDING_FEE', amount }],
          { fundingRoundId: round.id },
        );
        count++;
      }
      return count;
    });

    if (settled !== null) {
      this.logger.log(
        `펀딩비 정산: ${symbol} ${fundingTime.toISOString()}, 비율 ${fundingRate}, 마크가격 ${markPrice}, 포지션 ${settled}개`,
      );
    }
    return settled;
  }
}
