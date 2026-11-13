import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-constants';

// NextAuth's `auth` helper has overloaded signatures; cast it to the plain
// (request, event) middleware form so we can invoke it directly.
const nextAuthMiddleware = NextAuth(authConfig).auth as unknown as (
  request: NextRequest,
  event: NextFetchEvent,
) => Response | Promise<Response>;

// Google's OAuth callback reaches us via my-pfms.vercel.app, which Vercel
// redirects to www.poultryledger.com. Sign-in started on the bare apex domain
// sets its state/PKCE cookies on poultryledger.com, which www can't read, so the
// callback fails with error=Configuration. Keep every visitor on one host.
const CANONICAL_HOST = 'www.poultryledger.com';
const APEX_HOST = CANONICAL_HOST.replace(/^www\./, '');

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (request.headers.get('host')?.toLowerCase() === APEX_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  // Admin routes use a separate HMAC cookie session (not NextAuth).
  // Handle them here and bypass NextAuth entirely so admin pages are not
  // bounced to the farm-owner login. Full HMAC verification still happens
  // in requirePaymentAdminPage/requirePaymentAdminAction.
  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/login')) {
      return NextResponse.next();
    }

    const adminCookie = request.cookies.get(ADMIN_SESSION_COOKIE);
    if (!adminCookie?.value) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // Farm-owner dashboard protection via NextAuth.
  return nextAuthMiddleware(request, event);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
