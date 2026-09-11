import { Notice, Page, Stat } from '@/components/ui'
import AddGuestForm, { CopyRsvpLink } from '@/components/AddGuestForm'
import { headcountFor, listGuests, mightAttend, passportRisk, tally } from '@/lib/guests'
import { SIDES, STAY_OPTIONS, WEDDING, outstanding } from '@/lib/config'
import { isDbReady } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Organiser' }

export default async function AdminPage() {
  const guests = await listGuests()
  const counts = tally(guests)
  const coming = guests.filter(mightAttend)
  const invited = guests.filter((g) => g.status === 'invited')
  const dbReady = isDbReady()
  const sideLabel = (key: string) => SIDES.find((s) => s.key === key)?.label ?? key

  const dietary = coming.filter((g) => g.dietary)
  const songs = guests.filter((g) => g.song_request)
  const addresses = guests.filter((g) => g.postal_address)
  const noContact = guests.filter((g) => !g.email && !g.phone)

  const passportShort = coming.filter((g) => passportRisk(g.passport_expiry) === 'short')
  const passportMissing =
    WEDDING.travel.passportMonthsRequired > 0 ? coming.filter((g) => !g.passport_expiry) : []

  const stays = STAY_OPTIONS.map((option) => ({
    ...option,
    count: coming.filter((g) => g.stay_pref === option.key).length,
  }))

  const todos = outstanding()

  return (
    <Page
      marker="Organiser"
      title="Everything at once"
      lede="The whole thing on one screen, and a CSV when you need it in a spreadsheet."
    >
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-10">
        <Stat label="Coming" value={counts.heads} sub={`${counts.yes} replies said yes`} />
        <Stat
          label="If the maybes come"
          value={counts.headsIfMaybes}
          sub={`${counts.maybe} still deciding`}
        />
        <Stat label="Children" value={counts.kids} sub="Among the yeses" />
        <Stat label="Cannot come" value={counts.no} sub={`${counts.replied} replies in total`} />
      </div>

      <div className="flex flex-wrap gap-3 mb-12">
        <a href="/api/admin/export" className="btn">
          Download CSV
        </a>
        <a href="/api/admin/export?what=addresses" className="btn btn-quiet">
          Addresses only
        </a>
      </div>

      <section className="mb-12">
        <p className="marker mb-3">Add a guest</p>
        <p className="text-sm text-muted mb-5 max-w-2xl">
          Seed the list yourselves — name is enough. They stay off Who’s coming until they RSVP
          with the link you copy after saving. Plus-ones and children wait for that reply.
        </p>
        {dbReady ? (
          <AddGuestForm />
        ) : (
          <Notice title="The form needs somewhere to put guests" tone="warn">
            <p>
              Add a Neon database and set <span className="mono">DATABASE_URL</span>, then run{' '}
              <span className="mono">npm run migrate</span>.
            </p>
          </Notice>
        )}
      </section>

      {invited.length > 0 && (
        <section className="mb-12">
          <p className="marker mb-3">
            {invited.length} {invited.length === 1 ? 'guest' : 'guests'} invited, not yet replied
          </p>
          <ul className="card divide-y divide-hairline">
            {invited.map((g) => (
              <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{g.name}</p>
                  <p className="text-sm text-muted">
                    {[sideLabel(g.side), g.email, g.phone].filter(Boolean).join(' · ')}
                  </p>
                  {g.notes && <p className="text-sm text-muted mt-1">{g.notes}</p>}
                </div>
                <CopyRsvpLink token={g.edit_token} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The setup checklist. Every string in config.ts still marked TODO,
          listed by its exact path so it can be found in seconds. */}
      {todos.length > 0 && (
        <section className="mb-12">
          <p className="marker mb-3">
            {todos.length} {todos.length === 1 ? 'thing' : 'things'} still to fill in
          </p>
          <Notice title="Placeholders in src/lib/config.ts">
            <p>
              Each of these is still a <span className="mono">TODO:</span> string. Guests see an
              honest &ldquo;not decided yet&rdquo; wherever one appears; delete the prefix and write
              the real value.
            </p>
            <ul className="mono text-xs grid sm:grid-cols-2 gap-x-6 gap-y-1 pt-2">
              {todos.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          </Notice>
        </section>
      )}

      {(passportShort.length > 0 || passportMissing.length > 0) && (
        <section className="mb-12">
          <p className="marker mb-3">Passports</p>
          <div className="card border-l-2 border-l-rose p-5 text-sm space-y-2">
            {passportShort.length > 0 && (
              <p>
                <span className="font-semibold text-rose">
                  {passportShort.map((g) => g.name).join(', ')}
                </span>{' '}
                {passportShort.length === 1 ? 'has' : 'have'} under{' '}
                {WEDDING.travel.passportMonthsRequired} months of validity past the wedding date.
                Chase this before they book anything.
              </p>
            )}
            {passportMissing.length > 0 && (
              <p className="text-muted">
                Not said yet: {passportMissing.map((g) => g.name).join(', ')}.
              </p>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        <section>
          <p className="marker mb-3">Heads per event</p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            {WEDDING.events.map((event) => (
              <div key={event.key} className="flex justify-between py-2.5">
                <dt>
                  {event.name}
                  {event.optional && <span className="text-muted"> (optional)</span>}
                </dt>
                <dd className="mono">{headcountFor(guests, event.key)}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted mt-2">
            Counting plus-ones and children, from the yeses and maybes who ticked each one.
          </p>
        </section>

        <section>
          <p className="marker mb-3">Where they are sleeping</p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            {stays.map((stay) => (
              <div key={stay.key} className="flex justify-between py-2.5">
                <dt>{stay.label}</dt>
                <dd className="mono">{stay.count}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <p className="marker mb-3">Kitchen needs to know</p>
          {dietary.length === 0 ? (
            <p className="text-sm text-muted">Nothing flagged.</p>
          ) : (
            <ul className="text-sm divide-y divide-hairline border-t border-hairline">
              {dietary.map((g) => (
                <li key={g.id} className="py-2.5">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted"> — {g.dietary}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="marker mb-3">Loose ends</p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            <div className="flex justify-between py-2.5">
              <dt>Postal addresses collected</dt>
              <dd className="mono">
                {addresses.length}/{guests.length}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt>Invited, not yet replied</dt>
              <dd className="mono">{counts.invited}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt>No email or phone</dt>
              <dd className="mono">{noContact.length}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt>Song requests</dt>
              <dd className="mono">{songs.length}</dd>
            </div>
            {WEDDING.travel.flyIn && (
              <>
                <div className="flex justify-between py-2.5">
                  <dt>Flights booked</dt>
                  <dd className="mono">
                    {counts.booked}/{counts.flying}
                  </dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt>Want a car from the airport</dt>
                  <dd className="mono">{coming.filter((g) => g.needs_transfer).length}</dd>
                </div>
              </>
            )}
          </dl>
        </section>
      </div>

      {songs.length > 0 && (
        <section className="mt-12">
          <p className="marker mb-3">The playlist so far</p>
          <ul className="text-sm divide-y divide-hairline border-t border-hairline">
            {songs.map((g) => (
              <li key={g.id} className="flex justify-between gap-6 py-2.5">
                <span>{g.song_request}</span>
                <span className="text-muted shrink-0">{g.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  )
}
