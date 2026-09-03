import { NextResponse } from 'next/server'
import { isDbReady } from '@/lib/db'
import { cookieOptions } from '@/lib/auth'
import { saveAttendee } from '@/lib/saveAttendee'

export const runtime = 'nodejs'

const EDIT_COOKIE = 'chicama_me'

export async function POST(request: Request) {
  if (!isDbReady()) {
    return NextResponse.json(
      { error: 'No database yet. Add the Neon integration and set DATABASE_URL.' },
      { status: 503 },
    )
  }

  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Send JSON.' }, { status: 400 })
  }
  const body = payload as Record<string, unknown>

  // An explicit token in the body wins, so a shared edit link works in a
  // browser that has never been through this form before.
  const cookieToken = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(EDIT_COOKIE + '='))
    ?.slice(EDIT_COOKIE.length + 1)

  if (!body.edit_token && cookieToken) {
    body.edit_token = decodeURIComponent(cookieToken)
  }

  try {
    const row = await saveAttendee(body)
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
