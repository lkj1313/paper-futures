import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: 'ok';

  @ApiProperty({ example: 'ok' })
  db: 'ok';

  @ApiProperty({ example: 'ok' })
  redis: 'ok';
}
