'use client'

import { useEffect, useState } from 'react'

type Journey = {
  mainTo: string
  mainKm: number
  nonstop: boolean
  hopTo: string | null
  hopKm: number
  roadKm: number
  stops: number
  totalLabel: string
  airborneLabel: string
  summary: string
}

export type JourneyData = {
  origin: { iata: string; name: string; city: string; country: string }
  journey: Journey
  stay: { depart: string; return: string; nights: number } | null
  price: { cheapestUsd: number | null; stale: boolean; fetchedAt: string | null } | null
}

/**
 * What the trip from one guest's own airport actually looks like — resolved
 * airport, distance, stops, door-to-door time, and a live fare for the dates
 * they would actually be travelling.
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
}: {
  data: JourneyData | null
  loading: boolean
  error: string | null
}) {
  if (loading) return <p className="text-sm text-muted">Looking that up…</p>
  if (error) return <p className="text-sm text-rose">{error}</p>
  if (!data) return null

  const { origin, journey, stay, price } = data

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm">
          <span className="mono">{origin.iata}</span> — {origin.name}
          {origin.city && origin.city !== origin.name ? `, ${origin.city}` : ''} ({origin.country})
        </p>
        <p className="text-sm text-muted mt-0.5">{journey.summary}</p>
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
          <dt className="label mb-0.5">To {journey.mainTo}</dt>
          <dd className="mono text-lg">{journey.mainKm.toLocaleString()} km</dd>
        </div>
      </dl>

      {stay && (
        <div>
          <p className="label mb-1.5">
            Cheapest round trip · {stay.depart} → {stay.return}
          </p>
          {price?.cheapestUsd != null ? (
            <>
              <p className="mono text-2xl">${price.cheapestUsd.toFixed(0)}</p>
              <p className="text-xs text-muted mt-1.5">
                {price.stale
                  ? 'Last price we managed to fetch for this route — it may have moved.'
                  : 'Live, and indicative. Click through to see what is actually bookable.'}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted">
              No price came back for this route just now — the source is intermittent rather than
              broken. The search buttons below still work, and reloading usually fixes it.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
