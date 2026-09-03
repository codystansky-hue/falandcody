import { PROPOSED_WEEKS, tallyWeeks } from '@/lib/weeks'
import { cachedFare } from '@/lib/fares-cache'
import type { DateVote } from '@/lib/attendees'

/**
 * The consensus view: every proposed week, side by side, with what it costs the
 * whole crew to fly there and how the vote stands. Nobody is booking until the
 * group agrees, so the useful question is not "what does my flight cost" but
 * "which week is cheapest for everyone".
 *
 * Server component — the fare lookups are cached for a day inside the lib, and
 * this is one call per origin per week rather than per person.
 */
export default async function WeekComparison({
  origins,
  votes,
  crewSize,
}: {
  origins: string[]
  votes: DateVote[]
  crewSize: number
}) {
  const ranked = tallyWeeks(votes)

  // Cache only. This table would otherwise fire origins × weeks requests on
  // every page view; the cache is warmed as each person looks up their own
  // route on /flights or in the form.
  const priced = await Promise.all(
    PROPOSED_WEEKS.map(async (week) => {
      const perOrigin = await Promise.all(
        origins.map(async (origin) => ({
          origin,
          fare: await cachedFare(origin, week.start),
        })),
      )
      const known = perOrigin.filter((p) => p.fare)
      return {
        key: week.key,
        perOrigin,
        groupTotal: known.length ? known.reduce((sum, p) => sum + (p.fare?.usd ?? 0), 0) : null,
        covered: known.length,
        anyStale: known.some((p) => p.fare?.stale),
      }
    }),
  )

  const totals = priced.map((p) => p.groupTotal).filter((t): t is number => t != null)
  const cheapestTotal = totals.length ? Math.min(...totals) : null
  const missing = origins.length * PROPOSED_WEEKS.length -
    priced.reduce((n, p) => n + p.covered, 0)

  return (
    <div>
    <div className="overflow-x-auto card">
      <table className="w-full text-sm border-collapse min-w-[46rem]">
        <thead>
          <tr className="border-b border-hairline">
            <th className="label text-left px-4 py-3">Week</th>
            <th className="label text-left px-4 py-3">Conditions</th>
            <th className="label text-left px-4 py-3">Vote</th>
            {origins.map((origin) => (
              <th key={origin} className="label text-left px-4 py-3 mono">
                {origin}
              </th>
            ))}
            <th className="label text-left px-4 py-3">Group flights</th>
          </tr>
        </thead>
        <tbody>
          {PROPOSED_WEEKS.map((week) => {
            const tally = ranked.find((r) => r.key === week.key)!
            const row = priced?.find((p) => p.key === week.key)
            const isCheapest =
              row?.groupTotal != null && cheapestTotal != null && row.groupTotal === cheapestTotal
            return (
              <tr key={week.key} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3">
                  <span className="font-medium">{week.label}</span>
                  <span className="block mono text-xs text-slate2">
                    {week.start} → {week.end}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="mono">{week.good}%</span>{' '}
                  <span className="text-slate2 text-xs">good</span>
                  <span className="block text-xs text-slate2 mono">{week.firing}% firing</span>
                </td>
                <td className="px-4 py-3 mono text-xs">
                  {tally.yes}Y · {tally.maybe}M · {tally.no}N
                  {crewSize > 0 && (
                    <span className="block text-slate2">
                      {crewSize - tally.yes - tally.maybe - tally.no} silent
                    </span>
                  )}
                </td>
                {origins.map((origin) => {
                  const cell = row?.perOrigin.find((p) => p.origin === origin)
                  return (
                    <td key={origin} className="px-4 py-3 mono">
                      {!cell?.fare ? (
                        <span className="text-slate2">—</span>
                      ) : (
                        <span className={cell.fare.stale ? 'text-slate2' : undefined}>
                          ${cell.fare.usd.toFixed(0)}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-3 mono font-medium">
                  {row?.groupTotal == null ? (
                    <span className="text-slate2 font-normal">—</span>
                  ) : (
                    <>
                      ${row.groupTotal.toFixed(0)}
                      {isCheapest && <span className="text-ochre text-xs ml-2">cheapest</span>}
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
      {missing > 0 && (
        <p className="text-xs text-slate2 mt-3">
          {missing} of {origins.length * PROPOSED_WEEKS.length} prices not looked up yet. They fill
          in as each person checks their own route — the lookup on their page caches the result for
          everyone. Greyed prices are more than six hours old.
        </p>
      )}
      {missing === 0 && (
        <p className="text-xs text-slate2 mt-3">
          Cheapest round trip to Lima per person, from Google Flights. Greyed prices are more than
          six hours old. Indicative — confirm on the airline before booking.
        </p>
      )}
    </div>
  )
}
