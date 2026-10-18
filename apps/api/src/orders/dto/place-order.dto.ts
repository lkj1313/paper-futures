import { ApiProperty } from '@nestjs/swagger';
import {
  type MarketSymbol,
  OrderSide,
  PLACEABLE_ORDER_TYPES,
  type PlaceableOrderType,
  type PlaceOrderRequest,
  SYMBOLS,
} from '@paper-futures/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  Matches,
  ValidateIf,
} from 'class-validator';

export class PlaceOrderDto implements PlaceOrderRequest {
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

  /**
   * 포지션을 줄이기만 하는 주문. 줄일 반대 방향 포지션이 없거나
   * 수량이 포지션보다 크면 거부된다 (포지션이 새로 열리거나 늘어나는 것을 막는다)
   */
  @IsOptional()
  @IsBoolean({ message: 'reduceOnly는 true 또는 false여야 합니다.' })
  reduceOnly: boolean = false;
}
