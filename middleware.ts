import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROLE_COOKIE = 'adminRole';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get(ADMIN_ROLE_COOKIE)?.value;

  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/dashboard')) {
    if (role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login'],
};
