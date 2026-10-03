import { NextRequest, NextResponse } from 'next/server';
export function proxy(req: NextRequest) { const protectedPath = /^\/(dashboard|settings|admin)(\/|$)/.test(req.nextUrl.pathname); if (protectedPath && !req.cookies.has('cloudnest_session')) return NextResponse.redirect(new URL('/login', req.url)); return NextResponse.next(); }
export const config = { matcher: ['/dashboard/:path*', '/settings/:path*', '/admin/:path*'] };
