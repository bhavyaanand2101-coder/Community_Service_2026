import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromCookieString, isAuthorizedForRole } from './lib/auth';
import { UserRole } from './lib/types';

const ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
  '/admin': ['ADMIN'],
  '/teacher': ['TEACHER'],
  '/student': ['STUDENT'],
  '/parent': ['PARENT'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Force HTTPS in production
  if (process.env.NODE_ENV === 'production' && req.headers.get('x-forwarded-proto') === 'http') {
    return NextResponse.redirect(`https://${req.headers.get('host')}${pathname}`, 301);
  }

  // 2. Lock down CORS on API routes
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || '';
    const isAllowed = origin && (
      origin === allowedOrigin || 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1')
    );

    if (req.method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 204 });
      if (isAllowed) {
        preflight.headers.set('Access-Control-Allow-Origin', origin);
        preflight.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-razorpay-signature');
        preflight.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      return preflight;
    }
  }

  // 3. Check if the current route is protected
  const protectedPrefix = Object.keys(ROUTE_ROLE_MAP).find(prefix => 
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // If public route or asset, allow through
  if (!protectedPrefix) {
    return NextResponse.next();
  }

  // 4. Extract and verify session token from cookies
  const cookieHeader = req.headers.get('cookie');
  const session = await getSessionFromCookieString(cookieHeader);
  const requiredRoles = ROUTE_ROLE_MAP[protectedPrefix];

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('role', requiredRoles[0]);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Role-based authorization check
  if (!isAuthorizedForRole(session.role, requiredRoles)) {
    const designatedPortal = 
      session.role === 'ADMIN' ? '/admin' :
      session.role === 'TEACHER' ? '/teacher' :
      session.role === 'STUDENT' ? '/student' : '/parent';

    const redirectUrl = new URL(designatedPortal, req.url);
    redirectUrl.searchParams.set('unauthorized', '1');
    return NextResponse.redirect(redirectUrl);
  }

  // 6. Authorized: Inject verified identity headers
  const response = NextResponse.next();
  response.headers.set('x-user-id', session.userId);
  response.headers.set('x-user-role', session.role);
  response.headers.set('x-user-email', session.email);
  if (session.phone) response.headers.set('x-user-phone', session.phone);
  if (session.associatedId) response.headers.set('x-associated-id', session.associatedId);

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/parent/:path*',
    '/api/:path*',
  ],
};
