import { Page } from '@/components/ui'
import CopyBlock from '@/components/CopyBlock'
import { WEDDING, real } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Point your Claude here' }

const TOOLS = [
  ['wedding_overview', 'Who, when, where, and what is actually settled'],
  ['schedule', 'Every event, with times, places and dress code'],
  ['guest_list', 'Who has replied and who is coming'],
  ['where_to_stay', 'The room blocks, rates, codes and deadlines'],
  ['faq', 'The couple’s own answers to the usual questions'],
  ['find_flights', 'Prefilled flight searches from your home airport'],
  ['arrivals_board', 'Who shares which car from the airport'],
  ['cost_estimate', 'Roughly what coming will cost you'],
  ['rsvp', 'Reply, or change a reply you already sent'],
]

export default function ConnectPage() {
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://your-site.vercel.app'
  const url = `${base}/api/mcp`
  const names = real(WEDDING.couple.joined) ?? 'the wedding'

  return (
    <Page
      marker="For the ones who would rather type than click"
      title="Point your Claude at this"
      lede="The site is also an MCP server, so you can skip the form entirely and just tell your own Claude what you want. It can RSVP for you, read the schedule, and hand you a flight search with the dates already in it."
    >
      <section className="mb-12">
        <p className="marker mb-3">Claude Code, one command</p>
        <CopyBlock
          text={`claude mcp add --transport http wedding "${url}" --header "Authorization: Bearer <passphrase>"`}
        />
        <p className="text-sm text-muted mt-3">
          Swap <span className="mono">&lt;passphrase&gt;</span> for the one on your invitation — the
          same one that gets you into this site.
        </p>
      </section>

      <section className="mb-12">
        <p className="marker mb-3">Claude desktop or web — add a custom connector</p>
        <p className="text-sm text-muted mb-3">
          Settings → Connectors → Add custom connector. Paste this URL, which carries the passphrase
          so there is no header to configure:
        </p>
        <CopyBlock text={`${url}?key=<passphrase>`} />
      </section>

      <section className="mb-12">
        <p className="marker mb-3">Then just talk to it</p>
        <ul className="space-y-2.5 text-sm">
          {[
            `RSVP me for ${names}. Two of us, we will be at everything except the brunch.`,
            'I am flying from Denver — what does the journey look like and what do flights cost?',
            'What time is the ceremony and what should I wear?',
            'Where is everyone staying, and is there still a room in the block?',
            'Roughly what will the whole weekend cost me?',
          ].map((line) => (
            <li key={line} className="card p-4 text-ink">
              <span className="text-muted mono text-xs mr-2">&gt;</span>
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
              <dt className="mono w-44 shrink-0">{name}</dt>
              <dd className="text-muted">{what}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <p className="marker mb-3">Worth knowing</p>
        <ul className="text-sm text-muted space-y-2 max-w-2xl">
          <li>
            <span className="text-ink">Keep your edit token.</span> The first time it replies for
            you, <span className="mono">rsvp</span> hands back an{' '}
            <span className="mono">edit_token</span>. Your Claude should hold onto it — passing it
            back is what updates your reply instead of creating a second you.
          </li>
          <li>
            <span className="text-ink">All times are local to the venue.</span> Give it landing
            times as they appear on your ticket.
          </li>
          <li>
            <span className="text-ink">It reads the guest list, not the address book.</span> Anyone
            with the passphrase can see who is coming — the same as the website. Emails, phone
            numbers, postal addresses and emergency contacts are not exposed through it.
          </li>
          <li>
            <span className="text-ink">It knows what it does not know.</span> Anything the couple
            have not decided yet comes back as undecided rather than as a plausible guess.
          </li>
        </ul>
      </section>
    </Page>
  )
}
