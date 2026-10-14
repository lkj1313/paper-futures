import { describe, expect, it } from 'vitest';
import { axiosError } from '@/test/axios-error';
import { queryClient } from './query-client';

const retry = queryClient.getDefaultOptions().queries?.retry;
if (typeof retry !== 'function') throw new Error('retry 규칙이 함수가 아님');

describe('조회 재시도 규칙', () => {
  it('4xx는 다시 시도하지 않는다', () => {
    expect(retry(0, axiosError(400))).toBe(false);
    expect(retry(0, axiosError(401))).toBe(false);
    expect(retry(0, axiosError(404))).toBe(false);
  });

  it('5xx는 3번까지 다시 시도한다', () => {
    expect(retry(0, axiosError(500))).toBe(true);
    expect(retry(2, axiosError(503))).toBe(true);
    expect(retry(3, axiosError(503))).toBe(false);
  });

  it('응답이 없는 네트워크 실패도 다시 시도한다', () => {
    expect(retry(0, axiosError())).toBe(true);
  });
});
