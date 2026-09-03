import { Page } from '@/components/ui'
import CopyBlock from '@/components/CopyBlock'
import { TRIP } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Point your Claude here — Chicama' }

const TOOLS = [
  ['trip_overview', 'Where it is, the window, the hotel, who is in'],
  ['proposed_weeks', 'The three candidate weeks, their conditions and the live vote'],
  ['swell_forecast', 'Seven-day swell and wind at the point'],
  ['season_outlook', 'Five years of conditions by month, plus what wetsuit to bring'],
  ['crew_list', 'Everyone signed up, where from, when they land'],
  ['find_flights', 'Prefilled flight searches from your home airport'],
  ['arrivals_board', 'Who shares which shuttle from Trujillo'],
  ['join_trip', 'Add or update your own details'],
  ['vote_weeks', 'Vote yes / maybe / no on the weeks'],
]

export default function ConnectPage() {
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://chicama-hombres.vercel.app'
  const url = `${base}/api/mcp`

  return (
    <Page
      marker="For the ones who would rather type than click"
      title="Point your Claude at this"
      lede="The site is also an MCP server, so you can skip the forms entirely and just tell your own Claude what you want. It can sign you up, vote on dates, read the forecast and hand you a flight search with the dates already in it."
    >
      <section className="mb-12">
        <p className="marker mb-3">Claude Code, one command</p>
        <CopyBlock text={`claude mcp add --transport http chicama "${url}" --header "Authorization: Bearer <passphrase>"`} />
        <p className="text-sm text-slate2 mt-3">
          Swap <span className="mono">&lt;passphrase&gt;</span> for the one from the group chat —
          the same one that gets you into this site.
        </p>
      </section>

      <section className="mb-12">
        <p className="marker mb-3">Claude desktop or web — add a custom connector</p>
        <p className="text-sm text-slate2 mb-3">
          Settings → Connectors → Add custom connector. Paste this URL, which carries the
          passphrase so there is no header to configure:
        </p>
        <CopyBlock text={`${url}?key=<passphrase>`} />
      </section>

      <section className="mb-12">
        <p className="marker mb-3">Then just talk to it</p>
        <ul className="space-y-2.5 text-sm">
          {[
            'Sign me up for Chicama. I fly out of Denver, I can do either November week, and I need to rent a board and foil.',
            'What is the water temperature going to be and what wetsuit should I bring?',
            'Find me flights for whichever week is winning the vote.',
            'Who else is landing around the same time as me?',
            'Is the swell any good right now?',
          ].map((line) => (
            <li key={line} className="card p-4 text-ink">
              <span className="text-slate2 mono text-xs mr-2">&gt;</span>
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <p className="marker mb-3">What it can do</p>
        <dl className="text-sm divide-y divide-hairline border-t border-hairline">
          {TOOLS.map(([name, what]) => (
            <div key={name} className="flex flex-wrap gap-x-4 py-2.5">
              <dt className="mono w-40 shrink-0">{name}</dt>
              <dd className="text-slate2">{what}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <p className="marker mb-3">Worth knowing</p>
        <ul className="text-sm text-slate2 space-y-2 max-w-2xl">
          <li>
            <span className="text-ink">Keep your edit token.</span> The first time it signs you up,{' '}
            <span className="mono">join_trip</span> hands back an{' '}
            <span className="mono">edit_token</span>. Your Claude should hold onto it — passing it
            back is what updates your row instead of creating a second you.
          </li>
          <li>
            <span className="text-ink">All times are Peru time</span> (UTC−5, no daylight saving).
            Give it landing times as they appear on your ticket.
          </li>
          <li>
            <span className="text-ink">It can read the whole roster.</span> Anyone with the
            passphrase can see who is coming and when they land — the same as the website. Contact
            details and emergency contacts are not exposed through it.
          </li>
          <li>
            <span className="text-ink">Everything it writes shows up here</span> straight away, and
            you can fix any of it on your own page at <span className="mono">/me</span>.
          </li>
        </ul>
      </section>

      <p className="mt-12 marker">
        {TRIP.venue.name} · {TRIP.window.label}
      </p>
    </Page>
  )
}
