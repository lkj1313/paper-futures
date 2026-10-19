import { ApiProperty } from '@nestjs/swagger';
import type { AmendOrderRequest } from '@paper-futures/shared';
import { Matches } from 'class-validator';

export class AmendOrderDto implements AmendOrderRequest {
  @ApiProperty({
    example: '79000',
    description: '새 지정가. 종목의 호가 단위에 맞아야 한다',
  })
  @Matches(/^\d+(\.\d+)?$/, { message: '가격은 숫자 문자열이어야 합니다.' })
  price: string;
}
