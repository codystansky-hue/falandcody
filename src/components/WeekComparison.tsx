import { PROPOSED_WEEKS, tallyWeeks } from '@/lib/weeks'
import { cheapestFrom, isFaresConfigured } from '@/lib/fares'
import { AIRPORTS } from '@/lib/config'
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
  const configured = isFaresConfigured()

  const priced = configured
    ? await Promise.all(
        PROPOSED_WEEKS.map(async (week) => {
          const perOrigin = await Promise.all(
            origins.map(async (origin) => {
              const fares = await cheapestFrom(origin, {
                departureMonth: week.start.slice(0, 7),
                destination: AIRPORTS.gateway.iata,
              })
              const cheapest = fares?.length
                ? fares.reduce((a, b) => (b.priceUsd < a.priceUsd ? b : a)).priceUsd
                : null
              return { origin, usd: cheapest }
            }),
          )
          const known = perOrigin.filter((p) => p.usd != null)
          return {
            key: week.key,
            perOrigin,
            groupTotal: known.length ? known.reduce((sum, p) => sum + (p.usd ?? 0), 0) : null,
            covered: known.length,
          }
        }),
      )
    : null

  const totals = priced?.map((p) => p.groupTotal).filter((t): t is number => t != null) ?? []
  const cheapestTotal = totals.length ? Math.min(...totals) : null

  return (
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
                      {!configured ? (
                        <span className="text-slate2">—</span>
                      ) : cell?.usd == null ? (
                        <span className="text-slate2">n/a</span>
                      ) : (
                        `$${cell.usd.toFixed(0)}`
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
  )
}
