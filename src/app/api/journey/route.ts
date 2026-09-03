import { NextResponse } from 'next/server'
import { hoursLabel, journeyFor, suggest } from '@/lib/journey'
import { fareFor } from '@/lib/fares-cache'
import { PROPOSED_WEEKS, weekByKey } from '@/lib/weeks'

export const runtime = 'nodejs'
// Live fares take a second or two, and the retry can push it further.
export const maxDuration = 30

// Keeps the ~300 KB airport table on the server. The form asks this route as
// someone types, rather than shipping the table to every browser.
//
//   /api/journey?q=denv       → airport suggestions
//   /api/journey?origin=DEN   → journey model plus a live fare per proposed week

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams

  const query = params.get('q')
  if (query) {
    return NextResponse.json({ suggestions: suggest(query) })
  }

  const origin = params.get('origin')
  if (!origin) {
    return NextResponse.json({ error: 'Pass ?origin=IATA or ?q=search' }, { status: 400 })
  }

  const journey = journeyFor(origin)
  if (!journey) {
    return NextResponse.json(
      { error: `No airport with the code ${origin.toUpperCase()}.`, suggestions: suggest(origin) },
      { status: 404 },
    )
  }

  const wanted = params.get('week')
  const weeks = (wanted ? [weekByKey(wanted)] : PROPOSED_WEEKS).filter(
    (w): w is (typeof PROPOSED_WEEKS)[number] => Boolean(w),
  )

  // Live, keyless, and it warms the shared cache the week-comparison table
  // reads — so one person checking their own route fills it in for everybody.
  const prices = await Promise.all(
    weeks.map(async (week) => {
      const fare = await fareFor(journey.origin.iata, week.start, week.end)
      return {
        weekKey: week.key,
        label: week.label,
        cheapestUsd: fare?.usd ?? null,
        stale: fare?.stale ?? false,
        fetchedAt: fare?.fetchedAt ?? null,
      }
    }),
  )

  return NextResponse.json({
    origin: journey.origin,
    journey: {
      toLimaKm: journey.lima.km,
      toLimaNonstop: journey.lima.nonstop,
      hopKm: journey.hop.km,
      roadKm: journey.road.km,
      stops: journey.stops,
      totalHours: journey.totalHours,
      totalLabel: hoursLabel(journey.totalHours),
      airborneLabel: hoursLabel(journey.lima.airborneHours + journey.hop.airborneHours),
      summary: journey.summary,
    },
    pricesConfigured: true,
    prices,
  })
}
