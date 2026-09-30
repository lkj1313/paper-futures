import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppException } from '../common/app.exception.js';
import { verifyAccessToken } from './access-token.js';
import type { AuthenticatedRequest } from './auth.types.js';
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

    const payload = await verifyAccessToken(this.jwtService, token);
    request.user = { id: payload.sub };
    return true;
  }
}

// Authorization: Bearer <token>
function extractBearerToken(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' && token ? token : undefined;
}
