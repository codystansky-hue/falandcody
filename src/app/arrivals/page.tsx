import { notFound } from 'next/navigation'
import { Notice, Page, Pill } from '@/components/ui'
import { groupTransfers, listGuests, seats, type Guest } from '@/lib/guests'
import {
  arrivalsAtVenueAirport,
  callsignMatches,
  hasArrivalIcao,
  isOpenSkyConfigured,
  type Arrival,
} from '@/lib/opensky'
import { WEDDING, real } from '@/lib/config'

// Guest-list driven. OpenSky results are cached for 5 minutes inside the lib.
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Arrivals' }

function venueTime(date: Date) {
  const tz = real(WEDDING.date.tz)
  return date.toLocaleString('en-GB', {
    ...(tz ? { timeZone: tz } : {}),
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ArrivalsPage() {
  if (!WEDDING.travel.flyIn) notFound()

  const guests = await listGuests()
  const runs = groupTransfers(guests)

  // Only worth calling OpenSky when somebody is actually landing around now —
  // it only reports flights that have already touched down.
  const soon = guests.some((g) => {
    if (!g.arrival_at) return false
    const delta = new Date(g.arrival_at).getTime() - Date.now()
    return delta < 6 * 3600_000 && delta > -24 * 3600_000
  })

  let landed: Arrival[] | null = null
  if (soon && isOpenSkyConfigured() && hasArrivalIcao()) {
    landed = await arrivalsAtVenueAirport(24)
  }

  const hasLanded = (guest: Guest) =>
    Boolean(
      guest.arrival_flight &&
        landed?.some((flight) => callsignMatches(guest.arrival_flight!, flight.callsign)),
    )

  const arrival = WEDDING.travel.arrival
  const waiting = guests.filter((g) => g.status !== 'no' && !g.arrival_at && g.origin_airport)

  return (
    <Page
      marker={
        real(arrival.city)
          ? `${arrival.city} · ${[real(arrival.iata), arrival.icao].filter(Boolean).join(' / ')}`
          : 'Arrivals'
      }
      title="Arrivals"
      lede={
        WEDDING.travel.runningShuttle
          ? 'Anyone touching down within two hours of each other shares a car. This is the manifest — it builds itself out of the flight times on people’s replies.'
          : 'Who lands when, so you can share a taxi with whoever is on your flight.'
      }
    >
      {runs.length === 0 ? (
        <Notice title="No arrival times yet">
          <p>
            This builds itself out of the landing times people put on their replies. As soon as two
            guests have booked, the cars group themselves here.
          </p>
        </Notice>
      ) : (
        <div className="space-y-6">
          {runs.map((run, i) => (
            <section key={i} className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4 border-b border-hairline">
                <h2 className="display text-xl">
                  Car {i + 1} · {seats(run.riders)} {seats(run.riders) === 1 ? 'seat' : 'seats'}
                </h2>
                <p className="mono text-sm">
                  Leaves {real(arrival.iata) ?? 'the airport'} {venueTime(run.departsAt)}
                </p>
              </div>
              <ul className="divide-y divide-hairline">
                {run.riders.map((guest) => {
                  const party = [
                    guest.plus_one ? guest.plus_one_name || 'plus one' : null,
                    guest.kids > 0 ? `${guest.kids} kids` : null,
                  ].filter(Boolean)
                  return (
                    <li
                      key={guest.id}
                      className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-1 justify-between"
                    >
                      <span className="font-medium">
                        {guest.name}
                        <span className="text-muted font-normal">
                          {party.length ? ` + ${party.join(', ')}` : ''}
                          {guest.origin_city ? ` · from ${guest.origin_city}` : ''}
                        </span>
                      </span>
                      <span className="mono text-sm flex items-center gap-3">
                        {guest.arrival_flight ?? 'flight tbc'}
                        <span className="text-muted">{venueTime(new Date(guest.arrival_at!))}</span>
                        {hasLanded(guest) && <Pill tone="solid">on the ground</Pill>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {waiting.length > 0 && (
        <p className="mt-6 text-sm text-muted">
          Flying, but no landing time yet: {waiting.map((g) => g.name).join(', ')}.
        </p>
      )}

      <section className="mt-12">
        <p className="marker mb-4">Live tracking</p>
        {!hasArrivalIcao() ? (
          <Notice title="Live tracking needs the airport’s ICAO code">
            <p>
              The board above works from the times people typed in. To have it confirm who is
              actually on the ground, put the four-letter ICAO code of the arrival airport (KSEA,
              EGLL, LFPG…) into <span className="mono">WEDDING.travel.arrival.icao</span>.
            </p>
          </Notice>
        ) : !isOpenSkyConfigured() ? (
          <Notice title="Live tracking is not switched on">
            <p>
              Create a free API client at opensky-network.org and set{' '}
              <span className="mono">OPENSKY_CLIENT_ID</span> and{' '}
              <span className="mono">OPENSKY_CLIENT_SECRET</span>. Entirely optional — the board
              works without it.
            </p>
          </Notice>
        ) : !soon ? (
          <p className="text-sm text-muted">
            Nobody is due within six hours. Tracking wakes up on arrival day — OpenSky only reports
            flights that have already landed, so there is nothing to poll until then.
          </p>
        ) : landed === null ? (
          <Notice title="OpenSky did not answer" tone="warn">
            <p>Check the credentials, or wait — the free tier throttles by daily credits.</p>
          </Notice>
        ) : (
          <p className="text-sm text-muted">
            {landed.length} movements into {arrival.icao} in the last 24 hours. Anyone matched
            against them is flagged on the ground above.
          </p>
        )}
      </section>
    </Page>
  )
}
