import { Notice, Page } from '@/components/ui'
import { groupShuttles, listAttendees, type Attendee } from '@/lib/attendees'
import { arrivalsAtTrujillo, callsignMatches, isOpenSkyConfigured, type Arrival } from '@/lib/opensky'
import { AIRPORTS, TRIP } from '@/lib/config'

// Roster-driven. OpenSky results are cached for 5 minutes inside the lib.
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Arrivals — Chicama' }

function peruTime(date: Date) {
  return date.toLocaleString('en-GB', {
    timeZone: 'America/Lima',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ArrivalsPage() {
  const attendees = await listAttendees()
  const runs = groupShuttles(attendees)

  // Only worth calling OpenSky when somebody is actually landing around now —
  // it only reports flights that have already touched down.
  const soon = attendees.some((a) => {
    if (!a.arrival_at) return false
    const delta = new Date(a.arrival_at).getTime() - Date.now()
    return delta < 6 * 3600_000 && delta > -24 * 3600_000
  })

  let landed: Arrival[] | null = null
  if (soon && isOpenSkyConfigured()) {
    landed = await arrivalsAtTrujillo(24)
  }

  const hasLanded = (person: Attendee) =>
    Boolean(
      person.arrival_flight &&
        landed?.some((flight) => callsignMatches(person.arrival_flight!, flight.callsign)),
    )

  const unbooked = attendees.filter((a) => a.status !== 'out' && !a.arrival_at)

  return (
    <Page
      marker={`${AIRPORTS.arrival.city} · ${AIRPORTS.arrival.iata} / ${AIRPORTS.arrival.icao}`}
      title="Arrivals"
      lede={`Everyone lands at Trujillo and rides ${TRIP.venue.transferKm} km up the coast. Anyone touching down within two hours of each other shares a van — this is the manifest to hand the hotel.`}
    >
      {runs.length === 0 ? (
        <Notice title="No arrival times yet">
          <p>
            Shuttle runs are worked out from the landing times on everyone&rsquo;s page. As soon as
            two people have booked, the vans group themselves here.
          </p>
        </Notice>
      ) : (
        <div className="space-y-6">
          {runs.map((run, i) => (
            <section key={i} className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4 border-b border-hairline">
                <h2 className="display text-xl">
                  Van {i + 1} · {run.riders.length} {run.riders.length === 1 ? 'rider' : 'riders'}
                </h2>
                <p className="mono text-sm">
                  Leaves {AIRPORTS.arrival.iata} {peruTime(run.departsAt)}
                </p>
              </div>
              <ul className="divide-y divide-hairline">
                {run.riders.map((person) => {
                  const down = hasLanded(person)
                  return (
                    <li key={person.id} className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-1 justify-between">
                      <span className="font-medium">
                        {person.nickname || person.name}
                        <span className="text-slate2 font-normal">
                          {person.origin_city ? ` · from ${person.origin_city}` : ''}
                        </span>
                      </span>
                      <span className="mono text-sm flex items-center gap-3">
                        {person.arrival_flight ?? 'flight tbc'}
                        <span className="text-slate2">{peruTime(new Date(person.arrival_at!))}</span>
                        {down && (
                          <span className="text-[0.65rem] uppercase tracking-widest bg-ink text-foam px-2 py-0.5">
                            On the ground
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {unbooked.length > 0 && (
        <p className="mt-6 text-sm text-slate2">
          Still without a landing time: {unbooked.map((a) => a.nickname || a.name).join(', ')}.
        </p>
      )}

      <section className="mt-12">
        <p className="marker mb-4">Live tracking</p>
        {!isOpenSkyConfigured() ? (
          <Notice title="Live tracking is not switched on">
            <p>
              The board above works from the times people typed in. To have it confirm who is
              actually on the ground, create a free API client at opensky-network.org and set{' '}
              <span className="mono">OPENSKY_CLIENT_ID</span> and{' '}
              <span className="mono">OPENSKY_CLIENT_SECRET</span>.
            </p>
            <p>
              OpenSky retired password auth in March 2026, so anonymous requests no longer work.
            </p>
          </Notice>
        ) : !soon ? (
          <p className="text-sm text-slate2">
            Nobody is due within six hours. Tracking wakes up on arrival day — OpenSky only reports
            flights that have already landed, so there is nothing to poll until then.
          </p>
        ) : landed === null ? (
          <Notice title="OpenSky did not answer" tone="warn">
            <p>Check the credentials, or wait — the free tier throttles by daily credits.</p>
          </Notice>
        ) : (
          <p className="text-sm text-slate2">
            {landed.length} movements into {AIRPORTS.arrival.icao} in the last 24 hours. Anyone
            matched against them is flagged on the ground above.
          </p>
        )}
      </section>
    </Page>
  )
}
