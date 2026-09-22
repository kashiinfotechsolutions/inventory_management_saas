import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'arundairy_session';

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return Boolean(payload.sub && payload.tenantId && payload.email && payload.role);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/reset-password';
  const isAuthApi = pathname.startsWith('/api/auth/');
  const isWebhook = pathname === '/api/billing/webhook';
  const authenticated = await hasValidSession(request);

  if (isAuthApi || isWebhook) return NextResponse.next();
  if (isAuthPage && authenticated) return NextResponse.redirect(new URL('/', request.url));
  if (isAuthPage) return NextResponse.next();
  if (authenticated) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};