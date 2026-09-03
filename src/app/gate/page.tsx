import { TRIP } from '@/lib/config'

export const metadata = { title: 'Chicama' }

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; scope?: string; error?: string }>
}) {
  const params = await searchParams
  const admin = params.scope === 'admin'

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="marker mb-3">8°S · 79°W · Puerto Malabrigo</p>
        <h1 className="display text-5xl mb-2">CHICAMA</h1>
        <p className="text-slate2 mb-8">
          {admin ? 'Organiser access.' : `${TRIP.subtitle}. Passphrase is in the group chat.`}
        </p>

        <form action="/api/gate" method="post" className="space-y-4">
          <input type="hidden" name="next" value={params.next ?? '/'} />
          {admin && <input type="hidden" name="scope" value="admin" />}
          <div>
            <label className="label" htmlFor="passphrase">
              Passphrase
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
            <p className="text-sm text-rust" role="alert">
              That is not it. Try again.
            </p>
          )}
          <button type="submit" className="btn w-full">
            {admin ? 'Unlock organiser view' : 'Come in'}
          </button>
        </form>
      </div>
    </div>
  )
}
