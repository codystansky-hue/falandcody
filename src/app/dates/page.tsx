import Link from 'next/link'
import { Notice, Page } from '@/components/ui'
import { listAttendees, listWindows } from '@/lib/attendees'
import { TRIP } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dates — Chicama' }

const DAY_MS = 86_400_000

// Weeks running Saturday to Saturday, because that is how the hotel sells them
// and how everyone books flights.
function weeksIn(startISO: string, endISO: string) {
  const weeks: { start: Date; end: Date }[] = []
  const cursor = new Date(startISO + 'T12:00:00Z')
  while (cursor.getUTCDay() !== 6) cursor.setUTCDate(cursor.getUTCDate() + 1)
  const last = new Date(endISO + 'T12:00:00Z')
  while (cursor <= last) {
    const start = new Date(cursor)
    const end = new Date(cursor.getTime() + 7 * DAY_MS)
    weeks.push({ start, end })
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return weeks
}

// April and September are the two months that almost never miss at Chicama.
const PRIME_MONTHS = [3, 8]

export default async function DatesPage() {
  const [attendees, windows] = await Promise.all([listAttendees(), listWindows()])
  const going = attendees.filter((a) => a.status !== 'out')
  const weeks = weeksIn(TRIP.window.start, TRIP.window.end)

  const byAttendee = new Map<number, { start: number; end: number }[]>()
  for (const w of windows) {
    const list = byAttendee.get(w.attendee_id) ?? []
    list.push({
      start: new Date(w.window_start).getTime(),
      end: new Date(w.window_end).getTime(),
    })
    byAttendee.set(w.attendee_id, list)
  }

  const free = (attendeeId: number, week: { start: Date; end: Date }) =>
    (byAttendee.get(attendeeId) ?? []).some(
      (w) => w.start <= week.start.getTime() && w.end >= week.end.getTime() - DAY_MS,
    )

  const counts = weeks.map((week) => going.filter((a) => free(a.id, week)).length)
  const best = Math.max(0, ...counts)
  const withWindows = going.filter((a) => (byAttendee.get(a.id) ?? []).length > 0)

  return (
    <Page
      marker={`Window · ${TRIP.window.label}`}
      title="Dates"
      lede="Every week in the season, and how many of the crew can actually make it. The tallest bars in April or September are the ones worth booking."
    >
      {withWindows.length === 0 ? (
        <Notice title="Nobody has said when they can get away">
          <p>
            The overlap grid fills in as people add their weeks at the bottom of their own page.
          </p>
          <p>
            <Link href="/me" className="underline underline-offset-2 text-ink">
              Add your weeks
            </Link>
          </p>
        </Notice>
      ) : (
        <>
          <div className="card p-5 overflow-x-auto">
            <div className="flex items-end gap-[3px] h-48 min-w-[48rem]">
              {weeks.map((week, i) => {
                const count = counts[i]
                const isBest = count > 0 && count === best
                const prime = PRIME_MONTHS.includes(week.start.getUTCMonth())
                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                    <span className="mono text-[0.6rem] text-slate2">{count || ''}</span>
                    <div
                      className="w-full transition-all"
                      style={{
                        height: `${going.length ? (count / going.length) * 100 : 0}%`,
                        minHeight: count ? 3 : 0,
                        background: isBest ? 'var(--ochre)' : 'var(--sea)',
                        opacity: isBest ? 1 : prime ? 0.5 : 0.28,
                      }}
                      title={`${week.start.toISOString().slice(0, 10)} — ${count} of ${going.length}`}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-[3px] mt-2 min-w-[48rem]">
              {weeks.map((week, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="mono text-[0.55rem] text-slate2">
                    {week.start.getUTCDate() <= 7
                      ? week.start.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
                      : ''}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate2 mt-4">
              Ochre is the best-covered week. The half-lit bars are April and September, when the
              swell almost never misses — a week there is worth one fewer person.
            </p>
          </div>

          <section className="mt-10">
            <p className="marker mb-4">Who said what</p>
            <ul className="divide-y divide-hairline border-t border-hairline">
              {going.map((person) => {
                const list = byAttendee.get(person.id) ?? []
                return (
                  <li key={person.id} className="py-3 flex flex-wrap gap-x-4 gap-y-1 justify-between">
                    <span className="font-medium">{person.nickname || person.name}</span>
                    <span className="mono text-sm text-slate2">
                      {list.length === 0
                        ? 'Has not said'
                        : list
                            .map(
                              (w) =>
                                `${new Date(w.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${new Date(w.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`,
                            )
                            .join('  ·  ')}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </Page>
  )
}
