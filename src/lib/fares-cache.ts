import { db, isDbReady } from './db'
import { cheapestRoundTrip, type GoogleFare } from './googleFlights'
import { AIRPORTS } from './config'

// Google's page is intermittent — about one miss in three on rapid repeats —
// so every success is written to fare_snapshots and a miss falls back to the
// most recent stored price. That turns a flaky source into something the page
// can rely on, at the cost of showing a price that may be a few hours old,
// which is labelled rather than hidden.

export type CachedFare = {
  usd: number
  fetchedAt: string
  stale: boolean
}

const FRESH_HOURS = 6
const MAX_AGE_HOURS = 72

async function readCache(origin: string, depart: string): Promise<CachedFare | null> {
  if (!isDbReady()) return null
  const rows = (await db()`
    select price_usd, fetched_at from fare_snapshots
    where origin = ${origin} and dest = ${AIRPORTS.gateway.iata} and depart_date = ${depart}
    order by fetched_at desc limit 1
  `) as { price_usd: string | number; fetched_at: string }[]
  const row = rows[0]
  if (!row) return null
  const ageHours = (Date.now() - new Date(row.fetched_at).getTime()) / 3_600_000
  if (ageHours > MAX_AGE_HOURS) return null
  return {
    usd: Number(row.price_usd),
    fetchedAt: new Date(row.fetched_at).toISOString(),
    stale: ageHours > FRESH_HOURS,
  }
}

async function writeCache(origin: string, depart: string, fare: GoogleFare) {
  if (!isDbReady()) return
  await db()`
    insert into fare_snapshots (origin, dest, depart_date, price_usd, airline, transfers)
    values (${origin}, ${AIRPORTS.gateway.iata}, ${depart}, ${fare.cheapestUsd}, 'google', null)
  `
}

/** Fresh cache, else live, else whatever is stored however old. */
export async function fareFor(origin: string, depart: string, ret: string): Promise<CachedFare | null> {
  const cached = await readCache(origin, depart)
  if (cached && !cached.stale) return cached

  const live = await cheapestRoundTrip(origin, AIRPORTS.gateway.iata, depart, ret)
  if (live) {
    await writeCache(origin, depart, live)
    return { usd: live.cheapestUsd, fetchedAt: live.fetchedAt, stale: false }
  }
  return cached
}
