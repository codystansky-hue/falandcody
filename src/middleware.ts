import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, GUEST_COOKIE, verifyToken } from '@/lib/auth'

// Everything is behind the gate except the gate itself and the assets needed to
// draw it. /admin needs a second, separate passphrase on top.
const PUBLIC_PATHS = ['/gate', '/api/gate']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  if (!(await verifyToken(request.cookies.get(GUEST_COOKIE)?.value, 'guest'))) {
    // API callers get a status they can act on; humans get the gate, with a
    // pointer back to where they were headed.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'locked' }, { status: 401 })
    }
    const gate = new URL('/gate', request.url)
    gate.searchParams.set('next', pathname)
    return NextResponse.redirect(gate)
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin')) {
    if (!(await verifyToken(request.cookies.get(ADMIN_COOKIE)?.value, 'admin'))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'admin locked' }, { status: 401 })
      }
      const gate = new URL('/gate', request.url)
      gate.searchParams.set('scope', 'admin')
      gate.searchParams.set('next', pathname)
      return NextResponse.redirect(gate)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|webp|avif|ico)$).*)'],
}
