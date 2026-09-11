'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SIDES } from '@/lib/config'

const empty = {
  name: '',
  email: '',
  phone: '',
  side: 'both',
  notes: '',
  postal_address: '',
}

function Field({
  name,
  label,
  span,
  children,
}: {
  name: string
  label: string
  span?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function CopyRsvpLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/rsvp?token=${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be blocked; the path is still in the DOM to copy by hand.
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-quiet py-1.5 px-3 text-xs shrink-0">
      {copied ? 'Copied' : 'Copy RSVP link'}
    </button>
  )
}

export default function AddGuestForm() {
  const router = useRouter()
  const nameRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<{ name: string; edit_token: string } | null>(null)

  const set = (key: keyof typeof empty, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        edit_token?: string
      }
      if (!res.ok) throw new Error(json.error ?? `Save failed (${res.status})`)
      if (!json.edit_token) throw new Error('Save failed.')
      setAdded({ name: draft.name.trim(), edit_token: json.edit_token })
      setDraft(empty)
      router.refresh()
      nameRef.current?.focus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-5 space-y-5">
      {added && (
        <div className="border border-hairline p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-medium">{added.name}</span>
            <span className="text-muted"> is on the list. They will not show on Who’s coming until they RSVP.</span>
          </p>
          <CopyRsvpLink token={added.edit_token} />
        </div>
      )}

      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Field name="add-guest-name" label="Name">
          <input
            ref={nameRef}
            id="add-guest-name"
            className="field"
            required
            autoComplete="name"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>

        <Field name="add-guest-side" label="Side">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Side">
            {SIDES.map((side) => (
              <button
                key={side.key}
                type="button"
                className="chip"
                aria-pressed={draft.side === side.key}
                onClick={() => set('side', side.key)}
              >
                {side.label}
              </button>
            ))}
          </div>
        </Field>

        <Field name="add-guest-email" label="Email">
          <input
            id="add-guest-email"
            type="email"
            className="field"
            autoComplete="email"
            value={draft.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <Field name="add-guest-phone" label="Phone (with country code)">
          <input
            id="add-guest-phone"
            className="field mono"
            placeholder="+1 555 000 0000"
            autoComplete="tel"
            value={draft.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>

        <Field name="add-guest-address" label="Postal address" span>
          <textarea
            id="add-guest-address"
            className="field"
            rows={2}
            value={draft.postal_address}
            onChange={(e) => set('postal_address', e.target.value)}
          />
        </Field>

        <Field name="add-guest-notes" label="Organiser notes" span>
          <textarea
            id="add-guest-notes"
            className="field"
            rows={2}
            placeholder="Only you two see this"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-1">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : added ? 'Add another' : 'Add guest'}
          </button>
          {error && (
            <p className="text-sm text-rose" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
