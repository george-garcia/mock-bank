import type { Response } from 'express';
import type { IssuedSession } from '../session/session.service';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// The refresh cookie is scoped to the auth path so it is only sent to refresh/logout.
const REFRESH_PATH = '/api/auth';

function baseOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax',
  };
}

export function setAuthCookies(res: Response, issued: IssuedSession): void {
  res.cookie(ACCESS_COOKIE, issued.accessToken, { ...baseOptions(), path: '/', maxAge: issued.accessMaxAgeMs });
  res.cookie(REFRESH_COOKIE, issued.refreshToken, { ...baseOptions(), path: REFRESH_PATH, maxAge: issued.refreshMaxAgeMs });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
}
