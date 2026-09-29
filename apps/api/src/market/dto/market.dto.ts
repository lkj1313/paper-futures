import { ApiProperty } from '@nestjs/swagger';
import {
  type MarketSymbol,
  type PriceLevel,
  SYMBOLS,
} from '@paper-futures/shared';

/** 종목 요약. 시세를 아직 받지 못한 값은 null */
export class MarketSummaryDto {
  @ApiProperty({ enum: SYMBOLS })
  symbol: MarketSymbol;

  @ApiProperty({ type: String, nullable: true, description: '최근 체결가' })
  lastPrice: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '마크가격 (청산, 손익 기준)',
  })
  markPrice: string | null;

  @ApiProperty({ type: String, nullable: true, description: '인덱스가격' })
  indexPrice: string | null;

  @ApiProperty({ type: String, nullable: true, description: '현재 펀딩비율' })
  fundingRate: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: '다음 펀딩 시각 (ms)',
  })
  nextFundingTime: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: '마크가격 기준 시각 (ms)',
  })
  updatedAt: number | null;

  /** 마크가격을 받은 지 5초가 지났거나 받은 적이 없으면 true */
  stale: boolean;
}

const priceLevels = {
  type: 'array',
  items: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 },
  example: [['83105.30', '18.833']],
  description: '[가격, 수량] 목록',
} as const;

export class OrderBookDto {
  @ApiProperty({ enum: SYMBOLS })
  symbol: MarketSymbol;

  @ApiProperty(priceLevels)
  bids: PriceLevel[];

  @ApiProperty(priceLevels)
  asks: PriceLevel[];

  /** 호가 기준 시각 (ms) */
  updatedAt: number;

  /** 호가를 받은 지 5초가 지났으면 true */
  stale: boolean;
}
