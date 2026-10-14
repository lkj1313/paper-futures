import type { LoginResponse } from '@paper-futures/shared';

export class LoginResponseDto implements LoginResponse {
  /** Authorization: Bearer 헤더에 담아 보내는 토큰 */
  accessToken: string;
}
