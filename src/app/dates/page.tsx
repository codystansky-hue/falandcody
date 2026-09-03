import Link from 'next/link'
import { Notice, Page } from '@/components/ui'
import { listAttendees, listVotes, listWindows } from '@/lib/attendees'
import { TRIP } from '@/lib/config'
import { tallyWeeks } from '@/lib/weeks'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dates — Chicama' }

const fmt = (iso: string) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

export default async function DatesPage() {
  const [attendees, votes, windows] = await Promise.all([
    listAttendees(),
    listVotes(),
    listWindows(),
  ])

  const going = attendees.filter((a) => a.status !== 'out')
  const ranked = tallyWeeks(votes)
  const voted = new Set(votes.map((v) => v.attendee_id))
  const notVoted = going.filter((a) => !voted.has(a.id))
  const anyVotes = votes.length > 0
  const nameOf = (id: number) => {
    const a = attendees.find((x) => x.id === id)
    return a ? a.nickname || a.name : 'someone'
  }

  return (
    <Page
      marker={`Window · ${TRIP.window.label}`}
      title="Dates"
      lede="Three weeks, picked on five years of conditions at the point. Say yes to every one you could make — most yeses wins, and a maybe counts half."
    >
      <div className="space-y-4">
        {ranked.map((week, i) => {
          const leading = i === 0 && anyVotes && week.points > 0
          const notSaid = going.length - week.yes - week.maybe - week.no
          return (
            <section
              key={week.key}
              className={'card p-5 md:p-6 ' + (leading ? 'border-l-2 border-l-ochre' : '')}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="display text-2xl">{week.label}</h2>
                {leading && <span className="marker text-ochre">Leading</span>}
              </div>
              <p className="mono text-xs text-slate2 mt-1">
                {fmt(week.start)} → {fmt(week.end)}
              </p>
              <p className="text-slate2 mt-3 max-w-2xl">{week.pitch}</p>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-sm">
                <div>
                  <dt className="label mb-0.5">Good days</dt>
                  <dd className="mono text-lg">{week.good}%</dd>
                </div>
                <div>
                  <dt className="label mb-0.5">Firing</dt>
                  <dd className="mono text-lg">{week.firing}%</dd>
                </div>
                <div>
                  <dt className="label mb-0.5">Mean swell</dt>
                  <dd className="mono text-lg">{week.swellFt.toFixed(1)} ft</dd>
                </div>
                <div>
                  <dt className="label mb-0.5">Mean period</dt>
                  <dd className="mono text-lg">{week.periodS.toFixed(1)} s</dd>
                </div>
              </dl>

              <div className="mt-5 pt-4 border-t border-hairline">
                {going.length === 0 ? (
                  <p className="text-sm text-slate2">No votes yet.</p>
                ) : (
                  <>
                    <div className="flex h-2 w-full overflow-hidden bg-bone2" aria-hidden>
                      <span
                        style={{ width: `${(week.yes / going.length) * 100}%`, background: 'var(--ink)' }}
                      />
                      <span
                        style={{ width: `${(week.maybe / going.length) * 100}%`, background: 'var(--ochre)' }}
                      />
                      <span
                        style={{
                          width: `${(week.no / going.length) * 100}%`,
                          background: 'var(--rust)',
                          opacity: 0.4,
                        }}
                      />
                    </div>
                    <p className="mono text-xs text-slate2 mt-2">
                      {week.yes} yes · {week.maybe} maybe · {week.no} no
                      {notSaid > 0 && ` · ${notSaid} not said`}
                    </p>
                  </>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {!anyVotes && (
        <div className="mt-6">
          <Notice title="Nobody has voted yet">
            <p>Three buttons on your own page and you are done — it takes about ten seconds.</p>
            <p>
              <Link href="/me" className="underline underline-offset-2 text-ink">
                Cast your vote
              </Link>
            </p>
          </Notice>
        </div>
      )}

      {notVoted.length > 0 && anyVotes && (
        <p className="mt-6 text-sm text-slate2">
          Still to vote: {notVoted.map((a) => a.nickname || a.name).join(', ')}.
        </p>
      )}

      {windows.length > 0 && (
        <section className="mt-14">
          <p className="marker mb-4">Dates people suggested instead</p>
          <ul className="text-sm divide-y divide-hairline border-t border-hairline">
            {windows.map((w) => (
              <li key={w.id} className="py-2.5 flex flex-wrap gap-x-4 justify-between">
                <span className="font-medium">{nameOf(w.attendee_id)}</span>
                <span className="mono text-slate2">
                  {fmt(w.window_start.slice(0, 10))} – {fmt(w.window_end.slice(0, 10))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  )
}
