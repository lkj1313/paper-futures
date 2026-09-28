import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ERRORS,
  type ErrorCode,
  type ErrorDetail,
  type ErrorResponse,
} from '@paper-futures/shared';

// shared의 ErrorResponse는 타입이라 Swagger가 읽지 못하므로, 문서용 클래스를 따로 둔다

export class ErrorDetailDto implements ErrorDetail {
  @ApiProperty({ example: 'email' })
  path: string;

  @ApiProperty({ example: 'email must be an email' })
  message: string;
}

export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ enum: Object.keys(ERRORS), example: 'VALIDATION_ERROR' })
  code: ErrorCode;

  @ApiProperty({ example: '요청 값이 올바르지 않습니다.' })
  message: string;

  @ApiPropertyOptional({ type: [ErrorDetailDto] })
  details?: ErrorDetailDto[];
}
