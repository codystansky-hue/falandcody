'use client'

import { useEffect, useState } from 'react'
import FlightLinks from './FlightLinks'
import JourneyPanel, { useJourney } from './JourneyPanel'

type Suggestion = { iata: string; name: string; city: string; country: string }

/**
 * One input — three letters — and the whole trip appears: the journey, a live
 * fare for the dates that actually matter, and prefilled searches.
 *
 * Guests do not know the IATA code for their nearest airport, so typing a city
 * name suggests them. The lookup lives on the server because the airport table
 * is 300 KB.
 */
export default function TravelPlanner({
  depart,
  ret,
  initialOrigin = '',
}: {
  depart: string
  ret: string
  initialOrigin?: string
}) {
  const [query, setQuery] = useState(initialOrigin)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const origin = query.toUpperCase().trim()
  const resolved = /^[A-Z]{3}$/.test(origin)
  const journey = useJourney(origin)

  // Only suggest while the input is a word rather than a code — once someone
  // has three letters, the journey panel below is the answer.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || /^[A-Za-z]{3}$/.test(q)) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/journey?q=${encodeURIComponent(q)}`)
        const json = await res.json()
        if (!cancelled) setSuggestions(json.suggestions ?? [])
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <label className="label" htmlFor="origin">
          Where are you flying from?
        </label>
        <input
          id="origin"
          className="field mono uppercase"
          placeholder="SEA, or type a city"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <ul className="border border-hairline border-t-0 divide-y divide-hairline bg-paper">
            {suggestions.map((s) => (
              <li key={s.iata}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-linen2"
                  onClick={() => {
                    setQuery(s.iata)
                    setSuggestions([])
                  }}
                >
                  <span className="mono mr-2">{s.iata}</span>
                  {s.city} — {s.name}
                  <span className="text-muted"> ({s.country})</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {resolved ? (
        <>
          {(journey.data || journey.loading || journey.error) && (
            <div className="card p-5">
              <JourneyPanel {...journey} />
            </div>
          )}
          <FlightLinks origin={origin} depart={depart} ret={ret} />
        </>
      ) : (
        <p className="text-sm text-muted border border-dashed border-hairline p-5">
          Three letters is all it takes. You get the real journey time, what the fare looks like
          right now, and searches with the dates already in them.
        </p>
      )}
    </div>
  )
}
