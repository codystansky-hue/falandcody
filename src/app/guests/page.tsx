import Link from 'next/link'
import { Notice, Page, Pill } from '@/components/ui'
import { hasReplied, headcount, listGuests, tally, type Guest } from '@/lib/guests'
import { SIDES, WEDDING, real } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Who’s coming' }

const sideLabel = (key: string) => SIDES.find((s) => s.key === key)?.label ?? ''

/**
 * Deliberately thin. This page is for guests, so it shows who is coming and
 * what they wrote — not emails, phone numbers, addresses, flight times or
 * anything else somebody handed over for logistics. That lives behind /admin.
 */
function Card({ guest }: { guest: Guest }) {
  const party = headcount(guest)
  const withThem = [
    guest.plus_one ? guest.plus_one_name || 'plus one' : null,
    guest.kids > 0 ? `${guest.kids} ${guest.kids === 1 ? 'child' : 'children'}` : null,
  ].filter(Boolean)

  return (
    <article className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="display text-xl leading-tight">{guest.name}</h2>
          {withThem.length > 0 && (
            <p className="text-sm text-muted">with {withThem.join(' and ')}</p>
          )}
        </div>
        <Pill tone={guest.status === 'yes' ? 'solid' : 'quiet'}>
          {guest.status === 'yes' ? 'coming' : guest.status === 'maybe' ? 'maybe' : 'cannot'}
        </Pill>
      </div>

      {guest.message && (
        <blockquote className="text-sm border-l-2 border-hairline pl-3 text-muted italic">
          {guest.message}
        </blockquote>
      )}

      <div className="flex flex-wrap gap-2 mt-auto pt-1 items-center">
        {guest.side !== 'both' && <Pill>{sideLabel(guest.side)}</Pill>}
        {guest.origin_city && <Pill>from {guest.origin_city}</Pill>}
        {party > 1 && <Pill>{party} seats</Pill>}
      </div>
    </article>
  )
}

export default async function GuestsPage() {
  const guests = (await listGuests()).filter(hasReplied)
  const counts = tally(guests)
  const coming = guests.filter((g) => g.status !== 'no')
  const cannot = guests.filter((g) => g.status === 'no')
  const songs = guests.map((g) => g.song_request).filter((s): s is string => Boolean(s))

  return (
    <Page
      marker={`${counts.replied} replies · ${counts.heads} coming${counts.maybe ? ` · ${counts.maybe} maybe` : ''}`}
      title="Who’s coming"
      lede="Everyone who has replied so far. If something here is wrong about you, fix it on your own reply — it will update rather than duplicate."
    >
      {guests.length === 0 ? (
        <Notice title="Nobody has replied yet">
          <p>
            Send the link and the passphrase around. The first reply lands here.
          </p>
          <p>
            <Link href="/rsvp" className="underline underline-offset-2 text-ink">
              Be the first
            </Link>
          </p>
        </Notice>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coming.map((guest) => (
              <Card key={guest.id} guest={guest} />
            ))}
          </div>

          {cannot.length > 0 && (
            <section className="mt-12">
              <p className="marker mb-3">Sorry to miss it</p>
              <p className="text-muted">
                {cannot.map((g) => g.name).join(' · ')}
              </p>
            </section>
          )}

          {songs.length > 0 && (
            <section className="mt-12">
              <p className="marker mb-3">
                {songs.length} {songs.length === 1 ? 'song' : 'songs'} requested so far
              </p>
              <ul className="flex flex-wrap gap-2">
                {songs.map((song, i) => (
                  <li key={i} className="chip cursor-default">
                    {song}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {real(WEDDING.contact.email) && (
        <p className="mt-12 text-sm text-muted">
          Something here you would rather we took down? Mail{' '}
          <a href={`mailto:${WEDDING.contact.email}`} className="underline underline-offset-2">
            {WEDDING.contact.email}
          </a>{' '}
          and it goes.
        </p>
      )}
    </Page>
  )
}
