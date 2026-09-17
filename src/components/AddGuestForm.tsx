'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MAX_PLUS_ONES, SIDES } from '@/lib/config'

const empty = {
  name: '',
  email: '',
  phone: '',
  side: 'both',
  notes: '',
  postal_address: '',
  plus_one_name: '',
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

export function EditPlusOne({
  guestId,
  token,
  plusOneName,
}: {
  guestId: number
  token: string
  plusOneName: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(plusOneName ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const name = value.trim()
    try {
      const res = await fetch('/api/admin/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          edit_token: token,
          plus_one: Boolean(name),
          plus_one_name: name,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? `Save failed (${res.status})`)
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(plusOneName ?? '')
          setError(null)
          setOpen(true)
        }}
        className="btn btn-quiet py-1.5 px-3 text-xs shrink-0"
      >
        {plusOneName ? 'Edit plus-one' : 'Name plus-one'}
      </button>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label className="sr-only" htmlFor={`edit-plus-one-${guestId}`}>
        Plus-one name
      </label>
      <input
        id={`edit-plus-one-${guestId}`}
        className="field py-1.5 text-xs w-44"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Plus-one name"
        autoFocus
      />
      <button type="submit" className="btn py-1.5 px-3 text-xs" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        className="btn btn-quiet py-1.5 px-3 text-xs"
        disabled={saving}
        onClick={() => setOpen(false)}
      >
        Cancel
      </button>
      {error && (
        <p className="text-sm text-rose" role="alert">
          {error}
        </p>
      )}
    </form>
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
      const plusOneName = draft.plus_one_name.trim()
      const res = await fetch('/api/admin/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          plusOneName
            ? { ...draft, plus_one: true, plus_one_name: plusOneName }
            : {
                name: draft.name,
                email: draft.email,
                phone: draft.phone,
                postal_address: draft.postal_address,
                side: draft.side,
                notes: draft.notes,
              },
        ),
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

        {MAX_PLUS_ONES > 0 && (
          <Field name="add-guest-plus-one" label="Plus-one name" span>
            <input
              id="add-guest-plus-one"
              className="field"
              autoComplete="off"
              placeholder="Optional — stays on this invitation"
              value={draft.plus_one_name}
              onChange={(e) => set('plus_one_name', e.target.value)}
            />
          </Field>
        )}

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
