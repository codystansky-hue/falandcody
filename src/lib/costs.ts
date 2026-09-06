import { WEDDING } from './config'

// What it costs a guest to come.
//
// Every number here is an ASSUMPTION, not a quote, and the page says so. The
// point is not accuracy — it is that somebody deciding whether they can afford
// the trip gets a number in ten seconds instead of opening six tabs. All of it
// is editable on the page; nothing is stored.

export type Assumptions = {
  nights: number
  /** Per ROOM per night, before tax. */
  roomRate: number
  /** People sharing that room. The single biggest lever on the total. */
  sharing: number
  /** Return, per person, from the airport to the venue. */
  transfer: number
  /** Meals and drinks outside the events you are hosting. */
  foodPerDay: number
  /** What they expect to spend on a gift. Zero it and the line disappears. */
  gift: number
  /** Flights, if they are flying. Prefilled from the live fare when there is one. */
  flight: number
  /** Local tax on lodging, as a percentage. */
  taxPercent: number
  extras: number
}

export const DEFAULTS: Assumptions = {
  nights: 3,
  roomRate: WEDDING.stay.blocks[0]?.fromRate || 200,
  sharing: 2,
  transfer: 0,
  foodPerDay: 60,
  gift: 150,
  flight: 0,
  taxPercent: 0,
  extras: 100,
}

export type Breakdown = {
  lines: { label: string; amount: number; note?: string }[]
  total: number
}

export function estimate(a: Assumptions): Breakdown {
  const bed = (a.roomRate / Math.max(1, a.sharing)) * a.nights * (1 + a.taxPercent / 100)
  const food = a.foodPerDay * a.nights
  const lines = [
    {
      label: 'Bed',
      amount: bed,
      note: `${a.nights} ${a.nights === 1 ? 'night' : 'nights'} at ${money(a.roomRate)} a room, split ${a.sharing} ${a.sharing === 1 ? 'way' : 'ways'}`,
    },
    { label: 'Flights', amount: a.flight, note: 'Return, per person' },
    { label: 'Getting to the venue', amount: a.transfer, note: 'Return transfer' },
    { label: 'Food and drink', amount: food, note: 'Outside the events we are hosting' },
    { label: 'Gift', amount: a.gift },
    { label: 'Everything else', amount: a.extras, note: 'Tips, a taxi, the thing you forgot to pack' },
  ].filter((line) => line.amount > 0)

  return { lines, total: lines.reduce((n, line) => n + line.amount, 0) }
}

export const money = (n: number) =>
  n.toLocaleString(WEDDING.currency.locale, {
    style: 'currency',
    currency: WEDDING.currency.code,
    maximumFractionDigits: 0,
  })
