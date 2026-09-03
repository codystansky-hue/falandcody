import { NextResponse } from 'next/server'
import { hoursLabel, journeyFor, suggest } from '@/lib/journey'
import { cheapestFrom, isFaresConfigured } from '@/lib/fares'
import { cheapestRoundTrip } from '@/lib/googleFlights'
import { PROPOSED_WEEKS, weekByKey } from '@/lib/weeks'
import { AIRPORTS } from '@/lib/config'

export const runtime = 'nodejs'

// Keeps the ~300 KB airport table on the server. The form asks this route as
// someone types, rather than shipping the table to every browser.
//
//   /api/journey?q=denv          → airport suggestions
//   /api/journey?origin=DEN      → journey model, plus prices per week if the
//                                  Travelpayouts token is set

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

  // Live Google fares, keyless. Runs alongside the Travelpayouts path so one
  // can cover for the other.
  if (params.get('probe') === 'google') {
    const week = weekByKey(params.get('week') ?? 'nov07') ?? PROPOSED_WEEKS[0]
    const fare = await cheapestRoundTrip(
      journey.origin.iata,
      AIRPORTS.gateway.iata,
      week.start,
      week.end,
    )
    return NextResponse.json({ origin: journey.origin.iata, week: week.label, fare })
  }

  // Prices per proposed week, so the group can compare weeks rather than just
  // routes. Only one week if the caller named one.
  const wanted = params.get('week')
  const weeks = wanted ? [weekByKey(wanted)].filter(Boolean) : PROPOSED_WEEKS
  const configured = isFaresConfigured()

  const prices = configured
    ? await Promise.all(
        weeks.map(async (week) => {
          const fares = await cheapestFrom(journey.origin.iata, {
            departureMonth: week!.start.slice(0, 7),
            destination: AIRPORTS.gateway.iata,
          })
          const cheapest = fares?.length
            ? fares.reduce((a, b) => (b.priceUsd < a.priceUsd ? b : a))
            : null
          return {
            weekKey: week!.key,
            label: week!.label,
            cheapestUsd: cheapest?.priceUsd ?? null,
            airline: cheapest?.airline ?? null,
            transfers: cheapest?.transfers ?? null,
          }
        }),
      )
    : null

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
    pricesConfigured: configured,
    prices,
  })
}
