'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FOIL_LEVELS, GEAR_ITEMS, PASSPORT_MONTHS_REQUIRED, TRIP } from '@/lib/config'
import type { Attendee, DateVote, Window } from '@/lib/attendees'
import { PROPOSED_WEEKS, type Vote } from '@/lib/weeks'

type Draft = Record<string, string | boolean | string[]>

// datetime-local wants `YYYY-MM-DDTHH:MM` in Peru time; the row holds UTC.
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 16)
}

function Fieldset({
  n,
  title,
  hint,
  children,
}: {
  n: string
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="border-t border-hairline pt-6">
      <legend className="sr-only">{title}</legend>
      <div className="grid md:grid-cols-[13rem_1fr] gap-x-8 gap-y-5">
        <div>
          <p className="marker mb-1">{n}</p>
          <h2 className="display text-xl">{title}</h2>
          {hint && <p className="text-sm text-slate2 mt-1.5">{hint}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 content-start">{children}</div>
      </div>
    </fieldset>
  )
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

export default function AttendeeForm({
  attendee,
  windows,
  votes,
}: {
  attendee: Attendee | null
  windows: Window[]
  votes: DateVote[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [draft, setDraft] = useState<Draft>({
    name: attendee?.name ?? '',
    nickname: attendee?.nickname ?? '',
    status: attendee?.status ?? 'in',
    email: attendee?.email ?? '',
    phone: attendee?.phone ?? '',
    origin_city: attendee?.origin_city ?? '',
    origin_airport: attendee?.origin_airport ?? '',
    arrival_flight: attendee?.arrival_flight ?? '',
    arrival_at: toLocalInput(attendee?.arrival_at ?? null),
    departure_flight: attendee?.departure_flight ?? '',
    departure_at: toLocalInput(attendee?.departure_at ?? null),
    needs_transfer: attendee?.needs_transfer ?? true,
    room_pref: attendee?.room_pref ?? 'any',
    roommate_pref: attendee?.roommate_pref ?? '',
    foil_level: attendee?.foil_level ?? 'never',
    bringing_gear: attendee?.bringing_gear ?? [],
    rental_needed: attendee?.rental_needed ?? '',
    wetsuit_size: attendee?.wetsuit_size ?? '',
    shirt_size: attendee?.shirt_size ?? '',
    dietary: attendee?.dietary ?? '',
    passport_expiry: attendee?.passport_expiry?.slice(0, 10) ?? '',
    emergency_contact: attendee?.emergency_contact ?? '',
    notes: attendee?.notes ?? '',
    flight_cost_usd: attendee?.flight_cost_usd?.toString() ?? '',
  })

  const [weekVotes, setWeekVotes] = useState<Record<string, Vote>>(() =>
    Object.fromEntries(votes.map((v) => [v.week_key, v.vote as Vote])),
  )

  const [ranges, setRanges] = useState<{ start: string; end: string }[]>(
    windows.length
      ? windows.map((w) => ({ start: w.window_start.slice(0, 10), end: w.window_end.slice(0, 10) }))
      : [{ start: '', end: '' }],
  )

  const set = (key: string, value: string | boolean | string[]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }

  const toggleGear = (key: string) => {
    const current = draft.bringing_gear as string[]
    set('bringing_gear', current.includes(key) ? current.filter((g) => g !== key) : [...current, key])
  }

  // Peru turns you away without six months of validity past entry, so this is
  // checked against the end of the window rather than against today.
  const passportShort = (() => {
    const value = draft.passport_expiry
    if (typeof value !== 'string' || !value) return false
    const cutoff = new Date(TRIP.window.end)
    cutoff.setMonth(cutoff.getMonth() + PASSPORT_MONTHS_REQUIRED)
    return new Date(value) < cutoff
  })()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/attendee', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          edit_token: attendee?.edit_token,
          week_votes: weekVotes,
          windows: ranges.filter((r) => r.start && r.end),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `Save failed (${res.status})`)
      setSaved(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <Fieldset n="0m · Malpaso" title="You" hint="Only the name is required. Everything else can wait.">
        <Field name="name" label="Name">
          <input
            id="name"
            className="field"
            required
            value={draft.name as string}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field name="nickname" label="Goes by">
          <input
            id="nickname"
            className="field"
            value={draft.nickname as string}
            onChange={(e) => set('nickname', e.target.value)}
          />
        </Field>
        <Field name="status" label="Are you in?">
          <select
            id="status"
            className="field"
            value={draft.status as string}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="in">In</option>
            <option value="maybe">Maybe</option>
            <option value="out">Cannot make it</option>
          </select>
        </Field>
        <Field name="email" label="Email">
          <input
            id="email"
            type="email"
            className="field"
            value={draft.email as string}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field name="phone" label="Phone (with country code)">
          <input
            id="phone"
            className="field mono"
            placeholder="+1 555 000 0000"
            value={draft.phone as string}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
      </Fieldset>

      <Fieldset
        n="700m · Keys"
        title="Getting there"
        hint={`Everyone lands at ${TRIP.venue.transferFrom} — ${TRIP.venue.transferHours} h from the hotel. Times are Peru time.`}
      >
        <Field name="origin_city" label="Flying from">
          <input
            id="origin_city"
            className="field"
            placeholder="Seattle"
            value={draft.origin_city as string}
            onChange={(e) => set('origin_city', e.target.value)}
          />
        </Field>
        <Field name="origin_airport" label="Home airport (IATA)">
          <input
            id="origin_airport"
            className="field mono uppercase"
            maxLength={4}
            placeholder="SEA"
            value={draft.origin_airport as string}
            onChange={(e) => set('origin_airport', e.target.value.toUpperCase())}
          />
        </Field>
        <Field name="arrival_flight" label="Arriving on flight">
          <input
            id="arrival_flight"
            className="field mono uppercase"
            placeholder="LA2261"
            value={draft.arrival_flight as string}
            onChange={(e) => set('arrival_flight', e.target.value.toUpperCase())}
          />
        </Field>
        <Field name="arrival_at" label="Lands at (Peru time)">
          <input
            id="arrival_at"
            type="datetime-local"
            className="field mono"
            value={draft.arrival_at as string}
            onChange={(e) => set('arrival_at', e.target.value)}
          />
        </Field>
        <Field name="departure_flight" label="Leaving on flight">
          <input
            id="departure_flight"
            className="field mono uppercase"
            value={draft.departure_flight as string}
            onChange={(e) => set('departure_flight', e.target.value.toUpperCase())}
          />
        </Field>
        <Field name="departure_at" label="Departs at (Peru time)">
          <input
            id="departure_at"
            type="datetime-local"
            className="field mono"
            value={draft.departure_at as string}
            onChange={(e) => set('departure_at', e.target.value)}
          />
        </Field>
        <Field name="flight_cost_usd" label="What the flight cost (USD)" span>
          <input
            id="flight_cost_usd"
            type="number"
            min={0}
            className="field mono"
            placeholder="890"
            value={draft.flight_cost_usd as string}
            onChange={(e) => set('flight_cost_usd', e.target.value)}
          />
          <p className="text-xs text-slate2 mt-1.5">
            Only once you have actually booked. It feeds the budget so everyone can see the real
            number rather than an estimate.
          </p>
        </Field>
        <div className="sm:col-span-2">
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={draft.needs_transfer as boolean}
              onChange={(e) => set('needs_transfer', e.target.checked)}
            />
            <span>
              Put me on the hotel shuttle from {TRIP.venue.transferFrom}.
              <span className="text-slate2"> Anyone landing within two hours shares a van.</span>
            </span>
          </label>
        </div>
      </Fieldset>

      <Fieldset
        n="1500m · El Point"
        title="Foiling"
        hint="So the hotel knows what to have ready, and who belongs on the tow-back."
      >
        <Field name="foil_level" label="Where you are at" span>
          <select
            id="foil_level"
            className="field"
            value={draft.foil_level as string}
            onChange={(e) => set('foil_level', e.target.value)}
          >
            {FOIL_LEVELS.map((level) => (
              <option key={level.key} value={level.key}>
                {level.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <p className="label">Bringing your own</p>
          <div className="flex flex-wrap gap-2">
            {GEAR_ITEMS.map((item) => {
              const on = (draft.bringing_gear as string[]).includes(item.key)
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleGear(item.key)}
                  aria-pressed={on}
                  className={
                    'px-3 py-1.5 text-sm border transition-colors ' +
                    (on ? 'bg-ink text-foam border-ink' : 'bg-foam border-hairline hover:bg-bone2')
                  }
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
        <Field name="rental_needed" label="Need to rent" span>
          <input
            id="rental_needed"
            className="field"
            placeholder="Board and foil, 1200 front wing"
            value={draft.rental_needed as string}
            onChange={(e) => set('rental_needed', e.target.value)}
          />
        </Field>
        <Field name="wetsuit_size" label="Wetsuit size">
          <input
            id="wetsuit_size"
            className="field"
            placeholder="MT 3/2"
            value={draft.wetsuit_size as string}
            onChange={(e) => set('wetsuit_size', e.target.value)}
          />
        </Field>
        <Field name="shirt_size" label="Shirt size">
          <input
            id="shirt_size"
            className="field"
            placeholder="L"
            value={draft.shirt_size as string}
            onChange={(e) => set('shirt_size', e.target.value)}
          />
        </Field>
      </Fieldset>

      <Fieldset
        n="2200m · El Hombre"
        title="Practicalities"
        hint="The boring half that stops someone getting turned around at immigration."
      >
        <Field name="room_pref" label="Room">
          <select
            id="room_pref"
            className="field"
            value={draft.room_pref as string}
            onChange={(e) => set('room_pref', e.target.value)}
          >
            <option value="any">No preference</option>
            {TRIP.venue.rooms.map((room) => (
              <option key={room.key} value={room.key}>
                {room.label} — from ${room.fromUsd}
              </option>
            ))}
          </select>
        </Field>
        <Field name="roommate_pref" label="Want to share with">
          <input
            id="roommate_pref"
            className="field"
            value={draft.roommate_pref as string}
            onChange={(e) => set('roommate_pref', e.target.value)}
          />
        </Field>
        <Field name="passport_expiry" label="Passport expires">
          <input
            id="passport_expiry"
            type="date"
            className="field mono"
            value={draft.passport_expiry as string}
            onChange={(e) => set('passport_expiry', e.target.value)}
            aria-describedby={passportShort ? 'passport-warning' : undefined}
          />
          {passportShort && (
            <p id="passport-warning" className="text-sm text-rust mt-2" role="alert">
              Peru needs {PASSPORT_MONTHS_REQUIRED} months of validity past entry. Renew this before
              you book anything.
            </p>
          )}
        </Field>
        <Field name="emergency_contact" label="Emergency contact">
          <input
            id="emergency_contact"
            className="field"
            placeholder="Name and number"
            value={draft.emergency_contact as string}
            onChange={(e) => set('emergency_contact', e.target.value)}
          />
        </Field>
        <Field name="dietary" label="Anything you cannot eat" span>
          <input
            id="dietary"
            className="field"
            value={draft.dietary as string}
            onChange={(e) => set('dietary', e.target.value)}
          />
        </Field>
        <Field name="notes" label="Anything else" span>
          <textarea
            id="notes"
            className="field"
            rows={3}
            value={draft.notes as string}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </Fieldset>

      {!TRIP.window.locked && (
        <Fieldset
          n="Line-up"
          title="Which weeks work?"
          hint="Three proposed weeks, picked on five years of conditions data. Say yes to every one you could make — the most yeses wins."
        >
          <div className="sm:col-span-2 space-y-3">
            {PROPOSED_WEEKS.map((week) => (
              <div key={week.key} className="border border-hairline p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
                  <span className="display text-lg">{week.label}</span>
                  <span className="mono text-xs text-slate2">
                    {week.good}% good days · {week.firing}% firing
                  </span>
                </div>
                <p className="text-sm text-slate2 mb-3">{week.pitch}</p>
                <div className="flex gap-2" role="group" aria-label={`Can you make ${week.label}?`}>
                  {(['yes', 'maybe', 'no'] as Vote[]).map((option) => {
                    const on = weekVotes[week.key] === option
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setWeekVotes((v) => ({ ...v, [week.key]: option }))
                          setSaved(false)
                        }}
                        className={
                          'px-4 py-1.5 text-sm border capitalize transition-colors ' +
                          (on
                            ? 'bg-ink text-foam border-ink'
                            : 'bg-foam border-hairline hover:bg-bone2')
                        }
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <details className="border-t border-hairline pt-4">
              <summary className="text-sm cursor-pointer text-slate2 hover:text-ink">
                None of those work? Add your own dates
              </summary>
              <div className="space-y-3 mt-4">
                {ranges.map((range, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="label" htmlFor={`start-${i}`}>
                        From
                      </label>
                      <input
                        id={`start-${i}`}
                        type="date"
                        className="field mono w-auto"
                        min={TRIP.window.start}
                        max={TRIP.window.end}
                        value={range.start}
                        onChange={(e) =>
                          setRanges((r) => r.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`end-${i}`}>
                        To
                      </label>
                      <input
                        id={`end-${i}`}
                        type="date"
                        className="field mono w-auto"
                        min={range.start || TRIP.window.start}
                        max={TRIP.window.end}
                        value={range.end}
                        onChange={(e) =>
                          setRanges((r) => r.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
                        }
                      />
                    </div>
                    {ranges.length > 1 && (
                      <button
                        type="button"
                        className="text-sm text-slate2 hover:text-rust underline underline-offset-2 pb-2.5"
                        onClick={() => setRanges((r) => r.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => setRanges((r) => [...r, { start: '', end: '' }])}
                >
                  Add another range
                </button>
              </div>
            </details>
          </div>
        </Fieldset>
      )}

      <div className="border-t border-hairline pt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : attendee ? 'Update your details' : 'Add me to the trip'}
        </button>
        {saved && <p className="text-sm text-sea">Saved. Come back and change it any time.</p>}
        {error && (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
