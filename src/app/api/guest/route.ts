import { NextResponse } from 'next/server'
import { isDbReady } from '@/lib/db'
import { EDIT_COOKIE, cookieOptions } from '@/lib/auth'
import { saveGuest } from '@/lib/saveGuest'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isDbReady()) {
    return NextResponse.json(
      { error: 'No database yet. Add a Neon database and set DATABASE_URL.' },
      { status: 503 },
    )
  }

  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Send JSON.' }, { status: 400 })
  }
  const body = payload as Record<string, unknown>

  // An explicit token in the body wins, so a shared edit link works in a
  // browser that has never seen this form before. An explicitly EMPTY token
  // means "this is somebody else on a shared laptop" — do not fall back to the
  // cookie and quietly overwrite the previous person's reply.
  const cookieToken = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(EDIT_COOKIE + '='))
    ?.slice(EDIT_COOKIE.length + 1)

  if (body.edit_token === undefined && cookieToken) {
    body.edit_token = decodeURIComponent(cookieToken)
  }

  try {
    const row = await saveGuest(body)
    const response = NextResponse.json({ ok: true, edit_token: row.edit_token, id: row.id })
    response.cookies.set(EDIT_COOKIE, row.edit_token, cookieOptions)
    return response
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Save failed.' },
      { status: 400 },
    )
  }
}
