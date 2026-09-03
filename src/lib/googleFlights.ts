// Live round-trip fares from Google Flights, with no API key and no account.
//
// Google Flights encodes a search into the `?tfs=` query parameter as a
// base64url Protobuf. Building that payload is the whole trick — the URL is
// then the ordinary user-facing page, and the prices are in it.
//
// The schema is small enough to hand-encode, so this pulls in no protobuf
// dependency. Field numbers are from the reverse-engineered schema published by
// AWeirdDev/flights (MIT), which is the reference implementation for this:
//
//   Airport    { string airport = 2 }
//   FlightData { date = 2, max_stops = 5, from_airport = 13, to_airport = 14 }
//   Info       { data = 3 (repeated), passengers = 8 (repeated), seat = 9,
//                trip = 19 }
//
// Read the honest caveats before relying on this:
//
//   * It is not a supported API. Google can change the page or the payload
//     whenever it likes and this stops working with no warning. Every caller
//     must handle null, and the site must stay useful without it — which it
//     does, because the search buttons and the journey model do not depend on
//     this at all.
//   * It parses prices out of rendered HTML, pinned to hl=en&curr=USD so the
//     wording and the currency symbol stay predictable.
//   * Requests are cached for six hours and made one per origin per week, so
//     the whole crew costs a couple of dozen requests a day at most. Do not
//     turn this into a crawler.

export type GoogleFare = {
  cheapestUsd: number
  offers: number
  fetchedAt: string
}

const varint = (value: number) => {
  const out: number[] = []
  let n = value
  while (n > 127) {
    out.push((n & 0x7f) | 0x80)
    n >>>= 7
  }
  out.push(n)
  return Uint8Array.from(out)
}

const concat = (parts: Uint8Array[]) => {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

const key = (field: number, wire: number) => varint((field << 3) | wire)
const lenDelim = (field: number, body: Uint8Array) =>
  concat([key(field, 2), varint(body.length), body])
const str = (field: number, value: string) => lenDelim(field, new TextEncoder().encode(value))
const vint = (field: number, value: number) => concat([key(field, 0), varint(value)])

const airport = (code: string) => str(2, code.toUpperCase())

function flightData(slice: { date: string; from: string; to: string; maxStops?: number }) {
  const parts = [str(2, slice.date)]
  if (slice.maxStops != null) parts.push(vint(5, slice.maxStops))
  parts.push(lenDelim(13, airport(slice.from)))
  parts.push(lenDelim(14, airport(slice.to)))
  return concat(parts)
}

const SEAT_ECONOMY = 1
const PASSENGER_ADULT = 1
const TRIP_ROUND = 1

function base64url(bytes: Uint8Array) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_')
}

/** The `tfs` value for a round trip. Exported so it can be tested directly. */
export function buildTfs(from: string, to: string, depart: string, ret: string) {
  const slices = [
    { date: depart, from, to },
    { date: ret, from: to, to: from },
  ]
  const info = concat([
    ...slices.map((s) => lenDelim(3, flightData(s))),
    vint(8, PASSENGER_ADULT),
    vint(9, SEAT_ECONOMY),
    vint(19, TRIP_ROUND),
  ])
  return base64url(info)
}

export function searchUrl(from: string, to: string, depart: string, ret: string) {
  return `https://www.google.com/travel/flights?tfs=${encodeURIComponent(
    buildTfs(from, to, depart, ret),
  )}&hl=en&curr=USD`
}

// Prices come out of the accessibility labels rather than the visual markup —
// "1147 US dollars" is far more stable than whatever obfuscated class name
// wraps it this month, and it is unambiguous about currency.
const PRICE_LABEL = /aria-label="(\d[\d,]{1,7}) US dollars"/g

// Google serves a usable page most of the time and a stripped one the rest —
// measured at roughly one miss in three on rapid repeats. That is throttling,
// not an error, so one retry recovers most of it and the caller still has to
// treat null as ordinary.
export async function cheapestRoundTrip(
  from: string,
  to: string,
  depart: string,
  ret: string,
  attempt = 0,
): Promise<GoogleFare | null> {
  const result = await fetchOnce(from, to, depart, ret)
  if (result || attempt >= 1) return result
  await new Promise((r) => setTimeout(r, 700))
  return cheapestRoundTrip(from, to, depart, ret, attempt + 1)
}

async function fetchOnce(
  from: string,
  to: string,
  depart: string,
  ret: string,
): Promise<GoogleFare | null> {
  try {
    const res = await fetch(searchUrl(from, to, depart, ret), {
      headers: {
        // Google serves a stripped page to anything that looks automated.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      // Six hours. Fares do not move fast enough to justify more, and this
      // keeps the request count to something defensible.
      next: { revalidate: 21600 },
    })
    if (!res.ok) return null

    const html = await res.text()
    if (/consent\.google\.com|Before you continue/i.test(html)) return null

    const prices = [...html.matchAll(PRICE_LABEL)]
      .map((m) => Number(m[1].replace(/,/g, '')))
      .filter((n) => Number.isFinite(n) && n > 0)

    if (prices.length === 0) return null
    return {
      cheapestUsd: Math.min(...prices),
      offers: new Set(prices).size,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}
