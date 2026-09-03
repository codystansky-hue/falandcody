import airports from './airports.json'
import { AIRPORTS, TRIP } from './config'

// How long it actually takes to get from someone's home airport to the point,
// computed rather than guessed. Everything here is arithmetic on real airport
// coordinates (OurAirports, public domain) plus a few stated assumptions about
// connections, so it degrades to "roughly right" rather than to nothing.
//
// This file is SERVER ONLY — the airport table is ~300 KB and has no business
// in a browser bundle. The form reaches it through /api/journey instead.

type Row = { i: string; n: string; c: string; k: string; y: number; x: number; b: boolean }
const TABLE = airports as unknown as Record<string, Row>

export type Airport = { iata: string; name: string; city: string; country: string; lat: number; lon: number }

export function lookup(code: string): Airport | null {
  const row = TABLE[code.toUpperCase().trim()]
  if (!row) return null
  return { iata: row.i, name: row.n, city: row.c, country: row.k, lat: row.y, lon: row.x }
}

export function suggest(query: string, limit = 6): Airport[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const hits: { row: Row; rank: number }[] = []
  for (const row of Object.values(TABLE)) {
    const iata = row.i.toLowerCase()
    const city = row.c.toLowerCase()
    let rank = -1
    if (iata === q) rank = 0
    else if (city === q) rank = 1
    else if (city.startsWith(q)) rank = 2
    else if (row.n.toLowerCase().includes(q)) rank = 3
    if (rank < 0) continue
    // Big airports first within a rank — nobody connects through a regional
    // strip on the way to Peru.
    hits.push({ row, rank: rank * 2 + (row.b ? 0 : 1) })
  }
  hits.sort((a, b) => a.rank - b.rank || a.row.i.localeCompare(b.row.i))
  return hits.slice(0, limit).map(({ row }) => ({
    iata: row.i,
    name: row.n,
    city: row.c,
    country: row.k,
    lat: row.y,
    lon: row.x,
  }))
}

/** Great-circle distance in km. */
export function distanceKm(a: Airport, b: Airport) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Cruise ~800 km/h, plus half an hour of taxi, climb and descent that no
// amount of distance accounts for.
const airborneHours = (km: number) => km / 800 + 0.5

// Cities I am confident hold a nonstop to Lima. Deliberately short: a wrong
// "direct" claim sends someone hunting for a flight that does not exist, so
// anything not on this list is described as connecting, which is the safe error.
const LIMA_NONSTOP = new Set([
  'MIA', 'JFK', 'LAX', 'IAH', 'DFW', 'ATL', 'MCO', 'YYZ',
  'MEX', 'PTY', 'BOG', 'SCL', 'EZE', 'GRU', 'GIG', 'MAD', 'AMS', 'CDG',
])

// Immigration and a domestic recheck in Lima. Through-ticketed connections can
// legally be shorter, but this is what to plan a day around.
const LIMA_CONNECTION_HOURS = 2.5
// Nobody flies origin → hub → LIM in zero time.
const HUB_CONNECTION_HOURS = 2

export type Journey = {
  origin: Airport
  lima: { km: number; airborneHours: number; nonstop: boolean }
  hop: { km: number; airborneHours: number }
  road: { km: number; hours: number }
  /** Door to door: flights, connections and the drive up the coast. */
  totalHours: number
  stops: number
  summary: string
}

export function journeyFor(originCode: string): Journey | null {
  const origin = lookup(originCode)
  if (!origin) return null
  const lima = lookup(AIRPORTS.gateway.iata)
  const tru = lookup(AIRPORTS.arrival.iata)
  if (!lima || !tru) return null

  const toLimaKm = distanceKm(origin, lima)
  const hopKm = distanceKm(lima, tru)
  const nonstop = LIMA_NONSTOP.has(origin.iata)

  const intlAir = airborneHours(toLimaKm)
  const hopAir = airborneHours(hopKm)

  const stops = (nonstop ? 0 : 1) + 1 // the Lima→Trujillo hop always counts
  const total =
    intlAir +
    (nonstop ? 0 : HUB_CONNECTION_HOURS) +
    LIMA_CONNECTION_HOURS +
    hopAir +
    TRIP.venue.transferHours

  return {
    origin,
    lima: { km: Math.round(toLimaKm), airborneHours: intlAir, nonstop },
    hop: { km: Math.round(hopKm), airborneHours: hopAir },
    road: { km: TRIP.venue.transferKm, hours: TRIP.venue.transferHours },
    totalHours: total,
    stops,
    summary: nonstop
      ? `${origin.iata} → LIM nonstop, then the hop to TRU and the drive up the coast.`
      : `${origin.iata} → LIM via one hub, then the hop to TRU and the drive up the coast.`,
  }
}

export function hoursLabel(hours: number) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`
}
