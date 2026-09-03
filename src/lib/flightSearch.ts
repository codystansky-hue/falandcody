import { AIRPORTS } from './config'

// Zero-friction flight search: hand the airport code and the dates straight to
// a real search engine as a prefilled URL. No key, no account, no cached-fare
// API — one click and you are looking at live prices for your own route.
//
// This is deliberately separate from src/lib/fares.ts. That one needs a
// Travelpayouts token and shows indicative cached prices; this one always
// works and is what the page leads with.

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

/**
 * Two ways to get there, and people who have not been to Peru rarely know the
 * second one exists:
 *   through — one booking all the way to Trujillo, the connection handled for you
 *   split   — international to Lima, then the LIM–TRU hop bought separately,
 *             which is often cheaper but puts the missed-connection risk on you
 */
export function routeOptions(origin: string, depart: string, ret: string) {
  return {
    through: {
      label: `${origin.toUpperCase()} → ${AIRPORTS.arrival.iata}`,
      note: 'One booking, connection included. Simplest, and the airline owns the connection.',
      links: searchLinks(origin, depart, ret, AIRPORTS.arrival.iata),
    },
    toLima: {
      label: `${origin.toUpperCase()} → ${AIRPORTS.gateway.iata}`,
      note: 'International leg only. Often cheaper, but you own the connection.',
      links: searchLinks(origin, depart, ret, AIRPORTS.gateway.iata),
    },
    limaHop: {
      label: `${AIRPORTS.gateway.iata} → ${AIRPORTS.arrival.iata}`,
      note: 'The domestic hop, about an hour. LATAM and Sky both fly it several times a day.',
      links: searchLinks(AIRPORTS.gateway.iata, depart, ret, AIRPORTS.arrival.iata),
    },
  }
}
