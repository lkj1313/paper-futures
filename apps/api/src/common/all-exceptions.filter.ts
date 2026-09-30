import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ERRORS,
  type ErrorCode,
  type ErrorResponse,
} from '@paper-futures/shared';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { AppException } from './app.exception.js';

// Nest 기본 예외(NotFoundException 등)는 code가 없으므로 상태 코드로 찾는다
const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

/** 카탈로그에 정의된 상태 코드와 기본 메시지로 응답을 만든다 */
function fromCatalog(code: ErrorCode): ErrorResponse {
  return {
    statusCode: ERRORS[code].status,
    code,
    message: ERRORS[code].message,
  };
}

/** 어디서 던져진 에러든 ErrorResponse 형식으로 바꿔서 응답한다. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const body = this.toErrorResponse(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    // WebSocket 연결에서 난 에러는 HTTP 응답이 없으므로 그 연결에 에러 이벤트로 알린다
    if (host.getType() === 'ws') {
      host
        .switchToWs()
        .getClient<{ emit(event: string, body: unknown): void }>()
        .emit('exception', body);
      return;
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.statusCode)
      .json(body);
  }

  toErrorResponse(exception: unknown): ErrorResponse {
    // AppException은 HttpException을 상속하므로 반드시 먼저 검사한다
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        ...(exception.details && { details: exception.details }),
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      return {
        statusCode,
        code:
          CODE_BY_STATUS[statusCode] ??
          (statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
        message: exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return fromCatalog('CONFLICT');
      if (exception.code === 'P2025') return fromCatalog('NOT_FOUND');
    }

    // 예상하지 못한 에러는 내부 정보를 숨기고 로그로만 남긴다
    return fromCatalog('INTERNAL_ERROR');
  }
}
