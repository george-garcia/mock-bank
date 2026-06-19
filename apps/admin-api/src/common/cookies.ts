import type { Response } from 'express';

// The admin panel is its own application; its session cookies are named/scoped separately
// from the bank app so the two never collide even if served from the same host in dev.
export const STAFF_ACCESS_COOKIE = 'staff_access_token';
export const STAFF_REFRESH_COOKIE = 'staff_refresh_token';

const REFRESH_PATH = '/api/auth';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
}

function baseOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax',
  };
}

export function setStaffAuthCookies(res: Response, t: AuthTokens): void {
  res.cookie(STAFF_ACCESS_COOKIE, t.accessToken, { ...baseOptions(), path: '/api', maxAge: t.accessMaxAgeMs });
  res.cookie(STAFF_REFRESH_COOKIE, t.refreshToken, { ...baseOptions(), path: REFRESH_PATH, maxAge: t.refreshMaxAgeMs });
}

export function clearStaffAuthCookies(res: Response): void {
  res.clearCookie(STAFF_ACCESS_COOKIE, { path: '/api' });
  res.clearCookie(STAFF_REFRESH_COOKIE, { path: REFRESH_PATH });
}
