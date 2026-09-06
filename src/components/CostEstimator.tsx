'use client'

import { useState } from 'react'
import { DEFAULTS, estimate, money, type Assumptions } from '@/lib/costs'

/**
 * What coming to this wedding costs one guest. Every number is editable and
 * nothing is stored — the point is that somebody working out whether they can
 * afford it gets an answer in ten seconds instead of opening six tabs.
 *
 * Being visibly a guess is the feature. A precise-looking total nobody can
 * change is worse than a rough one they can argue with.
 */
export default function CostEstimator({ suggestedFlight = 0 }: { suggestedFlight?: number }) {
  const [a, setA] = useState<Assumptions>({ ...DEFAULTS, flight: suggestedFlight })
  const { lines, total } = estimate(a)

  const num = (key: keyof Assumptions, label: string, opts: { min?: number; step?: number } = {}) => (
    <div>
      <label className="label" htmlFor={`cost-${key}`}>
        {label}
      </label>
      <input
        id={`cost-${key}`}
        type="number"
        min={opts.min ?? 0}
        step={opts.step ?? 1}
        className="field mono"
        value={a[key] as number}
        onChange={(e) => setA({ ...a, [key]: Math.max(0, Number(e.target.value) || 0) })}
      />
    </div>
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] items-start">
      <div className="card">
        <ul className="divide-y divide-hairline">
          {lines.map((line) => (
            <li key={line.label} className="flex justify-between gap-6 px-5 py-3">
              <span>
                {line.label}
                {line.note && <span className="block text-xs text-muted mt-0.5">{line.note}</span>}
              </span>
              <span className="mono shrink-0">{money(line.amount)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-6 px-5 py-4 bg-linen2/50">
            <span className="display text-lg">Per person, roughly</span>
            <span className="mono text-lg">{money(total)}</span>
          </li>
        </ul>
        <p className="text-xs text-muted px-5 py-3 border-t border-hairline">
          Assumptions, not quotes. Change any of them on the right — nothing here is saved or sent
          anywhere.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {num('nights', 'Nights')}
        {num('sharing', 'Sharing a room', { min: 1 })}
        {num('roomRate', 'Room, per night')}
        {num('taxPercent', 'Lodging tax %')}
        {num('flight', 'Flights, return')}
        {num('transfer', 'Airport transfer')}
        {num('foodPerDay', 'Food a day')}
        {num('gift', 'Gift')}
        {num('extras', 'Everything else')}
      </div>
    </div>
  )
}
