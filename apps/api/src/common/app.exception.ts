import { HttpException } from '@nestjs/common';
import {
  ERRORS,
  type ErrorCode,
  type ErrorDetail,
} from '@paper-futures/shared';

interface AppExceptionOptions {
  /** 카탈로그의 기본 메시지 대신 쓸 메시지 */
  message?: string;
  details?: ErrorDetail[];
}

/**
 * 서비스 코드에서 의도적으로 던지는 에러.
 * 상태 코드와 기본 메시지는 에러 카탈로그(ERRORS)에서 가져온다.
 *
 * @example throw new AppException('NOT_FOUND');
 * @example throw new AppException('SERVICE_UNAVAILABLE', { message: 'DB에 연결할 수 없습니다.' });
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, options: AppExceptionOptions = {}) {
    super(options.message ?? ERRORS[code].message, ERRORS[code].status);
    this.code = code;
    this.details = options.details;
  }
}
