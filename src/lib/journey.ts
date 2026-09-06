import airports from './airports.json'
import { AIRPORTS, WEDDING } from './config'

// How long it actually takes a guest to get from their home airport to the
// venue door, computed rather than guessed. Everything here is arithmetic on
// real airport coordinates (OurAirports, public domain) plus a few stated
// assumptions about connections, so it degrades to "roughly right" rather than
// to nothing.
//
// This file is SERVER ONLY — the airport table is ~300 KB and has no business
// in a browser bundle. The form reaches it through /api/journey instead.

type Row = { i: string; n: string; c: string; k: string; y: number; x: number; b: boolean }
const TABLE = airports as unknown as Record<string, Row>

export type Airport = {
  iata: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
}

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
    // strip on the way to a wedding.
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

// Used only when the config gives no explicit nonstop list. Beyond this,
// assume a connection; short of it, direct service is the common case.
const NONSTOP_RANGE_KM = 4000
const CONNECTION_HOURS = 2
// A change of airline or terminal, and often a bag recheck, at the gateway.
const GATEWAY_CONNECTION_HOURS = 2.5

export type Journey = {
  origin: Airport
  /** The long leg: to the gateway when there is one, otherwise straight in. */
  main: { to: string; km: number; airborneHours: number; nonstop: boolean }
  /** The gateway → arrival hop. Null when guests fly straight in. */
  hop: { to: string; km: number; airborneHours: number } | null
  road: { km: number; hours: number }
  /** Door to door: flights, connections and the drive to the venue. */
  totalHours: number
  stops: number
  summary: string
}

export function journeyFor(originCode: string): Journey | null {
  const origin = lookup(originCode)
  if (!origin) return null

  const arrival = lookup(AIRPORTS.arrival.iata)
  if (!arrival) return null
  const gateway = AIRPORTS.gateway ? lookup(AIRPORTS.gateway.iata) : null

  // The long haul ends at the gateway when there is one; otherwise it is the
  // whole flight.
  const mainTarget = gateway ?? arrival
  const mainKm = distanceKm(origin, mainTarget)
  // When the couple have listed the nonstop routes, that list is the whole
  // truth — a small regional airport an hour away is not served nonstop just
  // because it is close, and the distance heuristic would happily claim it is.
  // Only fall back to distance when nobody has said.
  const nonstop = WEDDING.travel.nonstopFrom.length
    ? WEDDING.travel.nonstopFrom.includes(origin.iata)
    : mainKm <= NONSTOP_RANGE_KM
  const mainAir = airborneHours(mainKm)

  const hopKm = gateway ? distanceKm(gateway, arrival) : 0
  const hopAir = gateway ? airborneHours(hopKm) : 0

  const stops = (nonstop ? 0 : 1) + (gateway ? 1 : 0)
  const totalHours =
    mainAir +
    (nonstop ? 0 : CONNECTION_HOURS) +
    (gateway ? GATEWAY_CONNECTION_HOURS + hopAir : 0) +
    WEDDING.travel.transferHours

  const tail = gateway
    ? `, then the hop to ${arrival.iata} and the drive to the venue`
    : ', then the drive to the venue'

  return {
    origin,
    main: { to: mainTarget.iata, km: Math.round(mainKm), airborneHours: mainAir, nonstop },
    hop: gateway ? { to: arrival.iata, km: Math.round(hopKm), airborneHours: hopAir } : null,
    road: { km: WEDDING.travel.transferKm, hours: WEDDING.travel.transferHours },
    totalHours,
    stops,
    summary: nonstop
      ? `${origin.iata} → ${mainTarget.iata} nonstop${tail}.`
      : `${origin.iata} → ${mainTarget.iata} via one hub${tail}.`,
  }
}

export function hoursLabel(hours: number) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`
}
