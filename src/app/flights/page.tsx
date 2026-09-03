import Link from 'next/link'
import { Notice, Page } from '@/components/ui'
import FlightSearch from '@/components/FlightSearch'
import WeekComparison from '@/components/WeekComparison'
import { listAttendees, listVotes } from '@/lib/attendees'
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

  return (
    <Page
      marker={`${AIRPORTS.gateway.iata} → ${AIRPORTS.arrival.iata} · ${TRIP.venue.transferHours} h to the hotel`}
      title="Flights"
      lede="Type your home airport. That is the whole input — you get the real journey, live prices for each of the three weeks, and buttons into a search with the dates already filled in."
    >
      <FlightSearch
        weeks={PROPOSED_WEEKS}
        defaultWeekKey={leading.key}
        knownOrigins={origins}
        crew={attendees
          .filter((a) => a.origin_airport)
          .map((a) => ({ name: a.nickname || a.name, airport: a.origin_airport!.toUpperCase() }))}
      />

      {/* The decision the group is actually making: which week, not which
          airline. Comparing weeks across every origin at once is the only view
          that answers it. */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
          <h2 className="display text-2xl">Which week to pick</h2>
          <p className="marker">Nobody books until we agree</p>
        </div>
        <p className="text-slate2 mb-5 max-w-2xl">
          Conditions, the vote and what the flights cost the whole crew, week by week. The cheapest
          week for one person is often not the cheapest week for twelve.
        </p>
        {origins.length === 0 ? (
          <Notice title="No home airports on file yet">
            <p>
              This table fills in as people add their airport. Two or three is enough for it to
              start being useful.
            </p>
          </Notice>
        ) : (
          <WeekComparison origins={origins} votes={votes} crewSize={attendees.filter((a) => a.status !== 'out').length} />
        )}
      </section>

      {/* Close the loop: a flight nobody records is a flight the budget and the
          arrivals board cannot see. */}
      <section className="mt-6">
        <div className="card border-l-2 border-l-ochre p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold mb-0.5">Booked something?</p>
            <p className="text-sm text-slate2">
              Put the flight number, landing time and price on your own page — that is what fills in
              the shuttle groupings and the budget.
            </p>
          </div>
          <Link href="/me" className="btn shrink-0">
            Record your flight
          </Link>
        </div>
      </section>

    </Page>
  )
}
