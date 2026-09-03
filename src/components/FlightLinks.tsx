'use client'

import { useState } from 'react'
import { routeOptions } from '@/lib/flightSearch'
import type { ProposedWeek } from '@/lib/weeks'

/**
 * The three prefilled searches for one origin and one week. Shared by the
 * /flights page and the sign-up form, so wherever someone is asked for a
 * flight number they can go and get one without leaving the page.
 *
 * `compact` is the in-form version: the through-booking up front, the Lima
 * split tucked behind a disclosure so it does not shout over the form fields.
 */
export default function FlightLinks({
  origin,
  week,
  compact = false,
}: {
  origin: string
  week: ProposedWeek
  compact?: boolean
}) {
  const [showSplit, setShowSplit] = useState(false)
  const routes = routeOptions(origin, week.start, week.end)
  const secondary = [routes.toLima, routes.limaHop]

  if (compact) {
    return (
      <div className="border border-hairline bg-bone2/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
          <p className="display text-base">{routes.through.label}</p>
          <p className="mono text-xs text-slate2">
            {week.start} → {week.end}
          </p>
        </div>
        <p className="text-sm text-slate2 mb-3">
          Book it, then come back and fill in the three fields below.
        </p>
        <div className="flex flex-wrap gap-2">
          {routes.through.links.map((link) => (
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

        <button
          type="button"
          onClick={() => setShowSplit((v) => !v)}
          className="text-xs text-slate2 hover:text-ink underline underline-offset-2 mt-3"
        >
          {showSplit ? 'Hide' : 'Or split it at Lima — often cheaper'}
        </button>

        {showSplit && (
          <div className="mt-3 space-y-3 border-t border-hairline pt-3">
            {secondary.map((route) => (
              <div key={route.label}>
                <p className="text-sm font-medium">{route.label}</p>
                <p className="text-xs text-slate2 mb-2">{route.note}</p>
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
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {Object.entries(routes).map(([key, route]) => (
        <div key={key} className="border-t border-hairline pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <h3 className="display text-lg">{route.label}</h3>
            <span className="mono text-xs text-slate2">
              {week.start} → {week.end}
            </span>
          </div>
          <p className="text-sm text-slate2 mb-3">{route.note}</p>
          <div className="flex flex-wrap gap-2">
            {route.links.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className={key === 'through' ? 'btn' : 'btn btn-quiet'}
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
