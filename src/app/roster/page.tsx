import Link from 'next/link'
import { Notice, Page } from '@/components/ui'
import { listAttendees, passportRisk, type Attendee } from '@/lib/attendees'
import { FOIL_LEVELS, GEAR_ITEMS, TRIP } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Crew — Chicama' }

const foilLabel = (key: string | null) =>
  FOIL_LEVELS.find((l) => l.key === key)?.label.split(' — ')[0] ?? 'Not said'

const gearLabel = (key: string) => GEAR_ITEMS.find((g) => g.key === key)?.label ?? key

function peruTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'America/Lima',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Card({ person }: { person: Attendee }) {
  const passport = passportRisk(person.passport_expiry, TRIP.window.end)
  const landing = peruTime(person.arrival_at)

  return (
    <article className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="display text-xl leading-tight">{person.nickname || person.name}</h2>
          {person.nickname && <p className="text-sm text-slate2">{person.name}</p>}
        </div>
        <span
          className={
            'mono text-[0.65rem] uppercase tracking-widest px-2 py-1 shrink-0 ' +
            (person.status === 'in'
              ? 'bg-ink text-foam'
              : person.status === 'maybe'
                ? 'border border-ochre text-ochre'
                : 'border border-hairline text-slate2')
          }
        >
          {person.status}
        </span>
      </div>

      <dl className="text-sm space-y-1.5">
        <div className="flex gap-2">
          <dt className="text-slate2 w-24 shrink-0">From</dt>
          <dd>
            {person.origin_city || '—'}
            {person.origin_airport && <span className="mono text-slate2"> · {person.origin_airport}</span>}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate2 w-24 shrink-0">Lands</dt>
          <dd className="mono">
            {landing ? (
              <>
                {landing}
                {person.arrival_flight && <span className="text-slate2"> · {person.arrival_flight}</span>}
              </>
            ) : (
              <span className="text-slate2">Not booked</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate2 w-24 shrink-0">Foiling</dt>
          <dd>{foilLabel(person.foil_level)}</dd>
        </div>
        {person.bringing_gear.length > 0 && (
          <div className="flex gap-2">
            <dt className="text-slate2 w-24 shrink-0">Bringing</dt>
            <dd>{person.bringing_gear.map(gearLabel).join(', ')}</dd>
          </div>
        )}
        {person.rental_needed && (
          <div className="flex gap-2">
            <dt className="text-slate2 w-24 shrink-0">Renting</dt>
            <dd>{person.rental_needed}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap gap-2 mt-auto pt-1">
        {person.needs_transfer && (
          <span className="mono text-[0.65rem] uppercase tracking-widest text-slate2 border border-hairline px-2 py-1">
            Shuttle
          </span>
        )}
        {passport === 'expired' && (
          <span className="mono text-[0.65rem] uppercase tracking-widest text-rust border border-rust px-2 py-1">
            Passport too short
          </span>
        )}
      </div>
    </article>
  )
}

export default async function RosterPage() {
  const attendees = await listAttendees()
  const counts = {
    in: attendees.filter((a) => a.status === 'in').length,
    maybe: attendees.filter((a) => a.status === 'maybe').length,
    booked: attendees.filter((a) => a.arrival_at).length,
  }

  return (
    <Page
      marker={`${attendees.length} replies · ${counts.in} in · ${counts.maybe} maybe · ${counts.booked} booked`}
      title="The crew"
      lede="Everyone who has filled the form in. If something here is wrong about you, fix it on your own page."
    >
      {attendees.length === 0 ? (
        <Notice title="Nobody has filled it in yet">
          <p>Send the link and the passphrase to the group. The first entry lands here.</p>
          <p>
            <Link href="/me" className="underline underline-offset-2 text-ink">
              Add yourself first
            </Link>
          </p>
        </Notice>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {attendees.map((person) => (
            <Card key={person.id} person={person} />
          ))}
        </div>
      )}
    </Page>
  )
}
