import Link from 'next/link'
import { Notice, Page, Todo } from '@/components/ui'
import { WEDDING, eventDate, formatDate, real, weddingDate } from '@/lib/config'
import { headcountFor, listGuests } from '@/lib/guests'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Schedule' }

export default async function SchedulePage() {
  const guests = await listGuests()
  const date = weddingDate()

  // Group by day, so a two-event Saturday reads as one Saturday rather than as
  // two disconnected cards.
  const days = new Map<number, typeof WEDDING.events[number][]>()
  for (const event of WEDDING.events) {
    const list = days.get(event.dayOffset) ?? []
    list.push(event)
    days.set(event.dayOffset, list)
  }
  const ordered = [...days.entries()].sort((a, b) => a[0] - b[0])

  return (
    <Page
      marker={real(WEDDING.venue.town) ?? 'The weekend'}
      title="The weekend"
      lede={
        date
          ? 'Everything, in order. Tick the parts you are coming to on your reply and we will have a chair for you.'
          : 'The shape of the weekend. Times and places land here as we lock them in.'
      }
    >
      {!date && (
        <div className="mb-8">
          <Notice title="The date is not fixed yet">
            <p>
              These are the events we are planning, in order. Once the date is booked, real dates
              appear against each one.
            </p>
          </Notice>
        </div>
      )}

      <ol className="space-y-8">
        {ordered.map(([offset, events]) => {
          const when = eventDate({ dayOffset: offset })
          return (
            <li key={offset}>
              <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                <h2 className="display text-2xl">
                  {when ? formatDate(when) : offset === 0 ? 'The day itself' : `Day ${offset > 0 ? '+' : ''}${offset}`}
                </h2>
                {offset === 0 && <span className="marker">the day itself</span>}
              </div>

              <div className="card divide-y divide-hairline">
                {events.map((event) => {
                  const heads = headcountFor(guests, event.key)
                  return (
                    <div key={event.key} className="p-5 grid sm:grid-cols-[9rem_1fr] gap-x-6 gap-y-2">
                      <p className="mono text-sm text-muted">
                        {real(event.time) ?? <Todo what="time to come" />}
                      </p>
                      <div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h3 className="display text-xl">{event.name}</h3>
                          {heads > 0 && (
                            <span className="marker">{heads} coming so far</span>
                          )}
                        </div>
                        <p className="text-sm text-muted mt-1">
                          {real(event.where) ?? <Todo what="place to come" />}
                        </p>
                        {real(event.note) && <p className="text-sm mt-2">{event.note}</p>}
                        {real(event.dressCode) && (
                          <p className="text-sm mt-2">
                            <span className="label inline-block mb-0 mr-2">Wear</span>
                            {event.dressCode}
                          </p>
                        )}
                        {event.optional && (
                          <p className="text-xs text-muted mt-2">
                            Come if you can — no need to feel bad if you cannot.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/rsvp" className="btn">
          Tell us which parts
        </Link>
        <Link href="/stay" className="btn btn-quiet">
          Where to stay
        </Link>
      </div>
    </Page>
  )
}
