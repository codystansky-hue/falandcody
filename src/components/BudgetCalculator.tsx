'use client'

import { useEffect, useState } from 'react'
import { DEFAULTS, IGV_RATE, costFor, usd, type Assumptions, type RoomKey } from '@/lib/costs'

const STORE = 'chicama_budget'

type Person = {
  id: number
  name: string
  room_pref: string | null
  bringing_gear: string[]
  needs_transfer: boolean
  flight_cost_usd: number | string | null
  paid_status: string
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <div>
        <span className="text-sm">{label}</span>
        {hint && <span className="text-xs text-slate2 block">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function BudgetCalculator({ people }: { people: Person[] }) {
  const [a, setA] = useState<Assumptions>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE)
      if (saved) setA({ ...DEFAULTS, ...JSON.parse(saved) })
    } catch {
      // Blocked storage just means you get the defaults.
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORE, JSON.stringify(a))
    } catch {
      /* not worth surfacing */
    }
  }, [a, loaded])

  const set = <K extends keyof Assumptions>(key: K, value: Assumptions[K]) =>
    setA((prev) => ({ ...prev, [key]: value }))

  const costs = people.map((p) => costFor(p, a))
  const groundTotal = costs.reduce((sum, c) => sum + c.onTheGround, 0)
  const flightsKnown = costs.filter((c) => c.flight != null)
  const flightTotal = flightsKnown.reduce((sum, c) => sum + (c.flight ?? 0), 0)
  const perHead = costs.length ? groundTotal / costs.length : 0

  // The single biggest lever, shown rather than explained.
  const occupancyOptions = [1, 2, 3].map((n) => {
    const alt = { ...a, occupancy: n }
    const total = people.reduce((sum, p) => sum + costFor(p, alt).onTheGround, 0)
    return { n, perHead: people.length ? total / people.length : 0 }
  })

  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0))

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <div className="card p-4">
          <p className="label mb-1">On the ground, each</p>
          <p className="mono text-2xl leading-none">{usd(perHead)}</p>
          <p className="text-xs text-slate2 mt-1.5">{a.nights} nights, everything but flights</p>
        </div>
        <div className="card p-4">
          <p className="label mb-1">Group, on the ground</p>
          <p className="mono text-2xl leading-none">{usd(groundTotal)}</p>
          <p className="text-xs text-slate2 mt-1.5">{people.length} people</p>
        </div>
        <div className="card p-4">
          <p className="label mb-1">Flights booked so far</p>
          <p className="mono text-2xl leading-none">{usd(flightTotal)}</p>
          <p className="text-xs text-slate2 mt-1.5">
            {flightsKnown.length} of {people.length} have entered a price
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[22rem_1fr] items-start">
        <section className="card p-5">
          <p className="marker mb-3">Assumptions</p>
          <div className="divide-y divide-hairline">
            <Row label="Nights">
              <input
                type="number"
                min={1}
                max={30}
                className="field mono w-20 text-right"
                value={a.nights}
                onChange={(e) => set('nights', Math.max(1, num(e.target.value)))}
              />
            </Row>
            <Row label="People per room" hint="Triples are the biggest saving available">
              <select
                className="field w-20"
                value={a.occupancy}
                onChange={(e) => set('occupancy', Number(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </Row>
            {(['garden', 'ocean', 'premium'] as RoomKey[]).map((key) => (
              <Row key={key} label={`${key[0].toUpperCase()}${key.slice(1)} room`} hint="per room, per night">
                <input
                  type="number"
                  min={0}
                  className="field mono w-24 text-right"
                  value={a.roomRates[key]}
                  onChange={(e) => set('roomRates', { ...a.roomRates, [key]: num(e.target.value) })}
                />
              </Row>
            ))}
            <Row label="Transfer" hint="round trip from Trujillo, each">
              <input
                type="number"
                min={0}
                className="field mono w-24 text-right"
                value={a.transferUsd}
                onChange={(e) => set('transferUsd', num(e.target.value))}
              />
            </Row>
            <Row label="Food and drink" hint="per day; breakfast is in the room rate">
              <input
                type="number"
                min={0}
                className="field mono w-24 text-right"
                value={a.foodPerDayUsd}
                onChange={(e) => set('foodPerDayUsd', num(e.target.value))}
              />
            </Row>
            <Row label="Gear hire" hint="per day, only for those not bringing their own">
              <input
                type="number"
                min={0}
                className="field mono w-24 text-right"
                value={a.rentalPerDayUsd}
                onChange={(e) => set('rentalPerDayUsd', num(e.target.value))}
              />
            </Row>
            <Row label="Extras" hint="tow-back, tips, the kitty">
              <input
                type="number"
                min={0}
                className="field mono w-24 text-right"
                value={a.extrasUsd}
                onChange={(e) => set('extrasUsd', num(e.target.value))}
              />
            </Row>
            <Row label={`Pay the ${Math.round(IGV_RATE * 100)}% IGV`} hint="Tick only if the exemption fails">
              <input
                type="checkbox"
                checked={a.payingIgv}
                onChange={(e) => set('payingIgv', e.target.checked)}
              />
            </Row>
          </div>
          <p className="text-xs text-slate2 mt-4">
            Saved in this browser only. Nobody else sees your edits.
          </p>
        </section>

        <div className="space-y-8">
          <section>
            <p className="marker mb-3">What sharing does</p>
            <div className="card divide-y divide-hairline">
              {occupancyOptions.map((option) => (
                <div
                  key={option.n}
                  className={
                    'flex items-center justify-between px-4 py-3 ' +
                    (option.n === a.occupancy ? 'bg-bone2' : '')
                  }
                >
                  <span className="text-sm">
                    {option.n} per room
                    {option.n === a.occupancy && <span className="marker ml-2">current</span>}
                  </span>
                  <span className="mono">
                    {usd(option.perHead)}
                    {option.n !== a.occupancy && occupancyOptions[1] && (
                      <span className="text-slate2 text-xs ml-2">
                        {option.perHead < perHead ? '−' : '+'}
                        {usd(Math.abs(option.perHead - perHead))}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="marker mb-3">Per person</p>
            {people.length === 0 ? (
              <p className="card p-5 text-sm text-slate2">
                Nobody has signed up yet, so there is nothing to add up. The assumptions on the left
                still work as a back-of-envelope for one person.
              </p>
            ) : (
              <div className="overflow-x-auto card">
                <table className="w-full text-sm border-collapse min-w-[42rem]">
                  <thead>
                    <tr className="border-b border-hairline">
                      {['Who', 'Room', 'Transfer', 'Food', 'Hire', 'Extras', 'Ground', 'Flight', 'Total'].map(
                        (h) => (
                          <th key={h} className="label text-left px-3 py-3">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {costs.map((c) => (
                      <tr key={c.name} className="border-b border-hairline last:border-0">
                        <td className="px-3 py-2.5 font-medium">
                          {c.name}
                          {c.paid !== 'unpaid' && (
                            <span className="marker ml-2 text-ochre">{c.paid}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 mono">{usd(c.room)}</td>
                        <td className="px-3 py-2.5 mono">{usd(c.transfer)}</td>
                        <td className="px-3 py-2.5 mono">{usd(c.food)}</td>
                        <td className="px-3 py-2.5 mono">{c.rental ? usd(c.rental) : '—'}</td>
                        <td className="px-3 py-2.5 mono">{usd(c.extras)}</td>
                        <td className="px-3 py-2.5 mono font-medium">{usd(c.onTheGround)}</td>
                        <td className="px-3 py-2.5 mono">
                          {c.flight == null ? <span className="text-slate2">not booked</span> : usd(c.flight)}
                        </td>
                        <td className="px-3 py-2.5 mono font-medium">
                          {c.total == null ? <span className="text-slate2">—</span> : usd(c.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
