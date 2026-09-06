import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Notice, Page, Stat } from '@/components/ui'
import TravelPlanner from '@/components/TravelPlanner'
import CostEstimator from '@/components/CostEstimator'
import { WEDDING, defaultStay, formatDate, real } from '@/lib/config'

export const metadata = { title: 'Travel' }

export default function TravelPage() {
  // The whole page is about flying. A wedding everyone drives to does not have
  // one, and the nav already hides the link — this makes the URL agree.
  if (!WEDDING.travel.flyIn) notFound()

  const stay = defaultStay()
  const arrival = WEDDING.travel.arrival
  const gateway = WEDDING.travel.gateway

  return (
    <Page
      marker={
        real(arrival.city)
          ? `${arrival.city}${real(arrival.iata) ? ` · ${arrival.iata}` : ''}`
          : 'Getting there'
      }
      title="Travel"
      lede="One input — your home airport — and you get the journey, what it costs today, and a search with the dates already filled in."
    >
      {!stay ? (
        <Notice title="Dates are not fixed yet" tone="warn">
          <p>
            Flight search needs a date. As soon as the wedding date goes into the config, this page
            prefills every search with the nights you would actually be here.
          </p>
        </Notice>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-10">
            <Stat
              label="Fly in"
              value={formatDate(new Date(`${stay.depart}T12:00:00Z`), { weekday: 'short', year: undefined })}
              sub="The day before the first event"
            />
            <Stat
              label="Fly out"
              value={formatDate(new Date(`${stay.return}T12:00:00Z`), { weekday: 'short', year: undefined })}
              sub="The day after the last"
            />
            <Stat label="Nights" value={stay.nights} sub="What the search is prefilled with" />
            <Stat
              label="Land at"
              value={real(arrival.iata) ?? '—'}
              sub={gateway ? `via ${gateway.iata}` : real(arrival.city) ?? undefined}
            />
          </div>

          <section>
            <p className="marker mb-4">Your route</p>
            <TravelPlanner depart={stay.depart} ret={stay.return} />
          </section>
        </>
      )}

      {(real(WEDDING.travel.transferNote) || WEDDING.travel.transferHours > 0) && (
        <section className="mt-14">
          <p className="marker mb-4">From the airport to the venue</p>
          <div className="card p-6 max-w-2xl">
            {WEDDING.travel.transferHours > 0 && (
              <p className="mono text-lg mb-2">
                {WEDDING.travel.transferKm} km · about {WEDDING.travel.transferHours} h
              </p>
            )}
            <p className="text-muted">
              {real(WEDDING.travel.transferNote) ?? 'Details to come.'}
            </p>
            {WEDDING.travel.runningShuttle && (
              <p className="text-sm mt-4">
                Tick the car box on{' '}
                <Link href="/rsvp" className="underline underline-offset-2">
                  your reply
                </Link>{' '}
                and we will group you with whoever lands near you — the manifest builds itself on{' '}
                <Link href="/arrivals" className="underline underline-offset-2">
                  the arrivals board
                </Link>
                .
              </p>
            )}
          </div>
        </section>
      )}

      {real(WEDDING.travel.visaNote) && (
        <section className="mt-14">
          <p className="marker mb-4">Before you book</p>
          <Notice title="Entry requirements" tone="warn">
            <p>{WEDDING.travel.visaNote}</p>
            {WEDDING.travel.passportMonthsRequired > 0 && (
              <p>
                Your passport needs {WEDDING.travel.passportMonthsRequired} months of validity past
                the date you arrive. This is the single most common way somebody loses a trip —
                check it today, not the week before.
              </p>
            )}
          </Notice>
        </section>
      )}

      <section className="mt-14">
        <p className="marker mb-2">What it will cost you</p>
        <p className="text-muted max-w-2xl mb-6">
          We would rather be honest about this than have anyone work it out with a calculator at
          midnight. Change any assumption; nothing is saved.
        </p>
        <CostEstimator />
      </section>
    </Page>
  )
}
