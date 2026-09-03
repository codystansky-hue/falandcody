import { SPOT } from './config'

// Port of the workflow's "Surfline Wave" / "Surfline Wind" / "Evaluate swell"
// nodes. Surfline is replaced by Open-Meteo, which needs no key and no relay:
//   marine-api → swell height, period, direction
//   forecast   → wind speed and direction
// Both are free, unauthenticated, and CORS-open.

export type SwellDay = {
  day: string
  swellM: number | null
  periodS: number | null
  dirDeg: number | null
  windKmh: number | null
  windDirDeg: number | null
  score: number
  verdict: Verdict
}

export type Verdict = 'firing' | 'good' | 'fun' | 'flat'

// Chicama is a left-hand point that wraps a headland into a north-facing bay.
// Long-period south-southwest groundswell is what lights it up; the shoreline
// faces roughly NNW, which puts offshore wind at about 150° (SSE).
const IDEAL_SWELL_DIR = [190, 235] as const
const OFFSHORE_DIR = 150
const OFFSHORE_TOLERANCE = 65

function angleDelta(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// 0–100. Period carries the most weight: Chicama will run on a modest swell if
// the period is long enough, and stays gutless on a big short-period wind swell.
export function scoreSwell(d: {
  swellM: number | null
  periodS: number | null
  dirDeg: number | null
  windKmh: number | null
  windDirDeg: number | null
}) {
  const { swellM, periodS, dirDeg, windKmh, windDirDeg } = d
  if (swellM == null || periodS == null) return 0

  // Period, 0–40.
  const period = Math.max(0, Math.min(1, (periodS - 8) / 8)) * 40

  // Size, 0–25. Peaks around 1.6 m and tapers rather than cliffs, because a big
  // day at Chicama is still a good day, just a longer paddle.
  const size = Math.max(0, 1 - Math.abs(swellM - 1.6) / 1.6) * 25

  // Direction, 0–20.
  let direction = 10
  if (dirDeg != null) {
    const [lo, hi] = IDEAL_SWELL_DIR
    const off = dirDeg < lo ? lo - dirDeg : dirDeg > hi ? dirDeg - hi : 0
    direction = Math.max(0, 1 - off / 60) * 20
  }

  // Wind, 0–15. Light is forgiven whatever the direction; strong onshore is not.
  let wind = 8
  if (windKmh != null && windDirDeg != null) {
    const offshoreness = Math.max(0, 1 - angleDelta(windDirDeg, OFFSHORE_DIR) / (OFFSHORE_TOLERANCE * 2))
    const calm = Math.max(0, 1 - windKmh / 35)
    wind = (offshoreness * 0.6 + calm * 0.4) * 15
  }

  return Math.round(period + size + direction + wind)
}

export function verdictFor(score: number): Verdict {
  if (score >= 75) return 'firing'
  if (score >= 58) return 'good'
  if (score >= 40) return 'fun'
  return 'flat'
}

const MARINE = 'https://marine-api.open-meteo.com/v1/marine'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// Cached for an hour by the Next data cache. With no push channel there is
// nothing to schedule — the forecast refreshes on the first visit after it
// goes stale, which is exactly as fresh as anyone needs it.
export async function getForecast(days = 7): Promise<SwellDay[]> {
  const marineUrl =
    `${MARINE}?latitude=${SPOT.lat}&longitude=${SPOT.lon}` +
    `&daily=swell_wave_height_max,swell_wave_period_max,swell_wave_direction_dominant` +
    `&timezone=${encodeURIComponent(SPOT.tz)}&forecast_days=${days}`
  const windUrl =
    `${FORECAST}?latitude=${SPOT.lat}&longitude=${SPOT.lon}` +
    `&daily=wind_speed_10m_max,wind_direction_10m_dominant` +
    `&timezone=${encodeURIComponent(SPOT.tz)}&forecast_days=${days}`

  const [marineRes, windRes] = await Promise.all([
    fetch(marineUrl, { next: { revalidate: 3600 } }),
    fetch(windUrl, { next: { revalidate: 3600 } }),
  ])

  if (!marineRes.ok) throw new Error(`marine ${marineRes.status}`)
  const marine = await marineRes.json()
  const wind = windRes.ok ? await windRes.json() : null

  const times: string[] = marine?.daily?.time ?? []

  return times.map((day, i) => {
    const parts = {
      swellM: num(marine.daily.swell_wave_height_max?.[i]),
      periodS: num(marine.daily.swell_wave_period_max?.[i]),
      dirDeg: num(marine.daily.swell_wave_direction_dominant?.[i]),
      windKmh: num(wind?.daily?.wind_speed_10m_max?.[i]),
      windDirDeg: num(wind?.daily?.wind_direction_10m_dominant?.[i]),
    }
    const score = scoreSwell(parts)
    return { day, ...parts, score, verdict: verdictFor(score) }
  })
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export function compass(deg: number | null) {
  if (deg == null) return '—'
  return COMPASS[Math.round(deg / 22.5) % 16]
}

export const metresToFeet = (m: number | null) => (m == null ? null : m * 3.28084)
