// What the trip costs, and who owes what.
//
// Every number here is an ASSUMPTION, not a quote. The hotel prices
// dynamically — its own room pages say "enter your dates to check the correct
// rate" — and the published figures are "from" rates while Priceline has shown
// $204 for the same property. So these are seeds the organiser can edit on
// /budget, and the page says so rather than pretending to be an invoice.

export type RoomKey = 'garden' | 'ocean' | 'premium'

export type Assumptions = {
  nights: number
  /** Per ROOM per night, USD, breakfast included. */
  roomRates: Record<RoomKey, number>
  /** People per room. Triples exist and are the single biggest lever on cost. */
  occupancy: number
  /** Round trip Trujillo → hotel, per person, sharing a van. */
  transferUsd: number
  /** Lunch, dinner and drinks per day. Breakfast is in the room rate. */
  foodPerDayUsd: number
  /** Board and foil hire per day, for whoever is not bringing their own. */
  rentalPerDayUsd: number
  /** Tow-in sessions each person wants across the week. */
  towSessions: number
  /**
   * Price of ONE private boat session. Foilers cannot use the cheap shared
   * boat — the hotel excludes them for safety — so this is the only option,
   * and it splits between at most two foilers.
   */
  towSessionUsd: number
  /** Foilers per private boat. The hotel's own limit is 2. */
  foilersPerBoat: number
  /** Tips and incidentals. Not the tow-in, which is now its own line. */
  extrasUsd: number
  /** Whether to model the 18% IGV that foreign tourists can be exempt from. */
  payingIgv: boolean
}

export const DEFAULTS: Assumptions = {
  nights: 7,
  roomRates: { garden: 150, ocean: 160, premium: 180 },
  occupancy: 2,
  transferUsd: 90,
  foodPerDayUsd: 45,
  rentalPerDayUsd: 55,
  towSessions: 3,
  // Low season, which is what November and December are.
  towSessionUsd: 200,
  foilersPerBoat: 2,
  extrasUsd: 120,
  payingIgv: false,
}

// Peru zero-rates IGV on lodging and food for non-resident foreigners staying
// 60 days or less — but only against a passport showing the entry stamp, or the
// digital TAM record from the Migraciones portal. It is not automatic: some
// hotels apply it on sight of the passport, others want the TAM. Worth 18% of
// the largest line in this budget, so it is modelled explicitly rather than
// quietly assumed.
export const IGV_RATE = 0.18

export type PersonCost = {
  name: string
  room: number
  transfer: number
  food: number
  rental: number
  tow: number
  extras: number
  flight: number | null
  /** True when `flight` is a live fare estimate rather than what they paid. */
  flightEstimated: boolean
  /** Everything except the flight, which many people will not have booked yet. */
  onTheGround: number
  total: number | null
  paid: string
}

export function costFor(
  person: {
    name: string
    room_pref: string | null
    bringing_gear: string[]
    needs_transfer: boolean
    flight_cost_usd: number | string | null
    foil_level?: string | null
    paid_status: string
    /** Cheapest live fare for their origin, used until they book. */
    flight_estimate_usd?: number | null
  },
  a: Assumptions,
): PersonCost {
  const roomKey: RoomKey =
    person.room_pref === 'garden' || person.room_pref === 'ocean' || person.room_pref === 'premium'
      ? person.room_pref
      : 'garden'

  const nightly = a.roomRates[roomKey] / Math.max(1, a.occupancy)
  const room = nightly * a.nights * (a.payingIgv ? 1 + IGV_RATE : 1)
  const food = a.foodPerDayUsd * a.nights * (a.payingIgv ? 1 + IGV_RATE : 1)

  // Anyone bringing a board and a foil is not hiring one.
  const hasOwn = person.bringing_gear.includes('board') && person.bringing_gear.includes('foil')
  const rental = hasOwn ? 0 : a.rentalPerDayUsd * a.nights

  const transfer = person.needs_transfer ? a.transferUsd : 0

  // A private boat split between the maximum number of foilers it will carry.
  // Anyone who has never foiled is not booking tow-ins.
  const tows = person.foil_level === 'never' ? 0 : a.towSessions
  const tow = (tows * a.towSessionUsd) / Math.max(1, a.foilersPerBoat)
  const booked =
    person.flight_cost_usd == null || person.flight_cost_usd === ''
      ? null
      : Number(person.flight_cost_usd)
  // Fall back to the live fare so the budget is useful before anyone books —
  // marked as an estimate rather than passed off as a real cost.
  const estimate = person.flight_estimate_usd ?? null
  const flight = booked ?? estimate
  const flightEstimated = booked == null && estimate != null

  const onTheGround = room + transfer + food + rental + tow + a.extrasUsd

  return {
    name: person.name,
    room,
    transfer,
    food,
    rental,
    tow,
    extras: a.extrasUsd,
    flight: Number.isFinite(flight as number) ? (flight as number) : null,
    flightEstimated,
    onTheGround,
    total: flight == null ? null : onTheGround + flight,
    paid: person.paid_status,
  }
}

export const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
