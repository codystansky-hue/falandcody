import Link from 'next/link'
import PointBreak, { type Rider } from '@/components/PointBreak'
import { Notice, Stat } from '@/components/ui'
import { TRIP } from '@/lib/config'
import { listAttendees } from '@/lib/attendees'
import { compass, getForecast, metresToFeet, type SwellDay } from '@/lib/swell'

// Reads the roster, so it renders per request. The forecast underneath is
// still cached for an hour at the fetch layer.
export const dynamic = 'force-dynamic'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default async function Home() {
  const attendees = await listAttendees()

  let forecast: SwellDay[] | null = null
  try {
    forecast = await getForecast(5)
  } catch {
    forecast = null
  }
  const today = forecast?.[0] ?? null
  const best = forecast?.reduce((a, b) => (b.score > a.score ? b : a), forecast[0]) ?? null

  const riders: Rider[] = attendees.map((a) => ({
    id: a.id,
    initials: initials(a.nickname || a.name),
    label: `${a.name}${a.origin_city ? ` — ${a.origin_city}` : ''}`,
    tone: a.status === 'out' ? 'out' : a.status === 'maybe' ? 'maybe' : 'in',
  }))

  const inCount = attendees.filter((a) => a.status === 'in').length

  return (
    <div className="max-w-page mx-auto px-6">
      <section className="pt-14 md:pt-20">
        <p className="marker mb-4">
          8°04′S 79°26′W · {TRIP.venue.town} · {TRIP.window.label}
        </p>
        <h1 className="display text-[15vw] leading-[0.82] md:text-[9rem] mb-6">
          THE LONGEST
          <br />
          LEFT ON EARTH
        </h1>
        <p className="text-lg text-slate2 max-w-xl">
          Two and a half kilometres of wave, one point, and however many of us can get there.
          Put your details in and the rest of it — flights, transfers, rooms — assembles itself.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link href="/me" className="btn">
            Add your details
          </Link>
          <Link href="/roster" className="btn btn-quiet">
            See who&rsquo;s in
          </Link>
        </div>
      </section>

      {/* The crew, spread down the point in the order they land. */}
      <section className="mt-16 md:mt-24">
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <p className="marker">The point · {riders.length ? `${riders.length} on it` : 'empty'}</p>
          <p className="marker">Malpaso → El Hombre · 2.2 km</p>
        </div>
        {riders.length > 0 ? (
          <PointBreak riders={riders} />
        ) : (
          <div className="card p-10 text-center">
            <p className="display text-2xl mb-2">Nobody on it yet</p>
            <p className="text-slate2 text-sm mb-5">
              The first name in goes furthest down the point.
            </p>
            <Link href="/me" className="btn">
              Be first
            </Link>
          </div>
        )}
      </section>

      <section className="mt-16 md:mt-24">
        <p className="marker mb-4">Right now at the point</p>
        {today ? (
          <>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Swell"
                value={`${metresToFeet(today.swellM)?.toFixed(1) ?? '—'} ft`}
                sub={today.swellM != null ? `${today.swellM.toFixed(2)} m` : undefined}
              />
              <Stat label="Period" value={`${today.periodS?.toFixed(0) ?? '—'} s`} sub="Long is what wraps the point" />
              <Stat
                label="Direction"
                value={compass(today.dirDeg)}
                sub={today.dirDeg != null ? `${today.dirDeg.toFixed(0)}°` : undefined}
              />
              <Stat
                label="Wind"
                value={`${today.windKmh?.toFixed(0) ?? '—'} km/h`}
                sub={`from ${compass(today.windDirDeg)}`}
              />
            </div>
            {best && (
              <p className="mt-4 text-sm text-slate2">
                Best of the next five days is{' '}
                <span className="mono text-ink">
                  {new Date(best.day + 'T12:00:00').toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>{' '}
                — {best.verdict}.{' '}
                <Link href="/swell" className="underline underline-offset-2 hover:text-ink">
                  Full forecast
                </Link>
              </p>
            )}
          </>
        ) : (
          <Notice title="Forecast unreachable">
            <p>Open-Meteo did not answer. It needs no key, so this is temporary — reload shortly.</p>
          </Notice>
        )}
      </section>

      <section className="mt-16 md:mt-24 grid gap-6 md:grid-cols-2">
        <div>
          <p className="marker mb-4">Where we stay</p>
          <h2 className="display text-3xl mb-3">{TRIP.venue.name}</h2>
          <p className="text-slate2 mb-5">
            {TRIP.venue.rooms.reduce((n, r) => n + r.count, 0)} rooms above the bay, a board room for
            the gear, and a tow-back boat for when the paddle back up the point stops being funny.
          </p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            {TRIP.venue.rooms.map((room) => (
              <div key={room.key} className="flex justify-between py-2.5">
                <dt>
                  {room.label} <span className="text-slate2">×{room.count}</span>
                </dt>
                <dd className="mono">from ${room.fromUsd}</dd>
              </div>
            ))}
            <div className="flex justify-between py-2.5">
              <dt>Transfer from {TRIP.venue.transferFrom}</dt>
              <dd className="mono">
                {TRIP.venue.transferKm} km · {TRIP.venue.transferHours} h
              </dd>
            </div>
          </dl>
          <a
            href={TRIP.venue.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-5 text-sm underline underline-offset-2"
          >
            chicamaboutiquehotel.com
          </a>
        </div>

        <div>
          <p className="marker mb-4">Where we are up to</p>
          <div className="space-y-3">
            <Stat label="In" value={inCount} sub={`${attendees.length} replies so far`} />
            <Notice title={TRIP.window.locked ? 'Dates are locked' : 'Dates are not locked yet'}>
              <p>
                {TRIP.window.locked
                  ? `We go ${TRIP.window.label}.`
                  : `The window is ${TRIP.window.label}. October and November are the strongest of it — add the weeks you can actually get away and the overlap will pick the date.`}
              </p>
              <p>
                <Link href="/dates" className="underline underline-offset-2 text-ink">
                  Add your weeks
                </Link>
              </p>
            </Notice>
          </div>
        </div>
      </section>
    </div>
  )
}
