import { Injectable } from '@nestjs/common';
import type { MarketSymbol } from '@paper-futures/shared';
import { MarketService } from '../market/market.service.js';
import { PositionDto } from '../orders/dto/order-response.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PositionViewDto } from './dto/position-view.dto.js';
import { toPositionLiveValues } from './position-view.js';

@Injectable()
export class PositionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
  ) {}

  /** 내 열린 포지션들을 마크가격 기준 손익과 함께 돌려준다 */
  async list(userId: string, now = Date.now()): Promise<PositionViewDto[]> {
    const [positions, marks] = await Promise.all([
      this.prisma.position.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      this.market.getMarkPrices(),
    ]);

    // 저장된 포지션 정보 + 마크가격 기준으로 계산한 값
    return positions.map((position) =>
      Object.assign(
        PositionDto.from(position),
        toPositionLiveValues(
          position,
          marks[position.symbol as MarketSymbol],
          now,
        ),
      ),
    );
  }
}
