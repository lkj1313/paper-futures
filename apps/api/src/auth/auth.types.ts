import type { Request } from 'express';

/** 토큰에 담는 내용. JWT는 누구나 열어볼 수 있으므로 사용자 id만 넣는다 */
export interface JwtPayload {
  sub: string;
}

/** Guard가 토큰을 검사한 뒤 요청에 붙여두는 사용자 정보 */
export interface AuthUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
