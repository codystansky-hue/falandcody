import { NextResponse } from 'next/server'
import { db, isDbReady } from '@/lib/db'
import { getByToken } from '@/lib/attendees'
import { cookieOptions } from '@/lib/auth'
import { FOIL_LEVELS, GEAR_ITEMS, ROOM_KEYS, STATUS_KEYS } from '@/lib/config'

export const runtime = 'nodejs'

const EDIT_COOKIE = 'chicama_me'

const str = (v: unknown, max = 400) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, max) : null
}
const oneOf = <T extends readonly string[]>(v: unknown, allowed: T, fallback: T[number]) =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? v : fallback

// Datetime-local arrives without a zone. Peru is UTC-5 year round and does not
// observe DST, so arrival and departure times are pinned to it — otherwise the
// shuttle grouping silently shifts by the organiser's own offset.
const PERU_OFFSET = '-05:00'
const ts = (v: unknown) => {
  const s = str(v, 40)
  if (!s) return null
  // Already zoned (an edit round-tripping an ISO string) — take it as given.
  // Otherwise it is a bare `YYYY-MM-DDTHH:MM[:SS]` from datetime-local.
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/.test(s)
    ? s
    : `${s}${/T\d{2}:\d{2}:\d{2}/.test(s) ? '' : ':00'}${PERU_OFFSET}`
  const d = new Date(zoned)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
const date = (v: unknown) => {
  const s = str(v, 12)
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

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

  const name = str(body.name, 120)
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const gear = Array.isArray(body.bringing_gear)
    ? body.bringing_gear.filter(
        (g): g is string => typeof g === 'string' && GEAR_ITEMS.some((item) => item.key === g),
      )
    : []

  const fields = {
    name,
    nickname: str(body.nickname, 60),
    email: str(body.email, 200),
    phone: str(body.phone, 40),
    origin_city: str(body.origin_city, 120),
    origin_airport: str(body.origin_airport, 4)?.toUpperCase() ?? null,
    arrival_flight: str(body.arrival_flight, 12)?.toUpperCase() ?? null,
    arrival_at: ts(body.arrival_at),
    departure_flight: str(body.departure_flight, 12)?.toUpperCase() ?? null,
    departure_at: ts(body.departure_at),
    needs_transfer: body.needs_transfer !== false,
    room_pref: oneOf(body.room_pref, ROOM_KEYS, 'any'),
    roommate_pref: str(body.roommate_pref, 120),
    foil_level: oneOf(
      body.foil_level,
      FOIL_LEVELS.map((l) => l.key),
      'never',
    ),
    bringing_gear: JSON.stringify(gear),
    rental_needed: str(body.rental_needed, 300),
    wetsuit_size: str(body.wetsuit_size, 20),
    shirt_size: str(body.shirt_size, 20),
    dietary: str(body.dietary, 300),
    passport_expiry: date(body.passport_expiry),
    emergency_contact: str(body.emergency_contact, 200),
    status: oneOf(body.status, STATUS_KEYS, 'in'),
    notes: str(body.notes, 1000),
  }

  const sql = db()
  const existingToken = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(EDIT_COOKIE + '='))
    ?.slice(EDIT_COOKIE.length + 1)

  // An explicit token in the body wins, so a shared edit link works in a browser
  // that has never been through this form before.
  const token = str(body.edit_token, 64) ?? (existingToken ? decodeURIComponent(existingToken) : null)
  const existing = token ? await getByToken(token) : null

  let row: { id: number; edit_token: string }
  if (existing) {
    const rows = (await sql`
      update attendees set
        name = ${fields.name}, nickname = ${fields.nickname}, email = ${fields.email},
        phone = ${fields.phone}, origin_city = ${fields.origin_city},
        origin_airport = ${fields.origin_airport}, arrival_flight = ${fields.arrival_flight},
        arrival_at = ${fields.arrival_at}, departure_flight = ${fields.departure_flight},
        departure_at = ${fields.departure_at}, needs_transfer = ${fields.needs_transfer},
        room_pref = ${fields.room_pref}, roommate_pref = ${fields.roommate_pref},
        foil_level = ${fields.foil_level}, bringing_gear = ${fields.bringing_gear}::jsonb,
        rental_needed = ${fields.rental_needed}, wetsuit_size = ${fields.wetsuit_size},
        shirt_size = ${fields.shirt_size}, dietary = ${fields.dietary},
        passport_expiry = ${fields.passport_expiry}, emergency_contact = ${fields.emergency_contact},
        status = ${fields.status}, notes = ${fields.notes}, updated_at = now()
      where id = ${existing.id}
      returning id, edit_token
    `) as { id: number; edit_token: string }[]
    row = rows[0]
  } else {
    const fresh = crypto.randomUUID()
    const rows = (await sql`
      insert into attendees (
        edit_token, name, nickname, email, phone, origin_city, origin_airport,
        arrival_flight, arrival_at, departure_flight, departure_at, needs_transfer,
        room_pref, roommate_pref, foil_level, bringing_gear, rental_needed,
        wetsuit_size, shirt_size, dietary, passport_expiry, emergency_contact, status, notes
      ) values (
        ${fresh}, ${fields.name}, ${fields.nickname}, ${fields.email}, ${fields.phone},
        ${fields.origin_city}, ${fields.origin_airport}, ${fields.arrival_flight},
        ${fields.arrival_at}, ${fields.departure_flight}, ${fields.departure_at},
        ${fields.needs_transfer}, ${fields.room_pref}, ${fields.roommate_pref},
        ${fields.foil_level}, ${fields.bringing_gear}::jsonb, ${fields.rental_needed},
        ${fields.wetsuit_size}, ${fields.shirt_size}, ${fields.dietary},
        ${fields.passport_expiry}, ${fields.emergency_contact}, ${fields.status}, ${fields.notes}
      )
      returning id, edit_token
    `) as { id: number; edit_token: string }[]
    row = rows[0]
  }

  // Availability windows are replaced wholesale — simpler than diffing, and the
  // form always submits the complete set.
  const windows = Array.isArray(body.windows) ? body.windows : []
  await sql`delete from availability where attendee_id = ${row.id}`
  for (const w of windows.slice(0, 12)) {
    const start = date((w as Record<string, unknown>)?.start)
    const end = date((w as Record<string, unknown>)?.end)
    if (start && end && start <= end) {
      await sql`
        insert into availability (attendee_id, window_start, window_end)
        values (${row.id}, ${start}, ${end})
      `
    }
  }

  const response = NextResponse.json({ ok: true, edit_token: row.edit_token, id: row.id })
  response.cookies.set(EDIT_COOKIE, row.edit_token, cookieOptions)
  return response
}
