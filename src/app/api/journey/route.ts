import { NextResponse } from 'next/server'
import { hoursLabel, journeyFor, suggest } from '@/lib/journey'
import { fareFor } from '@/lib/fares-cache'
import { defaultStay } from '@/lib/config'

export const runtime = 'nodejs'
// Live fares take a second or two, and the retry can push it further.
export const maxDuration = 30

// Keeps the ~300 KB airport table on the server. The form asks this route as
// somebody types, rather than shipping the table to every browser.
//
//   /api/journey?q=denv       → airport suggestions
//   /api/journey?origin=DEN   → journey model plus a live fare for the stay

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

  // Live, keyless, and it warms the shared cache — so one guest checking their
  // own route leaves a usable price behind for the next person on it.
  const stay = defaultStay()
  const fare = stay ? await fareFor(journey.origin.iata, stay.depart, stay.return) : null

  return NextResponse.json({
    origin: journey.origin,
    journey: {
      mainTo: journey.main.to,
      mainKm: journey.main.km,
      nonstop: journey.main.nonstop,
      hopTo: journey.hop?.to ?? null,
      hopKm: journey.hop?.km ?? 0,
      roadKm: journey.road.km,
      stops: journey.stops,
      totalHours: journey.totalHours,
      totalLabel: hoursLabel(journey.totalHours),
      airborneLabel: hoursLabel(
        journey.main.airborneHours + (journey.hop?.airborneHours ?? 0),
      ),
      summary: journey.summary,
    },
    stay,
    price: stay
      ? {
          cheapestUsd: fare?.usd ?? null,
          stale: fare?.stale ?? false,
          fetchedAt: fare?.fetchedAt ?? null,
        }
      : null,
  })
}
