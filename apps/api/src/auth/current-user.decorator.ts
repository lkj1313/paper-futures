import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { AppException } from '../common/app.exception.js';
import type { AuthenticatedRequest, AuthUser } from './auth.types.js';

/** Guard가 요청에 붙여둔 로그인 사용자를 꺼낸다 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // @Public() API에서 실수로 쓰면 user가 없다
    if (!request.user) throw new AppException('UNAUTHORIZED');
    return request.user;
  },
);
