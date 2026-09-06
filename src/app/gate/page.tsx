import { WEDDING, real } from '@/lib/config'

export const metadata = { title: 'Come in' }

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; scope?: string; error?: string }>
}) {
  const params = await searchParams
  const admin = params.scope === 'admin'

  const names = real(WEDDING.couple.joined)
  const town = real(WEDDING.venue.town)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {town && <p className="marker mb-3">{town}</p>}
        <h1 className="display text-5xl mb-2">{names ?? 'Our wedding'}</h1>
        <p className="text-muted mb-8">
          {admin
            ? 'Organiser view.'
            : 'The word is on your invitation. If you cannot find it, ask us — it is not a test.'}
        </p>

        <form action="/api/gate" method="post" className="space-y-4">
          <input type="hidden" name="next" value={params.next ?? '/'} />
          {admin && <input type="hidden" name="scope" value="admin" />}
          <div>
            <label className="label" htmlFor="passphrase">
              {admin ? 'Organiser passphrase' : 'Passphrase'}
            </label>
            <input
              id="passphrase"
              name="passphrase"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="field mono"
            />
          </div>
          {params.error && (
            <p className="text-sm text-rose" role="alert">
              That is not it. Try again.
            </p>
          )}
          <button type="submit" className="btn w-full">
            {admin ? 'Unlock organiser view' : 'Come in'}
          </button>
        </form>

        {!admin && real(WEDDING.contact.email) && (
          <p className="text-sm text-muted mt-6">
            Stuck?{' '}
            <a href={`mailto:${WEDDING.contact.email}`} className="underline underline-offset-2">
              {WEDDING.contact.email}
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
