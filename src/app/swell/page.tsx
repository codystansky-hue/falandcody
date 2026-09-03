import { Notice, Page, Stat } from '@/components/ui'
import { compass, getForecast, metresToFeet, type SwellDay } from '@/lib/swell'
import { CLIMATE_SOURCE, SEASON, WINDOW_BLOCKS, wetsuitFor } from '@/lib/season'
import { TRIP } from '@/lib/config'

export const revalidate = 3600

export const metadata = { title: 'Swell — Chicama' }

const VERDICT_COPY: Record<SwellDay['verdict'], string> = {
  firing: 'Firing',
  good: 'Good',
  fun: 'Fun',
  flat: 'Slow',
}

const WINDOW_MONTHS = ['Oct', 'Nov', 'Dec']

export default async function SwellPage() {
  let forecast: SwellDay[] | null = null
  try {
    forecast = await getForecast(7)
  } catch {
    forecast = null
  }

  const inWindow = SEASON.filter((m) => WINDOW_MONTHS.includes(m.month))
  const coldest = SEASON.reduce((a, b) => (b.sst < a.sst ? b : a))

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

      {/* The season, from five years of reanalysis rather than received wisdom. */}
      <section className="mt-16">
        <p className="marker mb-1">The season</p>
        <h2 className="display text-3xl mb-3">What the record says</h2>
        <p className="text-slate2 max-w-2xl mb-6">
          Five years of reanalysis at the point&rsquo;s own coordinates, every day scored by the
          same function that scores the forecast above. Solid bars are the share of days that come
          out good or better; the ochre wedge on top is the share that come out firing.
        </p>

        <div className="card p-5 overflow-x-auto">
          <div className="flex items-end gap-1.5 h-52 min-w-[34rem]">
            {SEASON.map((m) => {
              const inTrip = WINDOW_MONTHS.includes(m.month)
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="mono text-[0.65rem] text-slate2">{m.good}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: `${m.good}%` }}>
                    <div
                      className="w-full"
                      style={{
                        height: `${(m.firing / m.good) * 100}%`,
                        background: 'var(--ochre)',
                        opacity: inTrip ? 1 : 0.45,
                      }}
                      title={`${m.firing}% firing`}
                    />
                    <div
                      className="w-full flex-1"
                      style={{ background: 'var(--sea)', opacity: inTrip ? 0.75 : 0.22 }}
                    />
                  </div>
                  <span className={'mono text-[0.65rem] ' + (inTrip ? 'text-ink font-medium' : 'text-slate2')}>
                    {m.month}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-sm text-slate2 mt-4">
            The three lit months are the window we are looking at. October has the highest share of
            standout days of any month in the record — 28% — and November is not far behind on good
            days while being the driest and quietest month of the year. December is where it falls
            away.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <p className="marker mb-4">Inside the window, ten days at a time</p>
        <div className="overflow-x-auto card">
          <table className="w-full text-sm border-collapse min-w-[38rem]">
            <thead>
              <tr className="border-b border-hairline">
                {['Block', 'Good or better', 'Firing', 'Mean period', 'Mean swell', 'Water'].map((h) => (
                  <th key={h} className="label text-left px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WINDOW_BLOCKS.map((block) => (
                <tr key={block.label} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 font-medium">{block.label}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-1.5 w-16 shrink-0"
                        style={{
                          background: `linear-gradient(to right, var(--sea) ${block.good}%, var(--bone-2) ${block.good}%)`,
                        }}
                        aria-hidden
                      />
                      <span className="mono text-xs">{block.good}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 mono">{block.firing}%</td>
                  <td className="px-4 py-3 mono">{block.periodS.toFixed(1)} s</td>
                  <td className="px-4 py-3 mono">{block.swellFt.toFixed(1)} ft</td>
                  <td className="px-4 py-3 mono">{block.sst.toFixed(1)} °C</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate2 mt-4">
          Everything from 1 October to 30 November holds up. The first ten days of November are the
          single best block for good days; the first ten of October are the best for standout ones.
          After 10 December the swell drops under 4 ft and the standout days all but stop.
        </p>
      </section>

      {/* The practical half. Cold water is the thing people get wrong here. */}
      <section className="mt-12">
        <p className="marker mb-4">What to pack for</p>
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          {inWindow.map((m) => (
            <Stat
              key={m.month}
              label={m.month}
              value={`${m.sst.toFixed(1)} °C`}
              sub={`Air ${m.air[0].toFixed(0)}/${m.air[1].toFixed(0)} °C · ${m.rainMm.toFixed(0)} mm rain`}
            />
          ))}
        </div>
        <div className="card border-l-2 border-l-rust p-5">
          <p className="font-semibold mb-1.5">
            This is cold water. Bring a {wetsuitFor(coldest.sst).toLowerCase()}.
          </p>
          <p className="text-sm text-slate2">
            The Humboldt current runs up this coast straight off the Southern Ocean, so Chicama
            never warms up the way its latitude suggests — it sits eight degrees from the equator
            and the sea is {coldest.sst.toFixed(1)} °C. October is the coldest month of the entire
            year. The air is mild and it essentially never rains, which catches people out: they
            pack for a desert and get in the water in boardshorts once.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <p className="marker mb-4">If you book a random week</p>
        <div className="card p-5">
          <ul className="text-sm divide-y divide-hairline">
            {inWindow.map((m) => (
              <li key={m.month} className="flex justify-between py-2.5">
                <span>{m.month}</span>
                <span className="mono">
                  {m.weekOdds}% chance of three or more good days
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate2 mt-4">
            Across the record, every single seven-day window starting in October contained at least
            three good days. That is the number that matters more than any monthly average — nobody
            is flying to Peru for one afternoon.
          </p>
        </div>
      </section>

      <p className="mt-10 marker">{CLIMATE_SOURCE}</p>
      <p className="mt-2 text-xs text-slate2 max-w-2xl">
        The score peaks around 1.6 m and tapers above it, which suits a foil trip where a
        long-period 4 ft day is a great day. A surf-first score would rank the big-swell months
        higher than they sit here. It is also a global wave model sampled at a coastal cell, so it
        cannot see the headland refraction that is the whole reason this wave exists — read it as
        month-to-month shape, not gospel. The window under consideration is{' '}
        {TRIP.window.label.toLowerCase()}.
      </p>
    </Page>
  )
}
