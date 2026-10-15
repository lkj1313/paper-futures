import { describe, expect, it } from 'vitest';
import { axiosError } from '@/test/axios-error';
import { getErrorMessages } from './error';

describe('getErrorMessages', () => {
  it('axios 에러가 아니면 알 수 없는 오류', () => {
    expect(getErrorMessages(new Error('boom'))).toEqual([
      '알 수 없는 오류가 발생했습니다.',
    ]);
  });

  it('응답이 없으면 서버에 연결할 수 없음', () => {
    expect(getErrorMessages(axiosError())).toEqual([
      '서버에 연결할 수 없습니다.',
    ]);
  });

  it('검증 실패는 칸별 메시지를 중복 없이 모두 돌려준다', () => {
    const error = axiosError(400, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: '요청 값이 올바르지 않습니다.',
      details: [
        { path: 'email', message: '이메일 형식이 아닙니다.' },
        { path: 'password', message: '비밀번호를 입력하세요.' },
        { path: 'password', message: '비밀번호를 입력하세요.' },
      ],
    });

    expect(getErrorMessages(error)).toEqual([
      '이메일 형식이 아닙니다.',
      '비밀번호를 입력하세요.',
    ]);
  });

  it('details가 없으면 서버 메시지를 돌려준다', () => {
    const error = axiosError(401, {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    });

    expect(getErrorMessages(error)).toEqual([
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    ]);
  });

  it('우리 형식이 아닌 응답은 서버 오류', () => {
    expect(
      getErrorMessages(axiosError(502, '<html>Bad Gateway</html>')),
    ).toEqual(['서버 오류가 발생했습니다.']);
  });
});
