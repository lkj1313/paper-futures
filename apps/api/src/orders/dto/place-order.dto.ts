import { ApiProperty } from '@nestjs/swagger';
import { type MarketSymbol, OrderSide, SYMBOLS } from '@paper-futures/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

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

  @ApiProperty({ enum: ['MARKET'], example: 'MARKET' })
  @IsIn(['MARKET'], { message: '지금은 시장가(MARKET) 주문만 지원합니다.' })
  type: 'MARKET';

  /** 수량 (문자열). 종목의 수량 단위(BTC, ETH 0.001)에 맞아야 한다 */
  @ApiProperty({ example: '0.1' })
  @Matches(/^\d+(\.\d+)?$/, { message: '수량은 숫자 문자열이어야 합니다.' })
  qty: string;

  /** 새 포지션을 열 때의 레버리지. 이미 포지션이 있으면 그 포지션의 레버리지를 쓴다 */
  @IsOptional()
  @IsInt({ message: '레버리지는 정수여야 합니다.' })
  @Min(1, { message: '레버리지는 1 이상이어야 합니다.' })
  @Max(125, { message: '레버리지는 125 이하여야 합니다.' })
  leverage: number = 10;
}
