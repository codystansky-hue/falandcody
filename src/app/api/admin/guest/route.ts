import { NextResponse } from 'next/server'
import { isDbReady } from '@/lib/db'
import { getByToken, type Guest } from '@/lib/guests'
import { saveGuest } from '@/lib/saveGuest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Organiser-named plus-ones live on the same invitation row. A non-empty name
 * means they are bringing someone; clearing the name drops the plus-one.
 */
function plusOneFields(body: Record<string, unknown>) {
  const name = typeof body.plus_one_name === 'string' ? body.plus_one_name.trim() : ''
  if (name) return { plus_one: true, plus_one_name: name }
  return { plus_one: false, plus_one_name: null }
}

/**
 * saveGuest writes every column it knows about. Replaying the existing row
 * is what stops an organiser plus-one edit from wiping travel, kids, notes,
 * or — most importantly — resetting `invited` to yes.
 */
function existingToSaveBody(guest: Guest): Record<string, unknown> {
  return {
    edit_token: guest.edit_token,
    name: guest.name,
    email: guest.email,
    phone: guest.phone,
    postal_address: guest.postal_address,
    side: guest.side,
    status: guest.status,
    attending_events: guest.attending_events,
    plus_one: guest.plus_one,
    plus_one_name: guest.plus_one_name,
    kids: guest.kids,
    kids_names: guest.kids_names,
    dietary: guest.dietary,
    song_request: guest.song_request,
    message: guest.message,
    origin_city: guest.origin_city,
    origin_airport: guest.origin_airport,
    arrival_flight: guest.arrival_flight,
    arrival_at: guest.arrival_at,
    departure_flight: guest.departure_flight,
    departure_at: guest.departure_at,
    needs_transfer: guest.needs_transfer,
    flight_cost: guest.flight_cost,
    stay_pref: guest.stay_pref,
    staying_with: guest.staying_with,
    passport_expiry: guest.passport_expiry ? String(guest.passport_expiry).slice(0, 10) : null,
    emergency_contact: guest.emergency_contact,
    notes: guest.notes,
  }
}

/**
 * Organiser-only insert and plus-one edit. Deliberately not /api/guest: that
 * route is the public RSVP, sets the edit cookie, and would overwrite whoever
 * last used this browser. Middleware already requires the admin cookie for
 * /api/admin/*.
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
  const plus = plusOneFields(body)

  try {
    const token = typeof body.edit_token === 'string' ? body.edit_token.trim() : ''
    if (token) {
      const existing = await getByToken(token)
      if (!existing) {
        return NextResponse.json({ error: 'Guest not found.' }, { status: 404 })
      }
      const row = await saveGuest({
        ...existingToSaveBody(existing),
        ...plus,
      })
      return NextResponse.json({ ok: true, id: row.id, edit_token: row.edit_token })
    }

    const row = await saveGuest({
      name: body.name,
      email: body.email,
      phone: body.phone,
      postal_address: body.postal_address,
      side: body.side,
      notes: body.notes,
      status: 'invited',
      attending_events: [],
      ...plus,
    })
    return NextResponse.json({ ok: true, id: row.id, edit_token: row.edit_token })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Save failed.' },
      { status: 400 },
    )
  }
}
