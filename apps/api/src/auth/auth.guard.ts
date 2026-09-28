import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppException } from '../common/app.exception.js';
import type { AuthenticatedRequest, JwtPayload } from './auth.types.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

/** 모든 API에 적용되는 문지기. @Public()이 없으면 유효한 access 토큰을 요구한다 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 메서드나 컨트롤러에 @Public()이 붙어 있으면 통과
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) throw new AppException('UNAUTHORIZED');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request.user = { id: payload.sub };
    } catch (error) {
      // 만료는 web이 refresh로 갱신할 수 있도록 따로 알려준다
      if (error instanceof TokenExpiredError) {
        throw new AppException('TOKEN_EXPIRED');
      }
      // 위조, 형식 오류 등
      throw new AppException('UNAUTHORIZED');
    }
    return true;
  }
}

// Authorization: Bearer <token>
function extractBearerToken(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' && token ? token : undefined;
}
