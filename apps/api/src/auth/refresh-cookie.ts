import type { CookieOptions, Request, Response } from 'express';

export const REFRESH_COOKIE = 'refresh_token';

interface RefreshCookieConfig {
  secure: boolean;
  maxAgeSeconds: number;
}

function cookieOptions({ secure }: RefreshCookieConfig): CookieOptions {
  return {
    httpOnly: true, // JavaScript에서 읽을 수 없게 한다 (XSS 대비)
    secure, // 운영 환경에서는 HTTPS에서만 전송
    sameSite: 'strict', // 다른 사이트에서 시작된 요청에는 붙이지 않는다 (CSRF 대비)
    path: '/api/auth', // 인증 API에만 전송
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  config: RefreshCookieConfig,
) {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions(config),
    maxAge: config.maxAgeSeconds * 1000,
  });
}

export function clearRefreshCookie(res: Response, config: RefreshCookieConfig) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions(config));
}

export function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value ? value : undefined;
}
