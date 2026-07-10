import { NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/join',
  '/update-password',
  '/api/',
  '/_next/',
  '/favicon',
  '/exercises/',
]

export function proxy(request) {
  const { pathname } = request.nextUrl

  // Let public paths, static assets, and the hub itself through
  if (pathname === '/' || PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // If the session hasn't passed through the hub yet, redirect to /
  const hubGate = request.cookies.get('hub_gate')
  if (!hubGate) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
