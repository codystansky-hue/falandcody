import { db, isDbReady } from './db'
import { getByToken } from './guests'
import { EVENT_KEYS, GUEST_STATUS, MAX_PLUS_ONES, SIDE_KEYS, STAY_KEYS, WEDDING } from './config'

// One upsert, shared by the browser form (POST /api/guest) and the MCP server
// (`rsvp`). Two doors onto the same room, so validation and timezone handling
// cannot drift between them.

export type SaveResult = { id: number; edit_token: string }

const str = (v: unknown, max = 400) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, max) : null
}

const oneOf = <T extends readonly string[]>(v: unknown, allowed: T, fallback: T[number]) =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? v : fallback

const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback)

const count = (v: unknown, max: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : 0
}

/**
 * Arrival and departure times are pinned to the venue's own offset. Without
 * this, a guest typing "lands 14:00" from a different timezone would shift the
 * transfer grouping by however many hours separate them from the venue.
 */
export function toVenueIso(v: unknown) {
  const s = str(v, 40)
  if (!s) return null
  const offset = WEDDING.date.utcOffsetHours
  const sign = offset < 0 ? '-' : '+'
  const abs = Math.abs(offset)
  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')
  const suffix = `${sign}${pad(abs)}:${pad((abs % 1) * 60)}`
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/.test(s)
    ? s
    : `${s}${/T\d{2}:\d{2}:\d{2}/.test(s) ? '' : ':00'}${suffix}`
  const d = new Date(zoned)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const money = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? n : null
}

const dateOnly = (v: unknown) => {
  const s = str(v, 12)
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

export async function saveGuest(body: Record<string, unknown>): Promise<SaveResult> {
  if (!isDbReady()) throw new Error('No database configured.')

  const name = str(body.name, 120)
  if (!name) throw new Error('Name is required.')

  const status = oneOf(body.status, GUEST_STATUS, 'yes')

  // Someone who cannot come is not attending events, bringing anyone, or
  // needing a car. Clearing it here rather than trusting the client keeps the
  // headcount honest when a yes later becomes a no.
  const coming = status !== 'no'

  const events = coming && Array.isArray(body.attending_events)
    ? body.attending_events.filter(
        (e): e is string => typeof e === 'string' && EVENT_KEYS.includes(e),
      )
    : []

  const sql = db()
  const token = str(body.edit_token, 64)
  const existing = token ? await getByToken(token) : null

  const f = {
    name,
    email: str(body.email, 200),
    phone: str(body.phone, 40),
    postal_address: str(body.postal_address, 500),
    side: oneOf(body.side, SIDE_KEYS, 'both'),
    status,
    attending_events: JSON.stringify(events),
    plus_one: coming && MAX_PLUS_ONES > 0 && bool(body.plus_one),
    plus_one_name: coming ? str(body.plus_one_name, 120) : null,
    kids: coming ? count(body.kids, 10) : 0,
    kids_names: coming ? str(body.kids_names, 300) : null,
    dietary: str(body.dietary, 500),
    song_request: str(body.song_request, 300),
    message: str(body.message, 1000),
    origin_city: str(body.origin_city, 120),
    origin_airport: str(body.origin_airport, 4)?.toUpperCase() ?? null,
    arrival_flight: str(body.arrival_flight, 12)?.toUpperCase() ?? null,
    arrival_at: toVenueIso(body.arrival_at),
    departure_flight: str(body.departure_flight, 12)?.toUpperCase() ?? null,
    departure_at: toVenueIso(body.departure_at),
    needs_transfer: coming && bool(body.needs_transfer),
    // Null rather than 0 when absent, so "not booked yet" stays distinguishable
    // from "the flight was free".
    flight_cost: money(body.flight_cost),
    stay_pref: oneOf(body.stay_pref, STAY_KEYS, 'undecided'),
    staying_with: str(body.staying_with, 200),
    passport_expiry: dateOnly(body.passport_expiry),
    emergency_contact: str(body.emergency_contact, 200),
    // Organiser-only. A later RSVP that omits notes must not wipe what we wrote.
    notes: body.notes === undefined && existing ? existing.notes : str(body.notes, 1000),
  }

  if (existing) {
    const rows = (await sql`
      update guests set
        name = ${f.name}, email = ${f.email}, phone = ${f.phone},
        postal_address = ${f.postal_address}, side = ${f.side}, status = ${f.status},
        attending_events = ${f.attending_events}::jsonb,
        plus_one = ${f.plus_one}, plus_one_name = ${f.plus_one_name},
        kids = ${f.kids}, kids_names = ${f.kids_names},
        dietary = ${f.dietary}, song_request = ${f.song_request}, message = ${f.message},
        origin_city = ${f.origin_city}, origin_airport = ${f.origin_airport},
        arrival_flight = ${f.arrival_flight}, arrival_at = ${f.arrival_at},
        departure_flight = ${f.departure_flight}, departure_at = ${f.departure_at},
        needs_transfer = ${f.needs_transfer}, flight_cost = ${f.flight_cost},
        stay_pref = ${f.stay_pref}, staying_with = ${f.staying_with},
        passport_expiry = ${f.passport_expiry}, emergency_contact = ${f.emergency_contact},
        notes = ${f.notes}, updated_at = now()
      where id = ${existing.id}
      returning id, edit_token
    `) as SaveResult[]
    return rows[0]
  }

  const fresh = crypto.randomUUID()
  const rows = (await sql`
    insert into guests (
      edit_token, name, email, phone, postal_address, side, status, attending_events,
      plus_one, plus_one_name, kids, kids_names, dietary, song_request, message,
      origin_city, origin_airport, arrival_flight, arrival_at, departure_flight,
      departure_at, needs_transfer, flight_cost, stay_pref, staying_with,
      passport_expiry, emergency_contact, notes
    ) values (
      ${fresh}, ${f.name}, ${f.email}, ${f.phone}, ${f.postal_address}, ${f.side},
      ${f.status}, ${f.attending_events}::jsonb, ${f.plus_one}, ${f.plus_one_name},
      ${f.kids}, ${f.kids_names}, ${f.dietary}, ${f.song_request}, ${f.message},
      ${f.origin_city}, ${f.origin_airport}, ${f.arrival_flight}, ${f.arrival_at},
      ${f.departure_flight}, ${f.departure_at}, ${f.needs_transfer}, ${f.flight_cost},
      ${f.stay_pref}, ${f.staying_with}, ${f.passport_expiry}, ${f.emergency_contact},
      ${f.notes}
    )
    returning id, edit_token
  `) as SaveResult[]
  return rows[0]
}
