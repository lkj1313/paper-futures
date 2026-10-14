import type { ErrorResponse } from '@paper-futures/shared';
import { isAxiosError } from 'axios';

export function getErrorMessages(error: unknown): string[] {
  if (!isAxiosError<ErrorResponse>(error)) {
    return ['알 수 없는 오류가 발생했습니다.'];
  }
  if (!error.response) return ['서버에 연결할 수 없습니다.'];

  const body = error.response.data;
  if (body?.details?.length) {
    return [...new Set(body.details.map((detail) => detail.message))];
  }
  if (body?.message) return [body.message];
  return ['서버 오류가 발생했습니다.'];
}
