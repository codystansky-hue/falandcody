import { Page, Stat } from '@/components/ui'
import { listAttendees, passportRisk } from '@/lib/attendees'
import { GEAR_ITEMS, TRIP } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Organiser — Chicama' }

export default async function AdminPage() {
  const attendees = await listAttendees()
  const going = attendees.filter((a) => a.status !== 'out')

  const rooms = TRIP.venue.rooms.map((room) => ({
    ...room,
    wanted: going.filter((a) => a.room_pref === room.key).length,
  }))
  const noPreference = going.filter((a) => !a.room_pref || a.room_pref === 'any').length

  const rentals = going.filter((a) => a.rental_needed)
  const dietary = going.filter((a) => a.dietary)
  const passportIssues = going.filter(
    (a) => passportRisk(a.passport_expiry, TRIP.window.end) === 'expired',
  )
  const missingPassport = going.filter((a) => !a.passport_expiry)
  const unpaid = going.filter((a) => a.paid_status === 'unpaid')

  const gearCounts = GEAR_ITEMS.map((item) => ({
    ...item,
    count: going.filter((a) => a.bringing_gear.includes(item.key)).length,
  }))

  return (
    <Page
      marker="Organiser"
      title="Everything at once"
      lede="The whole trip on one screen, and a CSV when you need it somewhere else."
    >
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-10">
        <Stat label="Going" value={going.length} sub={`${attendees.length} replies`} />
        <Stat
          label="Flights booked"
          value={going.filter((a) => a.arrival_at).length}
          sub={`of ${going.length}`}
        />
        <Stat label="On the shuttle" value={going.filter((a) => a.needs_transfer).length} />
        <Stat label="Not paid" value={unpaid.length} />
      </div>

      <div className="flex flex-wrap gap-3 mb-12">
        <a href="/api/admin/export" className="btn">
          Download CSV
        </a>
      </div>

      {(passportIssues.length > 0 || missingPassport.length > 0) && (
        <section className="mb-12">
          <p className="marker mb-3">Passports</p>
          <div className="card border-l-2 border-l-rust p-5 text-sm space-y-2">
            {passportIssues.length > 0 && (
              <p>
                <span className="font-semibold text-rust">
                  {passportIssues.map((a) => a.nickname || a.name).join(', ')}
                </span>{' '}
                {passportIssues.length === 1 ? 'has' : 'have'} under six months of validity past the
                end of the window. Peru will refuse entry — chase this before anyone books.
              </p>
            )}
            {missingPassport.length > 0 && (
              <p className="text-slate2">
                Not said yet: {missingPassport.map((a) => a.nickname || a.name).join(', ')}.
              </p>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        <section>
          <p className="marker mb-3">Rooms wanted</p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            {rooms.map((room) => (
              <div key={room.key} className="flex justify-between py-2.5">
                <dt>
                  {room.label} <span className="text-slate2">({room.count} exist)</span>
                </dt>
                <dd className="mono">{room.wanted}</dd>
              </div>
            ))}
            <div className="flex justify-between py-2.5">
              <dt className="text-slate2">No preference</dt>
              <dd className="mono">{noPreference}</dd>
            </div>
          </dl>
        </section>

        <section>
          <p className="marker mb-3">Gear coming with us</p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            {gearCounts.map((item) => (
              <div key={item.key} className="flex justify-between py-2.5">
                <dt>{item.label}</dt>
                <dd className="mono">{item.count}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <p className="marker mb-3">Rentals to arrange</p>
          {rentals.length === 0 ? (
            <p className="text-sm text-slate2">Nobody has asked for rental gear.</p>
          ) : (
            <ul className="text-sm divide-y divide-hairline border-t border-hairline">
              {rentals.map((a) => (
                <li key={a.id} className="py-2.5">
                  <span className="font-medium">{a.nickname || a.name}</span>
                  <span className="text-slate2"> — {a.rental_needed}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="marker mb-3">Kitchen needs to know</p>
          {dietary.length === 0 ? (
            <p className="text-sm text-slate2">Nothing flagged.</p>
          ) : (
            <ul className="text-sm divide-y divide-hairline border-t border-hairline">
              {dietary.map((a) => (
                <li key={a.id} className="py-2.5">
                  <span className="font-medium">{a.nickname || a.name}</span>
                  <span className="text-slate2"> — {a.dietary}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  )
}
