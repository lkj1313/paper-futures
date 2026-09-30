import { ApiProperty } from '@nestjs/swagger';
import { type MarketSymbol, OrderSide, SYMBOLS } from '@paper-futures/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/** 사용자가 낼 수 있는 주문 유형 (청산은 시스템만) */
export const PLACEABLE_ORDER_TYPES = ['MARKET', 'LIMIT'] as const;
export type PlaceableOrderType = (typeof PLACEABLE_ORDER_TYPES)[number];

export class PlaceOrderDto {
  @ApiProperty({ enum: SYMBOLS, example: 'BTCUSDT' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(SYMBOLS, { message: '지원하지 않는 종목입니다.' })
  symbol: MarketSymbol;

  @ApiProperty({ enum: Object.values(OrderSide), example: 'BUY' })
  @IsIn(Object.values(OrderSide), {
    message: 'side는 BUY 또는 SELL이어야 합니다.',
  })
  side: OrderSide;

  @ApiProperty({ enum: PLACEABLE_ORDER_TYPES, example: 'MARKET' })
  @IsIn(PLACEABLE_ORDER_TYPES, {
    message: 'type은 MARKET 또는 LIMIT이어야 합니다.',
  })
  type: PlaceableOrderType;

  /** 수량 (문자열). 종목의 수량 단위(BTC, ETH 0.001)에 맞아야 한다 */
  @ApiProperty({ example: '0.1' })
  @Matches(/^\d+(\.\d+)?$/, { message: '수량은 숫자 문자열이어야 합니다.' })
  qty: string;

  /** 지정가 (문자열). LIMIT일 때 필수이고 종목의 호가 단위(BTC 0.1, ETH 0.01)에 맞아야 한다. MARKET이면 무시한다 */
  @ApiProperty({ required: false, example: '80000' })
  @ValidateIf((o: PlaceOrderDto) => o.type === 'LIMIT')
  @Matches(/^\d+(\.\d+)?$/, {
    message: '지정가 주문은 price(숫자 문자열)가 필요합니다.',
  })
  price?: string;

  /** 새 포지션을 열 때의 레버리지. 이미 포지션이 있으면 그 포지션의 레버리지를 쓴다 */
  @IsOptional()
  @IsInt({ message: '레버리지는 정수여야 합니다.' })
  @Min(1, { message: '레버리지는 1 이상이어야 합니다.' })
  @Max(125, { message: '레버리지는 125 이하여야 합니다.' })
  leverage: number = 10;

  /**
   * 포지션을 줄이기만 하는 주문. 줄일 반대 방향 포지션이 없거나
   * 수량이 포지션보다 크면 거부된다 (포지션이 새로 열리거나 늘어나는 것을 막는다)
   */
  @IsOptional()
  @IsBoolean({ message: 'reduceOnly는 true 또는 false여야 합니다.' })
  reduceOnly: boolean = false;
}
