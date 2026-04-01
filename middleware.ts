import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicAdminApiPaths = [
    '/api/admin/login',
    '/api/admin/forgot-password',
    '/api/admin/reset-password',
  ];

  // Normalize /order without trailing slash using internal rewrite.
  if (pathname === '/order') {
    const url = request.nextUrl.clone();
    url.pathname = '/order/';
    return NextResponse.rewrite(url);
  }

  // Normalize /services without trailing slash using internal rewrite.
  if (pathname === '/services') {
    const url = request.nextUrl.clone();
    url.pathname = '/services/';
    return NextResponse.rewrite(url);
  }

  // Skip login pages
  if (pathname === '/admin/login' || pathname === '/client/login') {
    return NextResponse.next();
  }

  // Allow public admin auth endpoints without token
  if (publicAdminApiPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Protect admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect client routes
  if (pathname.startsWith('/client/dashboard')) {
    const clientSession = request.cookies.get('client_session')?.value;

    if (!clientSession) {
      return NextResponse.redirect(new URL('/client/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/client/dashboard/:path*', '/order', '/services'],
};
