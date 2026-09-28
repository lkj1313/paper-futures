import { AppException } from './app.exception.js';

describe('AppException', () => {
  it('코드만 주면 카탈로그의 상태 코드와 기본 메시지를 쓴다', () => {
    const error = new AppException('NOT_FOUND');

    expect(error.code).toBe('NOT_FOUND');
    expect(error.getStatus()).toBe(404);
    expect(error.message).toBe('대상을 찾을 수 없습니다.');
  });

  it('메시지와 상세를 덮어쓸 수 있다', () => {
    const details = [{ path: 'email', message: '형식 오류' }];
    const error = new AppException('VALIDATION_ERROR', {
      message: '이메일을 확인하세요.',
      details,
    });

    expect(error.getStatus()).toBe(400);
    expect(error.message).toBe('이메일을 확인하세요.');
    expect(error.details).toEqual(details);
  });
});
