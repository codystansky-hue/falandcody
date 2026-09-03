import { db, isDbReady } from './db'
import { getByToken } from './attendees'
import { FOIL_LEVELS, GEAR_ITEMS, ROOM_KEYS, STATUS_KEYS } from './config'
import { PROPOSED_WEEKS, VOTES } from './weeks'

// One upsert, shared by the browser form (POST /api/attendee) and the MCP
// server (join_trip). Two doors onto the same room — validation and Peru-time
// handling cannot drift between them.

export type SaveResult = { id: number; edit_token: string }

const str = (v: unknown, max = 400) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, max) : null
}

const oneOf = <T extends readonly string[]>(v: unknown, allowed: T, fallback: T[number]) =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? v : fallback

// Peru is UTC−5 year round and does not observe DST. datetime-local and any
// bare string an agent passes get pinned to it, so shuttle grouping never
// shifts by the caller's own offset.
const PERU_OFFSET = '-05:00'

export const toPeruIso = (v: unknown) => {
  const s = str(v, 40)
  if (!s) return null
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/.test(s)
    ? s
    : `${s}${/T\d{2}:\d{2}:\d{2}/.test(s) ? '' : ':00'}${PERU_OFFSET}`
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

export async function saveAttendee(body: Record<string, unknown>): Promise<SaveResult> {
  if (!isDbReady()) throw new Error('No database configured.')

  const name = str(body.name, 120)
  if (!name) throw new Error('Name is required.')

  const gear = Array.isArray(body.bringing_gear)
    ? body.bringing_gear.filter(
        (g): g is string => typeof g === 'string' && GEAR_ITEMS.some((item) => item.key === g),
      )
    : []

  const f = {
    name,
    nickname: str(body.nickname, 60),
    email: str(body.email, 200),
    phone: str(body.phone, 40),
    origin_city: str(body.origin_city, 120),
    origin_airport: str(body.origin_airport, 4)?.toUpperCase() ?? null,
    arrival_flight: str(body.arrival_flight, 12)?.toUpperCase() ?? null,
    arrival_at: toPeruIso(body.arrival_at),
    departure_flight: str(body.departure_flight, 12)?.toUpperCase() ?? null,
    departure_at: toPeruIso(body.departure_at),
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
    passport_expiry: dateOnly(body.passport_expiry),
    emergency_contact: str(body.emergency_contact, 200),
    status: oneOf(body.status, STATUS_KEYS, 'in'),
    notes: str(body.notes, 1000),
    // Null rather than 0 when absent, so "not booked yet" stays distinguishable
    // from "the flight was free".
    flight_cost_usd: money(body.flight_cost_usd),
  }

  const sql = db()
  const token = str(body.edit_token, 64)
  const existing = token ? await getByToken(token) : null

  let row: SaveResult
  if (existing) {
    const rows = (await sql`
      update attendees set
        name = ${f.name}, nickname = ${f.nickname}, email = ${f.email},
        phone = ${f.phone}, origin_city = ${f.origin_city},
        origin_airport = ${f.origin_airport}, arrival_flight = ${f.arrival_flight},
        arrival_at = ${f.arrival_at}, departure_flight = ${f.departure_flight},
        departure_at = ${f.departure_at}, needs_transfer = ${f.needs_transfer},
        room_pref = ${f.room_pref}, roommate_pref = ${f.roommate_pref},
        foil_level = ${f.foil_level}, bringing_gear = ${f.bringing_gear}::jsonb,
        rental_needed = ${f.rental_needed}, wetsuit_size = ${f.wetsuit_size},
        shirt_size = ${f.shirt_size}, dietary = ${f.dietary},
        passport_expiry = ${f.passport_expiry}, emergency_contact = ${f.emergency_contact},
        status = ${f.status}, notes = ${f.notes},
        flight_cost_usd = ${f.flight_cost_usd}, updated_at = now()
      where id = ${existing.id}
      returning id, edit_token
    `) as SaveResult[]
    row = rows[0]
  } else {
    const fresh = crypto.randomUUID()
    const rows = (await sql`
      insert into attendees (
        edit_token, name, nickname, email, phone, origin_city, origin_airport,
        arrival_flight, arrival_at, departure_flight, departure_at, needs_transfer,
        room_pref, roommate_pref, foil_level, bringing_gear, rental_needed,
        wetsuit_size, shirt_size, dietary, passport_expiry, emergency_contact, status, notes,
        flight_cost_usd
      ) values (
        ${fresh}, ${f.name}, ${f.nickname}, ${f.email}, ${f.phone},
        ${f.origin_city}, ${f.origin_airport}, ${f.arrival_flight},
        ${f.arrival_at}, ${f.departure_flight}, ${f.departure_at},
        ${f.needs_transfer}, ${f.room_pref}, ${f.roommate_pref},
        ${f.foil_level}, ${f.bringing_gear}::jsonb, ${f.rental_needed},
        ${f.wetsuit_size}, ${f.shirt_size}, ${f.dietary},
        ${f.passport_expiry}, ${f.emergency_contact}, ${f.status}, ${f.notes},
        ${f.flight_cost_usd}
      )
      returning id, edit_token
    `) as SaveResult[]
    row = rows[0]
  }

  // Availability windows and week votes are both replaced wholesale — the
  // caller always submits the complete set, so diffing would only add ways to
  // get it wrong. Absent keys are left alone rather than cleared.
  if (Array.isArray(body.windows)) {
    await sql`delete from availability where attendee_id = ${row.id}`
    for (const w of body.windows.slice(0, 12)) {
      const start = dateOnly((w as Record<string, unknown>)?.start)
      const end = dateOnly((w as Record<string, unknown>)?.end)
      if (start && end && start <= end) {
        await sql`
          insert into availability (attendee_id, window_start, window_end)
          values (${row.id}, ${start}, ${end})
        `
      }
    }
  }

  await saveVotes(row.id, body.week_votes)
  return row
}

export async function saveVotes(attendeeId: number, raw: unknown) {
  if (!raw || typeof raw !== 'object') return
  const votes = raw as Record<string, unknown>
  const sql = db()
  for (const week of PROPOSED_WEEKS) {
    const vote = votes[week.key]
    if (typeof vote !== 'string' || !(VOTES as readonly string[]).includes(vote)) continue
    await sql`
      insert into date_votes (attendee_id, week_key, vote)
      values (${attendeeId}, ${week.key}, ${vote})
      on conflict (attendee_id, week_key) do update set vote = excluded.vote
    `
  }
}
