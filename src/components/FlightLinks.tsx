'use client'

import { useState } from 'react'
import { routeOptions } from '@/lib/flightSearch'

/**
 * Prefilled flight searches for one origin and the dates a guest would
 * actually travel. Shared by /travel and the RSVP form, so wherever somebody
 * is asked for a flight number they can go and get one without leaving.
 *
 * `compact` is the in-form version: the simple through-booking up front, any
 * split-it-yourself options tucked behind a disclosure so they do not shout
 * over the form fields.
 */
export default function FlightLinks({
  origin,
  depart,
  ret,
  compact = false,
}: {
  origin: string
  depart: string
  ret: string
  compact?: boolean
}) {
  const [showSplit, setShowSplit] = useState(false)
  const routes = routeOptions(origin, depart, ret)
  const [through, ...secondary] = routes

  if (compact) {
    return (
      <div className="border border-hairline bg-linen2/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
          <p className="display text-base">{through.label}</p>
          <p className="mono text-xs text-muted">
            {depart} → {ret}
          </p>
        </div>
        <p className="text-sm text-muted mb-3">
          Book it, then come back and fill in the flight fields below.
        </p>
        <div className="flex flex-wrap gap-2">
          {through.links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="btn py-1.5 px-3 text-sm"
            >
              {link.name} ↗
            </a>
          ))}
        </div>

        {secondary.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowSplit((v) => !v)}
              className="text-xs text-muted hover:text-ink underline underline-offset-2 mt-3"
            >
              {showSplit ? 'Hide' : 'Or split the journey — often cheaper'}
            </button>

            {showSplit && (
              <div className="mt-3 space-y-3 border-t border-hairline pt-3">
                {secondary.map((route) => (
                  <div key={route.key}>
                    <p className="text-sm font-medium">{route.label}</p>
                    <p className="text-xs text-muted mb-2">{route.note}</p>
                    <div className="flex flex-wrap gap-2">
                      {route.links.map((link) => (
                        <a
                          key={link.name}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-quiet py-1 px-2.5 text-xs"
                        >
                          {link.name} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {routes.map((route) => (
        <div key={route.key} className="border-t border-hairline pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <h3 className="display text-lg">{route.label}</h3>
            <span className="mono text-xs text-muted">
              {depart} → {ret}
            </span>
          </div>
          <p className="text-sm text-muted mb-3">{route.note}</p>
          <div className="flex flex-wrap gap-2">
            {route.links.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className={route.key === 'through' ? 'btn' : 'btn btn-quiet'}
              >
                {link.name} ↗
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
