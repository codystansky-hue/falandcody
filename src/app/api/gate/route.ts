import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, GUEST_COOKIE, cookieOptions, issueToken, passphraseMatches } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const form = await request.formData()
  const supplied = String(form.get('passphrase') ?? '')
  const scope = form.get('scope') === 'admin' ? 'admin' : 'guest'
  const next = String(form.get('next') ?? '/')

  const expected = scope === 'admin' ? process.env.ADMIN_PASSPHRASE : process.env.GATE_PASSPHRASE

  if (!expected) {
    return NextResponse.json(
      { error: scope === 'admin' ? 'ADMIN_PASSPHRASE is not set' : 'GATE_PASSPHRASE is not set' },
      { status: 503 },
    )
  }

  if (!(await passphraseMatches(supplied, expected))) {
    const url = new URL('/gate', request.url)
    url.searchParams.set('error', '1')
    url.searchParams.set('next', next)
    if (scope === 'admin') url.searchParams.set('scope', 'admin')
    return NextResponse.redirect(url, 303)
  }

  // Redirect only within this site — `next` comes off the query string.
  const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const response = NextResponse.redirect(new URL(destination, request.url), 303)
  response.cookies.set(
    scope === 'admin' ? ADMIN_COOKIE : GUEST_COOKIE,
    await issueToken(scope),
    cookieOptions,
  )
  // Clearing the admin gate also needs the guest gate present to get anywhere.
  if (scope === 'admin') {
    response.cookies.set(GUEST_COOKIE, await issueToken('guest'), cookieOptions)
  }
  return response
}
