'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MAX_PLUS_ONES,
  SIDES,
  STAY_OPTIONS,
  WEDDING,
  defaultStay,
  eventDate,
  formatDate,
  real,
} from '@/lib/config'
import type { Guest } from '@/lib/guests'
import FlightLinks from './FlightLinks'
import JourneyPanel, { useJourney } from './JourneyPanel'

type Draft = Record<string, string | boolean | string[]>

// datetime-local wants `YYYY-MM-DDTHH:MM` in the venue's own time; the row
// holds UTC.
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() + WEDDING.date.utcOffsetHours * 3600_000).toISOString().slice(0, 16)
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
          {hint && <p className="text-sm text-muted mt-1.5">{hint}</p>}
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

export default function RsvpForm({ guest }: { guest: Guest | null }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [draft, setDraft] = useState<Draft>({
    name: guest?.name ?? '',
    status: guest?.status === 'maybe' || guest?.status === 'no' ? guest.status : 'yes',
    side: guest?.side ?? 'both',
    email: guest?.email ?? '',
    phone: guest?.phone ?? '',
    postal_address: guest?.postal_address ?? '',
    attending_events: guest?.attending_events ?? WEDDING.events.filter((e) => !e.optional).map((e) => e.key),
    plus_one: guest?.plus_one ?? false,
    plus_one_name: guest?.plus_one_name ?? '',
    kids: String(guest?.kids ?? 0),
    kids_names: guest?.kids_names ?? '',
    dietary: guest?.dietary ?? '',
    song_request: guest?.song_request ?? '',
    message: guest?.message ?? '',
    origin_city: guest?.origin_city ?? '',
    origin_airport: guest?.origin_airport ?? '',
    arrival_flight: guest?.arrival_flight ?? '',
    arrival_at: toLocalInput(guest?.arrival_at ?? null),
    departure_flight: guest?.departure_flight ?? '',
    departure_at: toLocalInput(guest?.departure_at ?? null),
    needs_transfer: guest?.needs_transfer ?? false,
    flight_cost: guest?.flight_cost?.toString() ?? '',
    stay_pref: guest?.stay_pref ?? 'undecided',
    staying_with: guest?.staying_with ?? '',
    passport_expiry: guest?.passport_expiry?.slice(0, 10) ?? '',
    emergency_contact: guest?.emergency_contact ?? '',
  })

  const set = (key: string, value: string | boolean | string[]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }

  const toggleEvent = (key: string) => {
    const current = draft.attending_events as string[]
    set(
      'attending_events',
      current.includes(key) ? current.filter((e) => e !== key) : [...current, key],
    )
  }

  const coming = draft.status !== 'no'
  const flying = WEDDING.travel.flyIn
  const stay = defaultStay()
  const passportMonths = WEDDING.travel.passportMonthsRequired

  // Checked against the wedding date rather than today: someone booking a year
  // out looks fine now and gets turned around at the desk.
  const passportShort = (() => {
    if (!passportMonths) return false
    const value = draft.passport_expiry
    const weddingIso = real(WEDDING.date.iso)
    if (typeof value !== 'string' || !value || !weddingIso) return false
    const cutoff = new Date(weddingIso)
    cutoff.setMonth(cutoff.getMonth() + passportMonths)
    return new Date(value) < cutoff
  })()

  const originReady = /^[A-Z]{3}$/.test((draft.origin_airport as string) ?? '')
  const journey = useJourney((draft.origin_airport as string) ?? '')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          kids: Number(draft.kids) || 0,
          // Empty rather than absent when this is a new reply. Absent lets the
          // route fall back to the cookie, which on a shared laptop would
          // overwrite whoever filled it in last instead of adding a person.
          edit_token: guest?.edit_token ?? '',
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
      <Fieldset n="One" title="You" hint="Only your name is required. Everything else can wait, and you can come back.">
        <Field name="name" label="Name">
          <input
            id="name"
            className="field"
            required
            value={draft.name as string}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>

        <Field name="status" label="Can you come?">
          <div className="flex gap-2" role="group" aria-label="Can you come?">
            {(
              [
                ['yes', 'Yes'],
                ['maybe', 'Maybe'],
                ['no', 'Sadly not'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="chip"
                aria-pressed={draft.status === value}
                onClick={() => set('status', value)}
              >
                {label}
              </button>
            ))}
          </div>
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

        <Field name="side" label="How do we know you?" span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="How do we know you?">
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

        <Field name="postal_address" label="Postal address" span>
          <textarea
            id="postal_address"
            className="field"
            rows={2}
            value={draft.postal_address as string}
            onChange={(e) => set('postal_address', e.target.value)}
          />
          <p className="text-xs text-muted mt-1.5">
            Only so we can send you something on paper. Nobody else sees it.
          </p>
        </Field>
      </Fieldset>

      {coming && (
        <Fieldset
          n="Two"
          title="Which parts"
          hint="Tick everything you expect to be at. Numbers go straight to the caterer, so a rough yes is more useful than a blank."
        >
          <div className="sm:col-span-2 space-y-3">
            {WEDDING.events.map((event) => {
              const on = (draft.attending_events as string[]).includes(event.key)
              const when = eventDate(event)
              return (
                <label
                  key={event.key}
                  className="flex items-start gap-3 border border-hairline p-4 cursor-pointer hover:bg-linen2/50"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={on}
                    onChange={() => toggleEvent(event.key)}
                  />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="display text-lg">{event.name}</span>
                      <span className="mono text-xs text-muted">
                        {when ? formatDate(when, { year: undefined }) : 'date to come'}
                        {real(event.time) ? ` · ${event.time}` : ''}
                      </span>
                    </span>
                    {real(event.where) && (
                      <span className="block text-sm text-muted mt-0.5">{event.where}</span>
                    )}
                    {real(event.note) && (
                      <span className="block text-sm text-muted mt-1">{event.note}</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        </Fieldset>
      )}

      {/* Kids and dietary belong here whether or not plus-ones are allowed, so
          this section shows for anyone coming; only the plus-one block is
          conditional on MAX_PLUS_ONES. */}
      {coming && (
        <Fieldset n="Three" title="Anyone with you" hint="So the seating plan and the head count are right.">
          {MAX_PLUS_ONES > 0 && (
            <>
              <div className="sm:col-span-2">
                <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={draft.plus_one as boolean}
                    onChange={(e) => set('plus_one', e.target.checked)}
                  />
                  <span>
                    I am bringing someone.
                    <span className="text-muted">
                      {' '}
                      If your invitation did not include a plus-one, ask us — we would rather you
                      asked than assumed either way.
                    </span>
                  </span>
                </label>
              </div>
              {(draft.plus_one as boolean) && (
                <Field name="plus_one_name" label="Their name" span>
                  <input
                    id="plus_one_name"
                    className="field"
                    value={draft.plus_one_name as string}
                    onChange={(e) => set('plus_one_name', e.target.value)}
                  />
                </Field>
              )}
            </>
          )}

          <Field name="kids" label="Children coming">
            <input
              id="kids"
              type="number"
              min={0}
              max={10}
              className="field mono"
              value={draft.kids as string}
              onChange={(e) => set('kids', e.target.value)}
            />
          </Field>
          {Number(draft.kids) > 0 && (
            <Field name="kids_names" label="Their names and ages">
              <input
                id="kids_names"
                className="field"
                placeholder="Maya, 6 · Theo, 3"
                value={draft.kids_names as string}
                onChange={(e) => set('kids_names', e.target.value)}
              />
            </Field>
          )}

          <Field name="dietary" label="Anything you cannot eat" span>
            <input
              id="dietary"
              className="field"
              placeholder="Coeliac · no shellfish · vegetarian for two"
              value={draft.dietary as string}
              onChange={(e) => set('dietary', e.target.value)}
            />
            <p className="text-xs text-muted mt-1.5">
              Everyone in your party, in one line. Allergies especially — the kitchen gets this
              verbatim.
            </p>
          </Field>
        </Fieldset>
      )}

      {coming && flying && (
        <Fieldset
          n="Four"
          title="Getting there"
          hint={
            real(WEDDING.travel.arrival.city)
              ? `Most people land at ${WEDDING.travel.arrival.city}. Times below are local to the venue.`
              : 'Times below are local to the venue.'
          }
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

          {/* Put the flight search inside the form rather than beside it. The
              moment somebody types three letters they can see the journey, the
              fare and a prefilled search without losing what they have typed. */}
          <div className="sm:col-span-2 space-y-4">
            {originReady ? (
              <>
                {(journey.data || journey.loading || journey.error) && (
                  <div className="border border-hairline p-4">
                    <JourneyPanel {...journey} />
                  </div>
                )}
                {stay && (
                  <FlightLinks
                    origin={draft.origin_airport as string}
                    depart={stay.depart}
                    ret={stay.return}
                    compact
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-muted border border-dashed border-hairline p-4">
                Put your home airport in above and the flight search appears here, dates already
                filled in — no need to go anywhere else.
              </p>
            )}
          </div>

          <Field name="arrival_flight" label="Arriving on flight">
            <input
              id="arrival_flight"
              className="field mono uppercase"
              placeholder="AA1234"
              value={draft.arrival_flight as string}
              onChange={(e) => set('arrival_flight', e.target.value.toUpperCase())}
            />
          </Field>
          <Field name="arrival_at" label="Lands at (venue time)">
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
          <Field name="departure_at" label="Departs at (venue time)">
            <input
              id="departure_at"
              type="datetime-local"
              className="field mono"
              value={draft.departure_at as string}
              onChange={(e) => set('departure_at', e.target.value)}
            />
          </Field>

          {WEDDING.travel.runningShuttle && (
            <div className="sm:col-span-2">
              <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={draft.needs_transfer as boolean}
                  onChange={(e) => set('needs_transfer', e.target.checked)}
                />
                <span>
                  Put me on a car from the airport.
                  <span className="text-muted">
                    {' '}
                    Anyone landing within two hours of each other shares one.
                  </span>
                </span>
              </label>
            </div>
          )}
        </Fieldset>
      )}

      {coming && (
        <Fieldset
          n={flying ? 'Five' : 'Four'}
          title="Where you will sleep"
          hint="We have held rooms. Telling us now is what keeps the block from being released."
        >
          <Field name="stay_pref" label="Your plan" span>
            <select
              id="stay_pref"
              className="field"
              value={draft.stay_pref as string}
              onChange={(e) => set('stay_pref', e.target.value)}
            >
              {STAY_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field name="staying_with" label="Sharing with" span>
            <input
              id="staying_with"
              className="field"
              placeholder="Whoever you would like to be near"
              value={draft.staying_with as string}
              onChange={(e) => set('staying_with', e.target.value)}
            />
          </Field>

          {passportMonths > 0 && (
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
                <p id="passport-warning" className="text-sm text-rose mt-2" role="alert">
                  You need {passportMonths} months of validity past the date you arrive. Renew this
                  before you book anything.
                </p>
              )}
            </Field>
          )}
          <Field name="emergency_contact" label="Emergency contact">
            <input
              id="emergency_contact"
              className="field"
              placeholder="Name and number"
              value={draft.emergency_contact as string}
              onChange={(e) => set('emergency_contact', e.target.value)}
            />
          </Field>
        </Fieldset>
      )}

      <Fieldset
        n="Last"
        title="Say something"
        hint="The song is for the DJ. The note is for us — and it appears next to your name on the guest list, so keep it printable."
      >
        {coming && (
          <Field name="song_request" label="A song that will get you dancing" span>
            <input
              id="song_request"
              className="field"
              value={draft.song_request as string}
              onChange={(e) => set('song_request', e.target.value)}
            />
          </Field>
        )}
        <Field name="message" label="A note to the two of us" span>
          <textarea
            id="message"
            className="field"
            rows={3}
            value={draft.message as string}
            onChange={(e) => set('message', e.target.value)}
          />
        </Field>
      </Fieldset>

      <div className="border-t border-hairline pt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : guest && guest.status !== 'invited' ? 'Update my reply' : 'Send it'}
        </button>
        {saved && <p className="text-sm text-olive">Saved. Change it whenever you like.</p>}
        {error && (
          <p className="text-sm text-rose" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
