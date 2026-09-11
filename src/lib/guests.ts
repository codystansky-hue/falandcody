import { db, isDbReady } from './db'
import { WEDDING, real } from './config'

export type Guest = {
  id: number
  edit_token: string
  name: string
  email: string | null
  phone: string | null
  postal_address: string | null
  side: string
  status: string
  attending_events: string[]
  plus_one: boolean
  plus_one_name: string | null
  kids: number
  kids_names: string | null
  dietary: string | null
  song_request: string | null
  message: string | null
  origin_city: string | null
  origin_airport: string | null
  arrival_flight: string | null
  arrival_at: string | null
  departure_flight: string | null
  departure_at: string | null
  needs_transfer: boolean
  flight_cost: number | string | null
  stay_pref: string
  staying_with: string | null
  passport_expiry: string | null
  emergency_contact: string | null
  paid_status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export async function listGuests(): Promise<Guest[]> {
  if (!isDbReady()) return []
  const rows = await db()`
    select * from guests order by
      case status when 'yes' then 0 when 'maybe' then 1 else 2 end,
      name
  `
  return rows as Guest[]
}

export async function getByToken(token: string): Promise<Guest | null> {
  if (!isDbReady() || !token) return null
  const rows = (await db()`select * from guests where edit_token = ${token} limit 1`) as Guest[]
  return rows[0] ?? null
}

/** Organiser-seeded rows that have not yet used the RSVP form. */
export function hasReplied(guest: { status: string }) {
  return guest.status !== 'invited'
}

/** Yes and maybe — the people logistics still has to plan for. */
export function mightAttend(guest: { status: string }) {
  return guest.status === 'yes' || guest.status === 'maybe'
}

/**
 * How many bodies one invitation accounts for: the guest, a plus-one if they
 * are bringing one, and any children. Catering counts heads, not replies.
 */
export function headcount(guest: Guest) {
  if (!mightAttend(guest)) return 0
  return 1 + (guest.plus_one ? 1 : 0) + Math.max(0, guest.kids)
}

/** Heads expected at one event, keyed off WEDDING.events. */
export function headcountFor(guests: Guest[], eventKey: string) {
  return guests
    .filter((g) => mightAttend(g) && g.attending_events.includes(eventKey))
    .reduce((n, g) => n + headcount(g), 0)
}

export function tally(guests: Guest[]) {
  const invited = guests.filter((g) => g.status === 'invited')
  const replied = guests.filter(hasReplied)
  const yes = replied.filter((g) => g.status === 'yes')
  const maybe = replied.filter((g) => g.status === 'maybe')
  const no = replied.filter((g) => g.status === 'no')
  return {
    replied: replied.length,
    invited: invited.length,
    yes: yes.length,
    maybe: maybe.length,
    no: no.length,
    heads: yes.reduce((n, g) => n + headcount(g), 0),
    headsIfMaybes: [...yes, ...maybe].reduce((n, g) => n + headcount(g), 0),
    kids: yes.reduce((n, g) => n + Math.max(0, g.kids), 0),
    inBlock: guests.filter((g) => mightAttend(g) && g.stay_pref === 'block').length,
    needHelp: guests.filter((g) => mightAttend(g) && g.stay_pref === 'help').length,
    flying: guests.filter((g) => mightAttend(g) && g.origin_airport).length,
    booked: guests.filter((g) => g.arrival_at).length,
  }
}

/**
 * Some countries want months of passport validity past the date of entry.
 * Checked against the wedding date rather than today, because someone booking
 * a year out looks fine now and gets turned around at the desk.
 *
 * Returns 'off' when the wedding needs no passport at all.
 */
export function passportRisk(expiry: string | null) {
  const months = WEDDING.travel.passportMonthsRequired
  if (!months) return 'off' as const
  const date = real(WEDDING.date.iso)
  if (!date) return 'unknown' as const
  if (!expiry) return 'unknown' as const
  const cutoff = new Date(date)
  cutoff.setMonth(cutoff.getMonth() + months)
  return new Date(expiry) < cutoff ? ('short' as const) : ('ok' as const)
}

/**
 * Who lands close enough together to share a car. Anyone touching down within
 * `windowMinutes` of the run's first arrival rides with it; the car leaves when
 * the last of them is on the ground.
 */
export function groupTransfers(guests: Guest[], windowMinutes = 120) {
  const arriving = guests
    .filter((g) => g.needs_transfer && g.arrival_at && mightAttend(g))
    .sort((a, b) => +new Date(a.arrival_at!) - +new Date(b.arrival_at!))

  const runs: { departsAt: Date; riders: Guest[] }[] = []
  for (const guest of arriving) {
    const at = new Date(guest.arrival_at!)
    const open = runs[runs.length - 1]
    if (open && at.getTime() - new Date(open.riders[0].arrival_at!).getTime() <= windowMinutes * 60_000) {
      open.riders.push(guest)
      open.departsAt = at
    } else {
      runs.push({ departsAt: at, riders: [guest] })
    }
  }
  return runs
}

/** Seats a run has to carry — riders bring their plus-ones and children. */
export const seats = (riders: Guest[]) => riders.reduce((n, g) => n + headcount(g), 0)
