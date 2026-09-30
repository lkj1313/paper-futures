import type { ArgumentsHost } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { AppException } from './app.exception.js';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('AppException은 code, message, details를 그대로 담는다', () => {
    const details = [{ path: 'email', message: '형식 오류' }];
    const body = filter.toErrorResponse(
      new AppException('VALIDATION_ERROR', { details }),
    );

    expect(body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: '요청 값이 올바르지 않습니다.',
      details,
    });
  });

  it('Nest 기본 예외는 상태 코드에 맞는 code로 바꾼다', () => {
    const body = filter.toErrorResponse(new NotFoundException('없음'));

    expect(body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: '없음',
    });
  });

  it('Prisma 중복 에러(P2002)는 카탈로그의 CONFLICT', () => {
    const body = filter.toErrorResponse(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    expect(body).toEqual({
      statusCode: 409,
      code: 'CONFLICT',
      message: '이미 존재하는 데이터입니다.',
    });
  });

  it('예상하지 못한 에러는 500이고 내부 메시지를 노출하지 않는다', () => {
    const body = filter.toErrorResponse(
      new Error('password=secret DB 접속 실패'),
    );

    expect(body).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다.',
    });
  });

  it('catch는 변환한 결과를 상태 코드와 함께 응답한다', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    filter.catch(new NotFoundException('없음'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });

  it('WebSocket 연결에서 난 에러는 그 연결에 exception 이벤트로 보낸다', () => {
    const emit = vi.fn();
    const host = {
      getType: () => 'ws',
      switchToWs: () => ({ getClient: () => ({ emit }) }),
    } as unknown as ArgumentsHost;

    filter.catch(new NotFoundException('없음'), host);

    expect(emit).toHaveBeenCalledWith(
      'exception',
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });
});
