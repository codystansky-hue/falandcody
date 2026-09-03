import { db, isDbReady } from './db'
import { cheapestRoundTrip } from './googleFlights'
import { cheapestFrom, isFaresConfigured } from './fares'
import { AIRPORTS } from './config'

// Google's page is intermittent — about one miss in three on rapid repeats —
// so every success is written to fare_snapshots, and a miss falls back to the
// most recent stored price. That turns a flaky source into something the pages
// can rely on, at the cost of occasionally showing a price a few hours old,
// which is labelled rather than hidden.
//
// Request volume is deliberately shaped:
//   cachedFare  — reads only, never calls out. Used by the week comparison,
//                 which would otherwise fire origins × weeks requests on every
//                 page view.
//   fareFor     — read-through with a live fetch. Used by one person looking at
//                 their own journey, so at most three requests, and it warms the
//                 cache for everyone else's comparison table.

export type CachedFare = {
  usd: number
  fetchedAt: string
  stale: boolean
  source: string
}

const FRESH_HOURS = 6
const MAX_AGE_HOURS = 24 * 7

type Row = { price_usd: string | number; fetched_at: string; airline: string | null }

function shape(row: Row | undefined): CachedFare | null {
  if (!row) return null
  const ageHours = (Date.now() - new Date(row.fetched_at).getTime()) / 3_600_000
  if (ageHours > MAX_AGE_HOURS) return null
  return {
    usd: Number(row.price_usd),
    fetchedAt: new Date(row.fetched_at).toISOString(),
    stale: ageHours > FRESH_HOURS,
    source: row.airline ?? 'google',
  }
}

export async function cachedFare(origin: string, depart: string): Promise<CachedFare | null> {
  if (!isDbReady()) return null
  const rows = (await db()`
    select price_usd, fetched_at, airline from fare_snapshots
    where origin = ${origin} and dest = ${AIRPORTS.gateway.iata} and depart_date = ${depart}
    order by fetched_at desc limit 1
  `) as Row[]
  return shape(rows[0])
}

async function store(origin: string, depart: string, usd: number, source: string) {
  if (!isDbReady()) return
  await db()`
    insert into fare_snapshots (origin, dest, depart_date, price_usd, airline, transfers)
    values (${origin}, ${AIRPORTS.gateway.iata}, ${depart}, ${usd}, ${source}, null)
  `
}

/** Fresh cache, else live Google, else Travelpayouts if configured, else stale. */
export async function fareFor(
  origin: string,
  depart: string,
  ret: string,
): Promise<CachedFare | null> {
  const cached = await cachedFare(origin, depart)
  if (cached && !cached.stale) return cached

  const live = await cheapestRoundTrip(origin, AIRPORTS.gateway.iata, depart, ret)
  if (live) {
    await store(origin, depart, live.cheapestUsd, 'google')
    return { usd: live.cheapestUsd, fetchedAt: live.fetchedAt, stale: false, source: 'google' }
  }

  // Optional second source. Costs nothing to try when the token happens to be
  // set, and covers routes where Google keeps stonewalling.
  if (isFaresConfigured()) {
    const fares = await cheapestFrom(origin, {
      departureMonth: depart.slice(0, 7),
      destination: AIRPORTS.gateway.iata,
    })
    if (fares?.length) {
      const best = fares.reduce((a, b) => (b.priceUsd < a.priceUsd ? b : a)).priceUsd
      await store(origin, depart, best, 'travelpayouts')
      return {
        usd: best,
        fetchedAt: new Date().toISOString(),
        stale: false,
        source: 'travelpayouts',
      }
    }
  }

  return cached
}

/** Warms the cache for every origin across every week. Organiser action. */
export async function warmAll(origins: string[], weeks: { start: string; end: string }[]) {
  const results: { origin: string; depart: string; usd: number | null }[] = []
  for (const origin of origins) {
    for (const week of weeks) {
      const fare = await fareFor(origin, week.start, week.end)
      results.push({ origin, depart: week.start, usd: fare?.usd ?? null })
    }
  }
  return results
}
