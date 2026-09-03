import { Notice, Page } from '@/components/ui'
import { listAttendees } from '@/lib/attendees'
import { cheapestFrom, isFaresConfigured, type Fare } from '@/lib/fares'
import { AIRPORTS, TRIP } from '@/lib/config'

// Roster-driven, so a new home airport shows up immediately. The fare
// lookups themselves stay cached for a day inside the lib.
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Flights — Chicama' }

export default async function FlightsPage() {
  const attendees = await listAttendees()
  const origins = Array.from(
    new Set(
      attendees
        .filter((a) => a.status !== 'out' && a.origin_airport)
        .map((a) => a.origin_airport!.toUpperCase()),
    ),
  )

  const configured = isFaresConfigured()
  const month = TRIP.window.start.slice(0, 7)

  const results: { origin: string; fares: Fare[] | null }[] = configured
    ? await Promise.all(
        origins.map(async (origin) => ({
          origin,
          fares: await cheapestFrom(origin, { departureMonth: month }),
        })),
      )
    : []

  return (
    <Page
      marker={`To ${AIRPORTS.gateway.iata} · then ${AIRPORTS.arrival.iata}`}
      title="Flights"
      lede={`Almost every route into Peru connects through Lima, then it is a short hop to Trujillo and ${TRIP.venue.transferHours} h up the coast. These are the cheapest cached fares per origin — a starting point, not a booking.`}
    >
      {!configured ? (
        <Notice title="Fare lookups are not switched on">
          <p>
            This page needs a free Travelpayouts token. Create one at travelpayouts.com, copy it
            from Profile → API token, and set <span className="mono">TRAVELPAYOUTS_TOKEN</span> in
            the Vercel project.
          </p>
          <p>
            Everything else on the site works without it. Amadeus, the obvious alternative, was
            decommissioned in July 2026.
          </p>
        </Notice>
      ) : origins.length === 0 ? (
        <Notice title="No home airports yet">
          <p>
            Fares are looked up per origin. Once the crew fills in their home airport on their own
            page, each route shows up here.
          </p>
        </Notice>
      ) : (
        <div className="space-y-8">
          {results.map(({ origin, fares }) => (
            <section key={origin}>
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
                  No cached fares for this route right now. Travelpayouts only holds what people
                  have recently searched, so quiet routes come back empty.
                </p>
              ) : (
                <div className="overflow-x-auto card">
                  <table className="w-full text-sm border-collapse min-w-[34rem]">
                    <thead>
                      <tr className="border-b border-hairline">
                        {['Price', 'Airline', 'Stops', 'Departs', 'Returns', ''].map((h) => (
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
                          <td className="px-4 py-3">
                            {fare.link && (
                              <a
                                href={fare.link}
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2"
                              >
                                Open
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
