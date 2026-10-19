import { ApiProperty } from '@nestjs/swagger';
import { type DepositRequest, MAX_DEPOSIT_USDT } from '@paper-futures/shared';
import { IsString } from 'class-validator';

export class DepositDto implements DepositRequest {
  @ApiProperty({
    example: '10000',
    description: `충전할 USDT. 0보다 크고 ${MAX_DEPOSIT_USDT} 이하, 소수 둘째 자리까지`,
  })
  @IsString({ message: '충전 금액은 문자열이어야 합니다.' })
  amount: string;
}
