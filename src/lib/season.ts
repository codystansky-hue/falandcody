// Chicama climatology, month by month.
//
// Not copied off a surf blog: computed from ERA5 reanalysis and the Open-Meteo
// wave archive at the point's own coordinates (−7.84, −79.44), 2021-10 to
// 2025-12, 1,552 valid days. `good` and `firing` are the share of days scoring
// >=58 and >=75 under scoreSwell() in src/lib/swell.ts — the same function that
// scores the live forecast, so the season chart and the forecast page are on
// one scale.
//
// Two honest caveats, worth keeping in mind before treating this as gospel:
//   1. scoreSwell peaks around 1.6 m and tapers above it. That suits a foil
//      trip, where a long-period 4 ft day is a great day. A surf-first score
//      would rank the big-swell months (Aug, Sep) higher than they sit here.
//   2. It is a global wave model sampled at a coastal cell. It cannot see the
//      headland refraction that is the entire reason Chicama works, so read it
//      as relative month-to-month shape, not an absolute forecast.
//
// Regenerate with scripts/season.py if you ever want to extend the record.

export type SeasonMonth = {
  month: string
  /** % of days scoring >=58 */
  good: number
  /** % of days scoring >=75 */
  firing: number
  /** mean sea surface temperature, °C */
  sst: number
  /** mean daily max / min air temperature, °C */
  air: [number, number]
  /** mean max swell height, feet */
  swellFt: number
  /** mean max swell period, seconds */
  periodS: number
  /** mean monthly rainfall, mm */
  rainMm: number
  /** chance a random 7-day window contains 3 or more good days, % */
  weekOdds: number
}

export const SEASON: SeasonMonth[] = [
  { month: 'Jan', good: 69, firing: 12, sst: 19.2, air: [25.0, 19.3], swellFt: 4.1, periodS: 10.7, rainMm: 8.6, weekOdds: 85 },
  { month: 'Feb', good: 73, firing: 12, sst: 23.0, air: [27.0, 21.2], swellFt: 4.2, periodS: 10.8, rainMm: 22.1, weekOdds: 93 },
  { month: 'Mar', good: 85, firing: 24, sst: 22.7, air: [26.9, 21.5], swellFt: 4.6, periodS: 11.6, rainMm: 31.8, weekOdds: 98 },
  { month: 'Apr', good: 84, firing: 27, sst: 21.4, air: [25.6, 20.5], swellFt: 5.2, periodS: 11.5, rainMm: 8.3, weekOdds: 97 },
  { month: 'May', good: 76, firing: 25, sst: 19.2, air: [23.1, 18.4], swellFt: 5.9, periodS: 11.6, rainMm: 2.1, weekOdds: 94 },
  { month: 'Jun', good: 72, firing: 22, sst: 19.2, air: [22.2, 17.5], swellFt: 5.4, periodS: 11.1, rainMm: 0.3, weekOdds: 86 },
  { month: 'Jul', good: 72, firing: 25, sst: 18.5, air: [21.5, 17.0], swellFt: 5.4, periodS: 11.1, rainMm: 0.1, weekOdds: 93 },
  { month: 'Aug', good: 69, firing: 22, sst: 17.9, air: [21.1, 16.6], swellFt: 5.4, periodS: 11.0, rainMm: 0.6, weekOdds: 79 },
  { month: 'Sep', good: 59, firing: 18, sst: 17.3, air: [21.0, 16.3], swellFt: 5.7, periodS: 10.4, rainMm: 0.6, weekOdds: 79 },
  { month: 'Oct', good: 77, firing: 28, sst: 16.8, air: [21.0, 16.2], swellFt: 5.0, periodS: 11.3, rainMm: 8.9, weekOdds: 100 },
  { month: 'Nov', good: 78, firing: 17, sst: 17.3, air: [21.8, 16.7], swellFt: 4.9, periodS: 11.1, rainMm: 2.4, weekOdds: 96 },
  { month: 'Dec', good: 61, firing: 8, sst: 17.8, air: [23.2, 17.9], swellFt: 3.9, periodS: 10.4, rainMm: 6.7, weekOdds: 86 },
]

// Ten-day blocks across the window under consideration, same source.
export const WINDOW_BLOCKS = [
  { label: 'Oct 1–10', good: 76, firing: 32, periodS: 11.5, swellFt: 5.1, sst: 16.8 },
  { label: 'Oct 11–20', good: 74, firing: 26, periodS: 10.8, swellFt: 5.1, sst: 16.6 },
  { label: 'Oct 21–31', good: 80, firing: 26, periodS: 11.6, swellFt: 4.9, sst: 16.9 },
  { label: 'Nov 1–10', good: 84, firing: 18, periodS: 11.2, swellFt: 5.1, sst: 17.1 },
  { label: 'Nov 11–20', good: 72, firing: 16, periodS: 10.9, swellFt: 4.9, sst: 17.3 },
  { label: 'Nov 21–30', good: 78, firing: 16, periodS: 11.3, swellFt: 4.6, sst: 17.4 },
  { label: 'Dec 1–10', good: 62, firing: 10, periodS: 10.6, swellFt: 4.1, sst: 17.4 },
  { label: 'Dec 11–15', good: 64, firing: 8, periodS: 10.7, swellFt: 3.8, sst: 17.8 },
]

// The Humboldt current keeps this water cold all year, and October is the
// coldest month of the twelve. Nobody should turn up with boardshorts.
export function wetsuitFor(sst: number) {
  if (sst < 17) return '4/3 full suit, or a 3/2 with boots'
  if (sst < 19) return '3/2 full suit'
  if (sst < 22) return '2 mm shorty or a spring suit'
  return 'Boardshorts weather'
}

export const CLIMATE_SOURCE =
  'ERA5 reanalysis and Open-Meteo wave archive at −7.84, −79.44 · 2021–2025 · 1,552 days'
