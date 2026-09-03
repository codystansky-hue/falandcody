import { cookies } from 'next/headers'
import Link from 'next/link'
import AttendeeForm from '@/components/AttendeeForm'
import { Notice, Page } from '@/components/ui'
import { getByToken, windowsFor } from '@/lib/attendees'
import { isDbReady } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Your details — Chicama' }

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const store = await cookies()
  // A token in the URL wins, so an edit link works on a phone that has never
  // opened the form before.
  const token = params.token ?? store.get('chicama_me')?.value ?? null

  const attendee = token ? await getByToken(token) : null
  const windows = attendee ? await windowsFor(attendee.id) : []

  if (!isDbReady()) {
    return (
      <Page marker="Your details" title="No database yet">
        <Notice title="The form needs somewhere to put things" tone="warn">
          <p>
            Add the Neon integration to this Vercel project and redeploy. Everything else on the
            site works without it.
          </p>
        </Notice>
      </Page>
    )
  }

  return (
    <Page
      marker={attendee ? `Editing · ${attendee.name}` : 'New entry'}
      title={attendee ? 'Your details' : 'Get on the wave'}
      lede={
        attendee
          ? 'Change anything and save. This is your row, nobody else can overwrite it.'
          : 'One pass down the point. Only your name is required — flights and sizes can come later.'
      }
    >
      <AttendeeForm attendee={attendee} windows={windows} />

      {attendee && (
        <p className="mt-8 text-sm text-slate2">
          Bookmark{' '}
          <Link
            href={`/me?token=${attendee.edit_token}`}
            className="mono underline underline-offset-2 text-ink break-all"
          >
            /me?token={attendee.edit_token}
          </Link>{' '}
          to edit this from another device.
        </p>
      )}
    </Page>
  )
}
