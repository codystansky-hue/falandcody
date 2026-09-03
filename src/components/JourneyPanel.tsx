'use client'

import { useEffect, useState } from 'react'

type Journey = {
  toLimaKm: number
  toLimaNonstop: boolean
  hopKm: number
  roadKm: number
  stops: number
  totalLabel: string
  airborneLabel: string
  summary: string
}

type Price = {
  weekKey: string
  label: string
  cheapestUsd: number | null
  airline: string | null
  transfers: number | null
}

export type JourneyData = {
  origin: { iata: string; name: string; city: string; country: string }
  journey: Journey
  pricesConfigured: boolean
  prices: Price[] | null
}

/**
 * What the trip from someone's own airport actually looks like — resolved
 * airport, distance, stops and door-to-door time, plus the cheapest fare per
 * proposed week when the fare token is set.
 *
 * Fetched rather than computed in the browser: the airport table is 300 KB and
 * belongs on the server.
 */
export function useJourney(code: string) {
  const [data, setData] = useState<JourneyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const iata = code.toUpperCase().trim()
    if (!/^[A-Z]{3}$/.test(iata)) {
      setData(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    // Debounced, so typing three letters is one request rather than three.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/journey?origin=${iata}`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setData(null)
          setError(json.error ?? 'Could not look that up.')
        } else {
          setData(json)
        }
      } catch {
        if (!cancelled) setError('Could not look that up.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [code])

  return { data, loading, error }
}

export default function JourneyPanel({
  data,
  loading,
  error,
  highlightWeek,
}: {
  data: JourneyData | null
  loading: boolean
  error: string | null
  highlightWeek?: string
}) {
  if (loading) return <p className="text-sm text-slate2">Looking that up…</p>
  if (error) return <p className="text-sm text-rust">{error}</p>
  if (!data) return null

  const { origin, journey, prices, pricesConfigured } = data
  const cheapest = prices?.filter((p) => p.cheapestUsd != null) ?? []
  const best = cheapest.length
    ? cheapest.reduce((a, b) => ((b.cheapestUsd ?? 0) < (a.cheapestUsd ?? 0) ? b : a))
    : null

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm">
          <span className="mono">{origin.iata}</span> — {origin.name}
          {origin.city && origin.city !== origin.name ? `, ${origin.city}` : ''} ({origin.country})
        </p>
        <p className="text-sm text-slate2 mt-0.5">{journey.summary}</p>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <dt className="label mb-0.5">Door to door</dt>
          <dd className="mono text-lg">{journey.totalLabel}</dd>
        </div>
        <div>
          <dt className="label mb-0.5">In the air</dt>
          <dd className="mono text-lg">{journey.airborneLabel}</dd>
        </div>
        <div>
          <dt className="label mb-0.5">Stops</dt>
          <dd className="mono text-lg">{journey.stops}</dd>
        </div>
        <div>
          <dt className="label mb-0.5">To Lima</dt>
          <dd className="mono text-lg">{journey.toLimaKm.toLocaleString()} km</dd>
        </div>
      </dl>

      {pricesConfigured ? (
        cheapest.length > 0 ? (
          <div>
            <p className="label mb-1.5">Cheapest fare, by week</p>
            <ul className="text-sm divide-y divide-hairline border-t border-hairline">
              {prices!.map((price) => (
                <li
                  key={price.weekKey}
                  className={
                    'flex justify-between py-2 ' +
                    (price.weekKey === highlightWeek ? 'font-medium' : '')
                  }
                >
                  <span>
                    {price.label}
                    {price.weekKey === highlightWeek && <span className="marker ml-2">yours</span>}
                  </span>
                  <span className="mono">
                    {price.cheapestUsd == null ? (
                      <span className="text-slate2">no cached fare</span>
                    ) : (
                      <>
                        ${price.cheapestUsd.toFixed(0)}
                        {price.weekKey === best?.weekKey && cheapest.length > 1 && (
                          <span className="text-ochre text-xs ml-2">cheapest</span>
                        )}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate2 mt-2">
              Indicative cached fares to Lima, not live availability. Use the search buttons for
              what is actually bookable today.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate2">
            No cached fares for this route — it only holds what people have recently searched. The
            search buttons still work.
          </p>
        )
      ) : (
        <p className="text-xs text-slate2">
          Prices per week are not switched on yet. Distances and timings above are computed, not
          estimated.
        </p>
      )}
    </div>
  )
}
