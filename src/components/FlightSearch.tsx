'use client'

import { useEffect, useState } from 'react'
import FlightLinks from './FlightLinks'
import type { ProposedWeek } from '@/lib/weeks'

const KEY = 'chicama_origin'

/**
 * The whole point: one three-letter input, then a live search in one click.
 * The airport is remembered locally so returning here is zero input, and it is
 * prefilled from the roster if this browser already filled in the form.
 */
export default function FlightSearch({
  weeks,
  defaultWeekKey,
  knownOrigins,
  crew,
}: {
  weeks: ProposedWeek[]
  defaultWeekKey: string
  knownOrigins: string[]
  crew: { name: string; airport: string }[]
}) {
  const [origin, setOrigin] = useState('')
  const [weekKey, setWeekKey] = useState(defaultWeekKey)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) setOrigin(saved)
    } catch {
      // Private windows and blocked site data both throw here; an empty box is fine.
    }
  }, [])

  useEffect(() => {
    if (origin.length === 3) {
      try {
        localStorage.setItem(KEY, origin)
      } catch {
        /* not important enough to surface */
      }
    }
  }, [origin])

  const week = weeks.find((w) => w.key === weekKey) ?? weeks[0]
  const ready = /^[A-Z]{3}$/.test(origin)

  return (
    <div className="card p-5 md:p-6">
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr] items-end">
        <div>
          <label className="label" htmlFor="origin">
            Your home airport
          </label>
          <input
            id="origin"
            className="field mono uppercase text-lg"
            maxLength={3}
            placeholder="SEA"
            autoComplete="off"
            spellCheck={false}
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          />
        </div>
        <div>
          <label className="label" htmlFor="week">
            Dates
          </label>
          <select
            id="week"
            className="field"
            value={weekKey}
            onChange={(e) => setWeekKey(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label} — {w.good}% good days
              </option>
            ))}
          </select>
        </div>
      </div>

      {knownOrigins.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="marker">Already on the trip</span>
          {knownOrigins.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setOrigin(code)}
              className={
                'mono text-xs px-2.5 py-1 border transition-colors ' +
                (origin === code ? 'bg-ink text-foam border-ink' : 'border-hairline hover:bg-bone2')
              }
              title={crew
                .filter((c) => c.airport === code)
                .map((c) => c.name)
                .join(', ')}
            >
              {code}
            </button>
          ))}
        </div>
      )}

      {!ready ? (
        <p className="text-sm text-slate2 mt-6">
          Three letters and the searches below light up — {week.label}, return, already filled in.
        </p>
      ) : (
        <div className="mt-6">
          <FlightLinks origin={origin} week={week} />
          <p className="text-xs text-slate2 border-t border-hairline pt-4 mt-5">
            Book the return for {week.end} or later — the hotel shuttle back to Trujillo takes an
            hour and a half, so an early flight out means leaving before dawn.
          </p>
        </div>
      )}
    </div>
  )
}
