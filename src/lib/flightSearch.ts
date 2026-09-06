import { AIRPORTS } from './config'

// Zero-friction flight search: hand the airport code and the dates straight to
// a real search engine as a prefilled URL. No key, no account, no cached-fare
// API — one click and the guest is looking at live prices for their own route,
// on the right dates, without having typed a thing.
//
// Deliberately separate from src/lib/fares.ts and googleFlights.ts, which
// produce a number. This always works and is what the page leads with.

export type SearchLink = { name: string; url: string }

const pad = (n: number) => String(n).padStart(2, '0')

/** Skyscanner wants yymmdd. */
function short(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${y.slice(2)}${pad(Number(m))}${pad(Number(d))}`
}

export function searchLinks(origin: string, depart: string, ret: string, dest: string): SearchLink[] {
  const o = origin.toUpperCase()
  const d = dest.toUpperCase()
  return [
    {
      name: 'Google Flights',
      url:
        'https://www.google.com/travel/flights?q=' +
        encodeURIComponent(`Flights from ${o} to ${d} on ${depart} through ${ret}`),
    },
    { name: 'Kayak', url: `https://www.kayak.com/flights/${o}-${d}/${depart}/${ret}?sort=bestflight_a` },
    {
      name: 'Skyscanner',
      url: `https://www.skyscanner.net/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${short(depart)}/${short(ret)}/`,
    },
  ]
}

export type RouteOption = { key: string; label: string; note: string; links: SearchLink[] }

/**
 * The ways in. When the venue sits behind a gateway hub there are two, and
 * guests who have never made the trip rarely know the second one exists:
 *
 *   through — one booking all the way in, the connection handled for you
 *   split   — the long leg bought separately from the final hop, which is
 *             often cheaper but puts the missed-connection risk on you
 */
export function routeOptions(origin: string, depart: string, ret: string): RouteOption[] {
  const o = origin.toUpperCase()
  const arrival = AIRPORTS.arrival.iata
  const gateway = AIRPORTS.gateway

  const through: RouteOption = {
    key: 'through',
    label: `${o} → ${arrival}`,
    note: gateway
      ? 'One booking, connection included. Simplest, and the airline owns the connection.'
      : 'One booking, straight in.',
    links: searchLinks(o, depart, ret, arrival),
  }

  if (!gateway) return [through]

  return [
    through,
    {
      key: 'gateway',
      label: `${o} → ${gateway.iata}`,
      note: 'The long leg only. Often cheaper, but you own the connection.',
      links: searchLinks(o, depart, ret, gateway.iata),
    },
    {
      key: 'hop',
      label: `${gateway.iata} → ${arrival}`,
      note: `The hop from ${gateway.city}, bought separately.`,
      links: searchLinks(gateway.iata, depart, ret, arrival),
    },
  ]
}
