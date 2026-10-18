import { ApiProperty } from '@nestjs/swagger';
import {
  type Candle,
  CANDLE_INTERVALS,
  type CandleInterval,
  type CandlesQuery,
  DEFAULT_CANDLE_LIMIT,
  MAX_CANDLE_LIMIT,
} from '@paper-futures/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CandlesQueryDto implements CandlesQuery {
  @ApiProperty({ enum: CANDLE_INTERVALS })
  @IsIn(CANDLE_INTERVALS, { message: '지원하지 않는 봉 간격입니다.' })
  interval: CandleInterval;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: MAX_CANDLE_LIMIT,
    default: DEFAULT_CANDLE_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit은 정수여야 합니다.' })
  @Min(1, { message: 'limit은 1 이상이어야 합니다.' })
  @Max(MAX_CANDLE_LIMIT, {
    message: `limit은 ${MAX_CANDLE_LIMIT} 이하여야 합니다.`,
  })
  limit: number = DEFAULT_CANDLE_LIMIT;
}

export class CandleDto implements Candle {
  @ApiProperty({ description: '봉 시작 시각 (ms)' })
  time: number;

  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}
