import { Notice, Page } from '@/components/ui'
import FlightSearch from '@/components/FlightSearch'
import { listAttendees, listVotes } from '@/lib/attendees'
import { cheapestFrom, isFaresConfigured, type Fare } from '@/lib/fares'
import { AIRPORTS, TRIP } from '@/lib/config'
import { PROPOSED_WEEKS, tallyWeeks } from '@/lib/weeks'

// Roster-driven, so a new home airport shows up immediately. The fare
// lookups themselves stay cached for a day inside the lib.
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Flights — Chicama' }

export default async function FlightsPage() {
  const [attendees, votes] = await Promise.all([listAttendees(), listVotes()])

  const origins = Array.from(
    new Set(
      attendees
        .filter((a) => a.status !== 'out' && a.origin_airport)
        .map((a) => a.origin_airport!.toUpperCase()),
    ),
  )

  // Default the search to whichever week is currently winning the vote, so the
  // dates are already right for most people without them choosing anything.
  const leading = tallyWeeks(votes)[0] ?? PROPOSED_WEEKS[0]

  const configured = isFaresConfigured()
  const results: { origin: string; fares: Fare[] | null }[] = configured
    ? await Promise.all(
        origins.map(async (origin) => ({
          origin,
          fares: await cheapestFrom(origin, { departureMonth: leading.start.slice(0, 7) }),
        })),
      )
    : []

  return (
    <Page
      marker={`${AIRPORTS.gateway.iata} → ${AIRPORTS.arrival.iata} · ${TRIP.venue.transferHours} h to the hotel`}
      title="Flights"
      lede="Type your home airport. That is the whole input — the dates come from the week we are voting on, and the buttons drop you straight into a live search with everything filled in."
    >
      <FlightSearch
        weeks={PROPOSED_WEEKS}
        defaultWeekKey={leading.key}
        knownOrigins={origins}
        crew={attendees
          .filter((a) => a.origin_airport)
          .map((a) => ({ name: a.nickname || a.name, airport: a.origin_airport!.toUpperCase() }))}
      />

      {/* Indicative cached prices, when the optional free token is set. The
          search above is the primary path and never depends on this. */}
      <section className="mt-16">
        <p className="marker mb-4">Rough prices</p>
        {!configured ? (
          <Notice title="Cached fare estimates are not switched on">
            <p>
              The search above works regardless — this section only adds indicative prices per
              route so you can see who has the expensive flight before anyone books.
            </p>
            <p>
              It needs a free Travelpayouts token in <span className="mono">TRAVELPAYOUTS_TOKEN</span>.
              Amadeus, the obvious alternative, was decommissioned in July 2026.
            </p>
          </Notice>
        ) : origins.length === 0 ? (
          <Notice title="No home airports on file yet">
            <p>Prices are looked up per origin, so this fills in as the crew adds theirs.</p>
          </Notice>
        ) : (
          <div className="space-y-8">
            {results.map(({ origin, fares }) => (
              <div key={origin}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="display text-2xl">{origin}</h2>
                  <span className="marker">
                    → {AIRPORTS.gateway.iata} ·{' '}
                    {attendees
                      .filter((a) => a.origin_airport?.toUpperCase() === origin)
                      .map((a) => a.nickname || a.name)
                      .join(', ')}
                  </span>
                </div>
                {!fares || fares.length === 0 ? (
                  <p className="text-sm text-slate2 card p-4">
                    No cached fares for this route. Travelpayouts only holds what people have
                    recently searched, so quiet routes come back empty — use the search above.
                  </p>
                ) : (
                  <div className="overflow-x-auto card">
                    <table className="w-full text-sm border-collapse min-w-[32rem]">
                      <thead>
                        <tr className="border-b border-hairline">
                          {['Price', 'Airline', 'Stops', 'Departs', 'Returns'].map((h) => (
                            <th key={h} className="label text-left px-4 py-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fares.map((fare, i) => (
                          <tr key={i} className="border-b border-hairline last:border-0">
                            <td className="px-4 py-3 mono font-medium">${fare.priceUsd.toFixed(0)}</td>
                            <td className="px-4 py-3 mono">{fare.airline ?? '—'}</td>
                            <td className="px-4 py-3 mono">
                              {fare.transfers === 0 ? 'Direct' : (fare.transfers ?? '—')}
                            </td>
                            <td className="px-4 py-3 mono">{fare.departureAt?.slice(0, 10) ?? '—'}</td>
                            <td className="px-4 py-3 mono">{fare.returnAt?.slice(0, 10) ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </Page>
  )
}
