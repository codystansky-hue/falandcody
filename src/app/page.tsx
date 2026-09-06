import Link from 'next/link'
import { Notice, Stat, Todo } from '@/components/ui'
import {
  WEDDING,
  eventDate,
  formatDate,
  real,
  weddingDate,
} from '@/lib/config'
import { listGuests, tally } from '@/lib/guests'
import { registryReady } from '@/lib/nav'

// Reads the guest list, so it renders per request.
export const dynamic = 'force-dynamic'

function daysUntil(date: Date) {
  const today = new Date()
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - midnight) / 86_400_000)
}

export default async function Home() {
  const guests = await listGuests()
  const counts = tally(guests)

  const date = weddingDate()
  const dateSettled = date !== null && WEDDING.date.confirmed
  const days = date ? daysUntil(date) : null

  const names = real(WEDDING.couple.joined)
  const venue = real(WEDDING.venue.name)
  const town = real(WEDDING.venue.town)
  // The eyebrow above already carries the full "town, region, country"; the
  // sentence wants just the town, so take everything before the first comma.
  const shortTown = town?.split(',')[0].trim()
  const rsvpBy = real(WEDDING.date.rsvpBy)

  return (
    <div className="max-w-page mx-auto px-6">
      <section className="pt-14 md:pt-24 pb-4">
        <p className="marker mb-5">
          {town ?? <Todo what="Venue town not set" path="venue.town" />}
        </p>

        <h1 className="display text-[13vw] leading-[0.95] md:text-[7.5rem] mb-6">
          {names ?? (
            <span className="text-muted">
              {WEDDING.couple.one.name} &amp; …
            </span>
          )}
        </h1>

        <p className="text-xl md:text-2xl text-muted max-w-2xl">
          {dateSettled ? (
            <>
              We are getting married on{' '}
              <span className="text-ink">{real(WEDDING.date.label) ?? formatDate(date!)}</span>
              {venue && WEDDING.venue.confirmed && (
                <>
                  {' '}at <span className="text-ink">{venue}</span>
                </>
              )}
              . We would love you there.
            </>
          ) : (
            // Unconfirmed: name the window, never the working day. Whitespace
            // is explicit here because JSX would otherwise leave a space
            // floating before the comma.
            <>
              {'We are getting married'}
              {town ? <> in <span className="text-ink">{shortTown}</span></> : null}
              {real(WEDDING.date.windowLabel) ? (
                <>
                  , in <span className="text-ink">{WEDDING.date.windowLabel}</span>
                </>
              ) : null}
              {'. The exact day is not fixed yet — this page is where everything lands, so keep the link.'}
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-3 mt-9">
          <Link href="/rsvp" className="btn">
            {dateSettled ? 'RSVP' : 'Leave us your details'}
          </Link>
          <Link href="/schedule" className="btn btn-quiet">
            The weekend
          </Link>
        </div>

        {dateSettled && days !== null && (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-12">
            <Stat
              label={days >= 0 ? 'Days to go' : 'Married for'}
              value={Math.abs(days)}
              sub={real(WEDDING.date.label) ?? undefined}
            />
            <Stat
              label="Replies in"
              value={counts.replied}
              sub={`${counts.yes} yes · ${counts.maybe} maybe · ${counts.no} no`}
            />
            <Stat label="Coming" value={counts.heads} sub="Including plus-ones and children" />
            <Stat
              label="RSVP by"
              value={rsvpBy ? formatDate(new Date(`${rsvpBy}T12:00:00Z`), { weekday: undefined, year: undefined }) : '—'}
              sub={rsvpBy ? 'After that we have to give the caterer a number' : 'Not set yet'}
            />
          </div>
        )}
      </section>

      {/* The weekend, at a glance. Reads WEDDING.events, so adding a Sunday
          hike to the config puts it here automatically. */}
      <section className="mt-16 md:mt-24">
        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
          <p className="marker">The weekend</p>
          <Link href="/schedule" className="marker hover:text-ink">
            Full schedule →
          </Link>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WEDDING.events.map((event) => {
            const when = eventDate(event)
            return (
              <li key={event.key} className="card p-5">
                <p className="marker mb-2">
                  {when ? formatDate(when, { year: undefined }) : 'Date to come'}
                </p>
                <h2 className="display text-xl mb-1.5">{event.name}</h2>
                <p className="mono text-sm text-muted">
                  {real(event.time) ?? <Todo what="Time to come" />}
                </p>
                <p className="text-sm text-muted mt-1">
                  {real(event.where) ?? <Todo what="Place to come" />}
                </p>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mt-16 md:mt-24 grid gap-10 md:grid-cols-2">
        <div>
          <p className="marker mb-4">{WEDDING.venue.confirmed ? 'Where' : 'Where we are looking'}</p>
          <h2 className="display text-3xl mb-3">
            {venue ?? <Todo what="Venue not chosen yet" path="venue.name" />}
          </h2>
          {venue && !WEDDING.venue.confirmed && (
            <p className="text-sm text-rose mb-3">Not booked yet — this could still change.</p>
          )}
          <p className="text-muted mb-5">
            {real(WEDDING.venue.note) ??
              'Once the venue is booked, the description goes in config.ts and appears here.'}
          </p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            {real(WEDDING.venue.address) && (
              <div className="flex justify-between gap-6 py-2.5">
                <dt className="text-muted shrink-0">Address</dt>
                <dd className="text-right">{WEDDING.venue.address}</dd>
              </div>
            )}
            {WEDDING.travel.flyIn && real(WEDDING.travel.arrival.city) && (
              <div className="flex justify-between gap-6 py-2.5">
                <dt className="text-muted shrink-0">Nearest airport</dt>
                <dd className="mono text-right">
                  {WEDDING.travel.arrival.city}
                  {real(WEDDING.travel.arrival.iata) ? ` · ${WEDDING.travel.arrival.iata}` : ''}
                </dd>
              </div>
            )}
            {WEDDING.travel.transferHours > 0 && (
              <div className="flex justify-between gap-6 py-2.5">
                <dt className="text-muted shrink-0">From the airport</dt>
                <dd className="mono text-right">
                  {WEDDING.travel.transferKm} km · {WEDDING.travel.transferHours} h
                </dd>
              </div>
            )}
          </dl>
          {real(WEDDING.venue.url) && (
            <a
              href={WEDDING.venue.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-5 text-sm underline underline-offset-2"
            >
              {WEDDING.venue.url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        <div>
          <p className="marker mb-4">Before you book anything</p>
          <div className="space-y-3">
            <Notice title={dateSettled ? 'Reply when you can' : 'Nothing is locked yet'}>
              <p>
                {dateSettled
                  ? `Tell us yes or no${rsvpBy ? ` by ${rsvpBy}` : ''}. You can change your answer afterwards — the form remembers you and edits your reply rather than adding a second one.`
                  : 'Leave your name and email now and we will write to you the moment the date is fixed. Nothing you enter is final.'}
              </p>
              <p>
                <Link href="/rsvp" className="underline underline-offset-2 text-ink">
                  Go to the form
                </Link>
              </p>
            </Notice>

            {WEDDING.travel.flyIn && (
              <Notice title="Flying in?">
                <p>
                  Put your home airport into the RSVP form and it works out the journey, the dates
                  you would want to fly, and what the fare looks like — no separate search.
                </p>
                <p>
                  <Link href="/travel" className="underline underline-offset-2 text-ink">
                    Travel
                  </Link>
                </p>
              </Notice>
            )}

            {registryReady() && (
              <Notice title="On presents">
                <p>{real(WEDDING.registry.note) ?? 'Your presence is the present.'}</p>
                <p>
                  <Link href="/registry" className="underline underline-offset-2 text-ink">
                    Registry
                  </Link>
                </p>
              </Notice>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
