import { type JwtService, TokenExpiredError } from '@nestjs/jwt';
import { AppException } from '../common/app.exception.js';
import type { JwtPayload } from './auth.types.js';

/**
 * access 토큰을 검사한다. HTTP 요청(가드)과 실시간 연결이 함께 쓴다.
 * 만료면 TOKEN_EXPIRED (web이 refresh로 갱신할 수 있게), 위조나 형식 오류면 UNAUTHORIZED
 */
export async function verifyAccessToken(
  jwt: JwtService,
  token: string,
): Promise<JwtPayload & { exp: number }> {
  try {
    return await jwt.verifyAsync<JwtPayload & { exp: number }>(token);
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppException('TOKEN_EXPIRED');
    }
    throw new AppException('UNAUTHORIZED');
  }
}
