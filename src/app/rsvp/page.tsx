import { cookies } from 'next/headers'
import Link from 'next/link'
import RsvpForm from '@/components/RsvpForm'
import { Notice, Page } from '@/components/ui'
import { getByToken } from '@/lib/guests'
import { isDbReady } from '@/lib/db'
import { EDIT_COOKIE } from '@/lib/auth'
import { WEDDING, real } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'RSVP' }

export default async function RsvpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const store = await cookies()
  // A token in the URL wins, so an edit link works on a phone that has never
  // opened the form before.
  const token = params.token ?? store.get(EDIT_COOKIE)?.value ?? null
  const guest = token ? await getByToken(token) : null

  if (!isDbReady()) {
    return (
      <Page marker="RSVP" title="Not switched on yet">
        <Notice title="The form needs somewhere to put replies" tone="warn">
          <p>
            Add a Neon database to this project and set <span className="mono">DATABASE_URL</span>,
            then run <span className="mono">npm run migrate</span>. Every other page works without
            it.
          </p>
        </Notice>
      </Page>
    )
  }

  const rsvpBy = real(WEDDING.date.rsvpBy)

  return (
    <Page
      marker={guest ? `Your reply · ${guest.name}` : 'RSVP'}
      title={guest ? 'Your reply' : 'Will you come?'}
      lede={
        guest
          ? 'Change anything and save. This is your reply and nobody else can overwrite it.'
          : `One pass, and only your name is required.${rsvpBy ? ` We need answers by ${rsvpBy}, but a rough yes now beats a precise one later.` : ''}`
      }
    >
      <RsvpForm guest={guest} />

      {guest && (
        <div className="mt-8 space-y-2 text-sm text-muted">
          <p>
            Bookmark{' '}
            <Link
              href={`/rsvp?token=${guest.edit_token}`}
              className="mono underline underline-offset-2 text-ink break-all"
            >
              /rsvp?token={guest.edit_token}
            </Link>{' '}
            to edit this from another device.
          </p>
          <p>
            Replying for someone else too?{' '}
            <Link href="/rsvp?token=" className="underline underline-offset-2 text-ink">
              Start a fresh reply
            </Link>{' '}
            — it will be its own row rather than overwriting yours.
          </p>
        </div>
      )}
    </Page>
  )
}
