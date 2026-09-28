import { ValidationPipe, type ValidationError } from '@nestjs/common';
import type { ErrorDetail } from '@paper-futures/shared';
import { AppException } from './app.exception.js';

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: toValidationException,
  });
}

export function toValidationException(errors: ValidationError[]) {
  return new AppException('VALIDATION_ERROR', {
    details: flattenErrors(errors),
  });
}

// 중첩 객체의 에러까지 'address.city' 형태의 경로로 펼친다
function flattenErrors(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      path,
      message,
    }));
    return [...own, ...flattenErrors(error.children ?? [], path)];
  });
}
