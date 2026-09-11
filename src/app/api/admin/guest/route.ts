import { NextResponse } from 'next/server'
import { isDbReady } from '@/lib/db'
import { saveGuest } from '@/lib/saveGuest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Organiser-only insert. Deliberately not /api/guest: that route is the public
 * RSVP, sets the edit cookie, and would overwrite whoever last used this browser.
 * Middleware already requires the admin cookie for /api/admin/*.
 */
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

  try {
    const row = await saveGuest({
      name: body.name,
      email: body.email,
      phone: body.phone,
      postal_address: body.postal_address,
      side: body.side,
      notes: body.notes,
      status: 'invited',
      attending_events: [],
    })
    return NextResponse.json({ ok: true, id: row.id, edit_token: row.edit_token })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Save failed.' },
      { status: 400 },
    )
  }
}
