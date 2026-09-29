import { ApiProperty } from '@nestjs/swagger';
import { PositionDto } from '../../orders/dto/order-response.dto.js';

/** 열린 포지션 + 마크가격 기준으로 계산한 값 */
export class PositionViewDto extends PositionDto {
  @ApiProperty({ type: String, nullable: true, description: '현재 마크가격' })
  markPrice: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '미실현 손익 (마크가격 기준)',
  })
  unrealizedPnl: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '증거금 대비 수익률 (0.24 = 24%)',
  })
  roe: string | null;

  /** 격리 마진 청산가 (수수료 미반영) */
  liquidationPrice: string;

  /** 마크가격을 받은 지 5초가 지났거나 받은 적 없으면 true */
  stale: boolean;
}
