import Link from 'next/link'
import { Notice, Page } from '@/components/ui'
import BudgetCalculator from '@/components/BudgetCalculator'
import { listAttendees } from '@/lib/attendees'
import { IGV_RATE } from '@/lib/costs'
import { TRIP } from '@/lib/config'
import { cachedFare } from '@/lib/fares-cache'
import { PROPOSED_WEEKS, tallyWeeks } from '@/lib/weeks'
import { listVotes } from '@/lib/attendees'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Budget — Chicama' }

export default async function BudgetPage() {
  const votes = await listVotes()
  // Estimate against whichever week the group is converging on.
  const leading = tallyWeeks(votes)[0] ?? PROPOSED_WEEKS[0]

  const people = await Promise.all(
    (await listAttendees())
      .filter((a) => a.status !== 'out')
      .map(async (a) => ({
      id: a.id,
      name: a.nickname || a.name,
      room_pref: a.room_pref,
      bringing_gear: a.bringing_gear,
      needs_transfer: a.needs_transfer,
      foil_level: a.foil_level,
      flight_cost_usd: a.flight_cost_usd,
      paid_status: a.paid_status,
      flight_estimate_usd: a.origin_airport
        ? ((await cachedFare(a.origin_airport.toUpperCase(), leading.start))?.usd ?? null)
        : null,
    })),
  )

  return (
    <Page
      marker={`${TRIP.window.label} · assumptions, not quotes`}
      title="What it costs"
      lede="Change any number on the left and everything re-adds. Nothing here is a quote — the hotel prices by date, so treat the room rates as a starting point until someone gets a real one."
    >
      <BudgetCalculator people={people} />

      <section className="mt-14 grid gap-6 md:grid-cols-2">
        <Notice title={`Do not pay the ${Math.round(IGV_RATE * 100)}% IGV`}>
          <p>
            Peru zero-rates its sales tax on lodging and food for non-resident foreigners staying
            60 days or less. It is worth 18% of the biggest line in this budget.
          </p>
          <p>
            It is not automatic. You need your passport showing the entry stamp, or the digital TAM
            record from the Migraciones portal. Some hotels apply it on sight of the passport;
            others ask for the TAM. Download it before you fly.
          </p>
        </Notice>

        <Notice title="The room rates are the soft number">
          <p>
            The hotel&rsquo;s own room pages say to enter your dates to get the real rate, and the
            published figures are &ldquo;from&rdquo; prices — resellers have shown $204 for the same
            property. Assume these are optimistic until the group quote lands.
          </p>
          <p>
            <Link href="/hotel" className="underline underline-offset-2 text-ink">
              How to get that quote
            </Link>
          </p>
        </Notice>
      </section>

      <p className="mt-8 text-sm text-slate2 max-w-2xl">
        Flight prices come from whatever each person entered on their own page, so this only gets
        accurate as people actually book.{' '}
        <Link href="/flights" className="underline underline-offset-2 text-ink">
          Find yours
        </Link>{' '}
        then put the price in at{' '}
        <Link href="/me" className="underline underline-offset-2 text-ink">
          your details
        </Link>
        .
      </p>
    </Page>
  )
}
