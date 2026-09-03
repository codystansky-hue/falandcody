import { Notice, Page } from '@/components/ui'
import { compass, getForecast, metresToFeet, type SwellDay } from '@/lib/swell'

export const revalidate = 3600

export const metadata = { title: 'Swell — Chicama' }

const VERDICT_COPY: Record<SwellDay['verdict'], string> = {
  firing: 'Firing',
  good: 'Good',
  fun: 'Fun',
  flat: 'Slow',
}

// Chicama's season, which is the part that actually matters when the dates are
// still open. April and September carry the best odds of a working swell.
const SEASON = [
  { month: 'Jan', odds: 25 },
  { month: 'Feb', odds: 40 },
  { month: 'Mar', odds: 65 },
  { month: 'Apr', odds: 97 },
  { month: 'May', odds: 90 },
  { month: 'Jun', odds: 88 },
  { month: 'Jul', odds: 90 },
  { month: 'Aug', odds: 92 },
  { month: 'Sep', odds: 97 },
  { month: 'Oct', odds: 80 },
  { month: 'Nov', odds: 45 },
  { month: 'Dec', odds: 30 },
]

export default async function SwellPage() {
  let forecast: SwellDay[] | null = null
  try {
    forecast = await getForecast(7)
  } catch {
    forecast = null
  }

  return (
    <Page
      marker="Open-Meteo marine · refreshed hourly"
      title="Swell"
      lede="Long-period south-southwest groundswell is what wraps the headland and turns the point on. Period matters more here than size — Chicama will run on a modest swell if the lines are long enough."
    >
      {forecast ? (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm border-collapse min-w-[40rem]">
            <thead>
              <tr className="border-b border-hairline">
                {['Day', 'Swell', 'Period', 'Direction', 'Wind', 'Call'].map((h) => (
                  <th key={h} className="label text-left px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecast.map((day) => (
                <tr key={day.day} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3">
                    {new Date(day.day + 'T12:00:00').toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 mono">
                    {metresToFeet(day.swellM)?.toFixed(1) ?? '—'} ft
                    <span className="text-slate2"> · {day.swellM?.toFixed(2) ?? '—'} m</span>
                  </td>
                  <td className="px-4 py-3 mono">{day.periodS?.toFixed(0) ?? '—'} s</td>
                  <td className="px-4 py-3 mono">
                    {compass(day.dirDeg)}
                    <span className="text-slate2"> {day.dirDeg?.toFixed(0) ?? '—'}°</span>
                  </td>
                  <td className="px-4 py-3 mono">
                    {day.windKmh?.toFixed(0) ?? '—'} km/h {compass(day.windDirDeg)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-1.5 w-16 shrink-0"
                        style={{
                          background: `linear-gradient(to right, var(--ochre) ${day.score}%, var(--bone-2) ${day.score}%)`,
                        }}
                        aria-hidden
                      />
                      <span className="mono text-xs">{VERDICT_COPY[day.verdict]}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Notice title="Forecast unreachable">
          <p>
            Open-Meteo did not answer. It needs no key and no account, so this is a temporary
            outage rather than something to configure.
          </p>
        </Notice>
      )}

      <section className="mt-14">
        <p className="marker mb-4">Odds of a working swell, by month</p>
        <div className="card p-5">
          <div className="flex items-end gap-1.5 h-40" role="img" aria-label="Monthly swell odds for Chicama">
            {SEASON.map((m) => {
              const peak = m.odds >= 95
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="mono text-[0.65rem] text-slate2">{m.odds}</span>
                  <div
                    className="w-full"
                    style={{
                      height: `${m.odds}%`,
                      background: peak ? 'var(--ochre)' : 'var(--sea)',
                      opacity: peak ? 1 : 0.35,
                    }}
                  />
                  <span className="mono text-[0.65rem]">{m.month}</span>
                </div>
              )
            })}
          </div>
          <p className="text-sm text-slate2 mt-4">
            The season runs April to October. April and September are the two months that almost
            never miss — worth weighting when the crew picks a week on the{' '}
            <a href="/dates" className="underline underline-offset-2 text-ink">
              dates page
            </a>
            .
          </p>
        </div>
      </section>
    </Page>
  )
}
