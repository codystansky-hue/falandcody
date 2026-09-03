import { AIRPORTS } from './config'

// Port of the workflow's "Apify Flights" + "Pick cheapest" nodes. Apify's
// scrapers are metered per run; Amadeus Self-Service — the obvious free
// alternative — was decommissioned on 2026-07-17. Travelpayouts' Aviasales
// Data API is what is left that is genuinely free: cached cheapest fares per
// route, refreshed from real Aviasales searches.
//
// Without a token every function returns null and /flights renders its
// unconfigured state.

export const isFaresConfigured = () => Boolean(process.env.TRAVELPAYOUTS_TOKEN)

const API = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates'

export type Fare = {
  origin: string
  destination: string
  priceUsd: number
  airline: string | null
  transfers: number | null
  departureAt: string | null
  returnAt: string | null
  link: string | null
}

// One call per origin. The crew is a dozen guys from a handful of cities, so
// this is a handful of requests against a 300 rpm limit — no batching needed.
export async function cheapestFrom(
  origin: string,
  opts: { departureMonth?: string; destination?: string } = {},
): Promise<Fare[] | null> {
  const token = process.env.TRAVELPAYOUTS_TOKEN
  if (!token) return null

  const destination = opts.destination ?? AIRPORTS.gateway.iata
  const params = new URLSearchParams({
    origin: origin.toUpperCase(),
    destination,
    currency: 'usd',
    sorting: 'price',
    direct: 'false',
    limit: '5',
    one_way: 'false',
    token,
  })
  // Travelpayouts takes YYYY-MM to mean "any day that month".
  if (opts.departureMonth) params.set('departure_at', opts.departureMonth)

  try {
    const res = await fetch(`${API}?${params}`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const json = await res.json()
    if (!Array.isArray(json?.data)) return null

    return json.data
      .map((row: Record<string, unknown>) => ({
        origin: String(row.origin ?? origin).toUpperCase(),
        destination: String(row.destination ?? destination).toUpperCase(),
        priceUsd: Number(row.price),
        airline: typeof row.airline === 'string' ? row.airline : null,
        transfers: typeof row.transfers === 'number' ? row.transfers : null,
        departureAt: typeof row.departure_at === 'string' ? row.departure_at : null,
        returnAt: typeof row.return_at === 'string' ? row.return_at : null,
        link: typeof row.link === 'string' ? `https://www.aviasales.com${row.link}` : null,
      }))
      .filter((f: Fare) => Number.isFinite(f.priceUsd))
  } catch {
    return null
  }
}
