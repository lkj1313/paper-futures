import { ApiProperty } from '@nestjs/swagger';
import { type MarketSymbol, SYMBOLS } from '@paper-futures/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { ApiNextCursor, CursorPageQueryDto } from '../../common/cursor-page.js';
import { OrderDto } from './order-response.dto.js';

export class ListOrdersQueryDto extends CursorPageQueryDto {
  /** 이 종목의 주문만. 비우면 전체 */
  @ApiProperty({ enum: SYMBOLS, required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(SYMBOLS, { message: '지원하지 않는 종목입니다.' })
  symbol?: MarketSymbol;
}

export class OrderPageDto {
  @ApiProperty({ type: [OrderDto] })
  items: OrderDto[];

  @ApiNextCursor()
  nextCursor: string | null;
}
