import { ApiProperty } from '@nestjs/swagger';
import type { UpdateLeverageRequest } from '@paper-futures/shared';
import { IsInt, Min } from 'class-validator';

export class UpdateLeverageDto implements UpdateLeverageRequest {
  @ApiProperty({ example: 20, minimum: 1 })
  @IsInt({ message: '레버리지는 정수여야 합니다.' })
  @Min(1, { message: '레버리지는 1 이상이어야 합니다.' })
  leverage: number;
}
