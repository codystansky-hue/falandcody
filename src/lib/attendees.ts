import { db, isDbReady } from './db'
import { PASSPORT_MONTHS_REQUIRED } from './config'

export type Attendee = {
  id: number
  edit_token: string
  name: string
  nickname: string | null
  email: string | null
  phone: string | null
  origin_city: string | null
  origin_airport: string | null
  arrival_flight: string | null
  arrival_at: string | null
  departure_flight: string | null
  departure_at: string | null
  needs_transfer: boolean
  room_pref: string | null
  roommate_pref: string | null
  foil_level: string | null
  bringing_gear: string[]
  rental_needed: string | null
  wetsuit_size: string | null
  shirt_size: string | null
  dietary: string | null
  passport_expiry: string | null
  emergency_contact: string | null
  paid_status: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Window = { id: number; attendee_id: number; window_start: string; window_end: string }
export type DateVote = { attendee_id: number; week_key: string; vote: string }

export async function listAttendees(): Promise<Attendee[]> {
  if (!isDbReady()) return []
  const rows = await db()`
    select * from attendees order by
      case status when 'in' then 0 when 'maybe' then 1 else 2 end,
      created_at
  `
  return rows as Attendee[]
}

export async function getByToken(token: string): Promise<Attendee | null> {
  if (!isDbReady() || !token) return null
  const rows = (await db()`
    select * from attendees where edit_token = ${token} limit 1
  `) as Attendee[]
  return rows[0] ?? null
}

export async function listWindows(): Promise<Window[]> {
  if (!isDbReady()) return []
  const rows = await db()`select * from availability order by window_start`
  return rows as Window[]
}

export async function windowsFor(attendeeId: number): Promise<Window[]> {
  if (!isDbReady()) return []
  const rows = await db()`
    select * from availability where attendee_id = ${attendeeId} order by window_start
  `
  return rows as Window[]
}

// A passport has to stay valid for six months past entry. Compare against the
// end of the trip window rather than today — someone booking a year out will
// otherwise look fine now and be turned away at the gate.
export function passportRisk(expiry: string | null, tripEnd: string) {
  if (!expiry) return 'unknown' as const
  const cutoff = new Date(tripEnd)
  cutoff.setMonth(cutoff.getMonth() + PASSPORT_MONTHS_REQUIRED)
  return new Date(expiry) < cutoff ? ('expired' as const) : ('ok' as const)
}

// The workflow called a taxi per arrival. Without voice calls the equivalent is
// to work out who lands close enough together to share the hotel shuttle, and
// hand that manifest over. Anyone within `windowMinutes` of the group's first
// landing rides together.
export function groupShuttles(attendees: Attendee[], windowMinutes = 120) {
  const arriving = attendees
    .filter((a) => a.needs_transfer && a.arrival_at && a.status !== 'out')
    .sort((a, b) => +new Date(a.arrival_at!) - +new Date(b.arrival_at!))

  const runs: { departsAt: Date; riders: Attendee[] }[] = []
  for (const person of arriving) {
    const at = new Date(person.arrival_at!)
    const open = runs[runs.length - 1]
    if (open && at.getTime() - new Date(open.riders[0].arrival_at!).getTime() <= windowMinutes * 60_000) {
      open.riders.push(person)
      // The van leaves when the last of the group is on the ground.
      open.departsAt = at
    } else {
      runs.push({ departsAt: at, riders: [person] })
    }
  }
  return runs
}

export async function listVotes(): Promise<DateVote[]> {
  if (!isDbReady()) return []
  return (await db()`select attendee_id, week_key, vote from date_votes`) as DateVote[]
}

export async function votesFor(attendeeId: number): Promise<DateVote[]> {
  if (!isDbReady()) return []
  return (await db()`
    select attendee_id, week_key, vote from date_votes where attendee_id = ${attendeeId}
  `) as DateVote[]
}
