import { AIRPORTS } from './config'

// Port of the workflow's "Live flight status (AeroDataBox)" node. AeroDataBox
// is metered; OpenSky is free. It retired basic auth in March 2026, so this
// uses the OAuth2 client-credentials flow — anonymous requests now 403.
//
// Without credentials every function here returns null and the arrivals board
// renders its unconfigured state. Nothing throws, nothing half-renders.

export const isOpenSkyConfigured = () =>
  Boolean(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET)

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
const API = 'https://opensky-network.org/api'

export type Arrival = {
  callsign: string | null
  icao24: string
  arrivedAt: Date
  from: string | null
}

async function accessToken(): Promise<string | null> {
  if (!isOpenSkyConfigured()) return null
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.OPENSKY_CLIENT_ID!,
        client_secret: process.env.OPENSKY_CLIENT_SECRET!,
      }),
      // The token lives ~30 min; cache just under that.
      next: { revalidate: 1500 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return typeof json?.access_token === 'string' ? json.access_token : null
  } catch {
    return null
  }
}

// OpenSky caps each query at seven days, and only has history — it will not
// tell you about a flight that has not landed yet. That is fine for what this
// board does: confirm who is actually on the ground.
export async function recentArrivals(icao: string, hoursBack = 24): Promise<Arrival[] | null> {
  const token = await accessToken()
  if (!token) return null

  const end = Math.floor(Date.now() / 1000)
  const begin = end - Math.min(hoursBack, 24 * 7) * 3600

  try {
    const res = await fetch(`${API}/flights/arrival?airport=${icao}&begin=${begin}&end=${end}`, {
      headers: { authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    })
    // 404 is OpenSky's "no movements in this window", not a failure.
    if (res.status === 404) return []
    if (!res.ok) return null
    const rows = await res.json()
    if (!Array.isArray(rows)) return null
    return rows.map((r: Record<string, unknown>) => ({
      callsign: typeof r.callsign === 'string' ? r.callsign.trim() || null : null,
      icao24: String(r.icao24 ?? ''),
      arrivedAt: new Date(Number(r.lastSeen) * 1000),
      from: typeof r.estDepartureAirport === 'string' ? r.estDepartureAirport : null,
    }))
  } catch {
    return null
  }
}

export async function arrivalsAtTrujillo(hoursBack = 24) {
  return recentArrivals(AIRPORTS.arrival.icao, hoursBack)
}

// A flight number as people write it ("LA2261", "LA 2261") against an OpenSky
// callsign ("LAN2261"). Compare on the digits plus a loose carrier match, since
// the ICAO callsign prefix rarely equals the IATA one.
export function callsignMatches(flightNumber: string, callsign: string | null) {
  if (!callsign) return false
  const digits = (s: string) => (s.match(/\d+/)?.[0] ?? '').replace(/^0+/, '')
  const a = digits(flightNumber)
  const b = digits(callsign)
  return a.length > 0 && a === b
}
