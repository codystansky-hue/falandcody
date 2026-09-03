import { Notice, Page } from '@/components/ui'
import CopyBlock from '@/components/CopyBlock'
import GroupEnquiry from '@/components/GroupEnquiry'
import { listAttendees, listVotes } from '@/lib/attendees'
import { TRIP } from '@/lib/config'
import { HOTEL } from '@/lib/hotel'
import { PROPOSED_WEEKS, tallyWeeks } from '@/lib/weeks'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'The hotel — Chicama' }

export default async function HotelPage() {
  const [attendees, votes] = await Promise.all([listAttendees(), listVotes()])
  const going = attendees.filter((a) => a.status !== 'out')
  const leading = tallyWeeks(votes)[0] ?? PROPOSED_WEEKS[0]

  const rooms = TRIP.venue.rooms.map((room) => ({
    ...room,
    wanted: going.filter((a) => a.room_pref === room.key).length,
  }))
  const noPreference = going.filter((a) => !a.room_pref || a.room_pref === 'any').length
  const shuttle = going.filter((a) => a.needs_transfer).length
  const dietary = going.filter((a) => a.dietary).map((a) => `${a.nickname || a.name}: ${a.dietary}`)
  const rentals = going
    .filter((a) => a.rental_needed)
    .map((a) => `${a.nickname || a.name}: ${a.rental_needed}`)

  return (
    <Page
      marker={`${TRIP.venue.name} · ${TRIP.venue.town}`}
      title="The hotel"
      lede="Twenty-three rooms above the bay, a board room for the gear, and a tow-back boat. The important thing is how we book it — not the same way you would book a room for yourself."
    >
      <Notice title="Nobody books individually" tone="warn">
        <p>
          Twelve separate reservations through the online engine is the expensive way to do this:
          no group rate, no guarantee the rooms are together, and a real chance the last few sell
          out halfway through. The hotel runs group reservations through a different channel with
          its own payments schedule.
        </p>
        <p>
          <strong className="text-ink">One person sends one email</strong> to{' '}
          <span className="mono">{HOTEL.groupEmail}</span>, gets a quote and a payment schedule, and
          everyone settles up with them. The draft below is already filled in from the roster.
        </p>
      </Notice>

      <section className="mt-10">
        <p className="marker mb-3">The enquiry, ready to send</p>
        <GroupEnquiry
          email={HOTEL.groupEmail}
          week={leading}
          headcount={going.length}
          rooms={rooms}
          noPreference={noPreference}
          shuttle={shuttle}
          dietary={dietary}
          rentals={rentals}
        />
      </section>

      <section className="mt-14 grid gap-8 md:grid-cols-2">
        <div>
          <p className="marker mb-3">Other ways to reach them</p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            <div className="flex justify-between py-2.5">
              <dt>WhatsApp</dt>
              <dd>
                <a
                  href={HOTEL.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Open chat
                </a>
              </dd>
            </div>
            {HOTEL.phones.map((phone) => (
              <div key={phone.number} className="flex justify-between py-2.5">
                <dt>{phone.label}</dt>
                <dd className="mono">
                  <a href={`tel:${phone.number.replace(/\s/g, '')}`}>{phone.number}</a>
                </dd>
              </div>
            ))}
            <div className="flex justify-between py-2.5">
              <dt>
                Online engine <span className="text-slate2">— individuals only</span>
              </dt>
              <dd>
                <a
                  href={HOTEL.bookingEngine}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Open
                </a>
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate2 mt-3">
            WhatsApp is the fastest way to get an answer out of a Peruvian hotel. Email gets you the
            written quote you actually need.
          </p>
        </div>

        <div>
          <p className="marker mb-3">What the rooms are</p>
          <dl className="text-sm divide-y divide-hairline border-t border-hairline">
            {rooms.map((room) => (
              <div key={room.key} className="flex justify-between py-2.5">
                <dt>
                  {room.label} <span className="text-slate2">×{room.count}</span>
                </dt>
                <dd className="mono">
                  from ${room.fromUsd}
                  {room.wanted > 0 && <span className="text-ochre"> · {room.wanted} want</span>}
                </dd>
              </div>
            ))}
            {noPreference > 0 && (
              <div className="flex justify-between py-2.5 text-slate2">
                <dt>No preference</dt>
                <dd className="mono">{noPreference}</dd>
              </div>
            )}
          </dl>
          <p className="text-xs text-slate2 mt-3">
            Rooms take a king or two twins, and triples exist. Ask for triples in the quote — it is
            the single biggest lever on what this trip costs per head.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <p className="marker mb-3">What the room rate does and does not cover</p>
        <dl className="text-sm divide-y divide-hairline border-t border-hairline max-w-2xl">
          {[
            ['Breakfast', 'Included', true],
            ['Pool, spa, jacuzzis, sauna, gym, yoga', 'Included', true],
            ['Board room for the gear', 'Included', true],
            ['Wi-Fi and parking', 'Included', true],
            ['Tow-ins / tow-back boat', 'NOT included — see below', false],
            ['Hydrofoil hire', 'NOT included, and no price published', false],
            ['Airport transfers from Trujillo', 'Not included in the rate — quoted separately', false],
            ['Lunch and dinner', 'Not included', false],
          ].map(([what, status, yes]) => (
            <div key={what as string} className="flex justify-between gap-4 py-2.5">
              <dt>{what}</dt>
              <dd className={yes ? 'text-sea shrink-0' : 'text-rust shrink-0'}>{status}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-slate2 mt-3 max-w-2xl">
          Lunch, dinner and anything on the water is on top of the room rate.
        </p>
      </section>

      {/* The single most consequential fact for a foiling trip, and it is buried
          on the hotel's own service page. */}
      <section className="mt-14">
        <p className="marker mb-3">Tow-ins — read this properly</p>
        <div className="card border-l-2 border-l-rust p-5 mb-5">
          <p className="font-semibold mb-1.5">Foilers cannot use the cheap boat.</p>
          <p className="text-sm text-slate2">
            The hotel&rsquo;s own words: <em>&ldquo;for safety reasons we will not offer this
            service for Foilers, this service will only be for surfers&rdquo;</em>. The shared boat
            at $30 a head is for surfers. Foilers are on the private boat, and it takes two of us at
            a time.
          </p>
        </div>

        <div className="overflow-x-auto card">
          <table className="w-full text-sm border-collapse min-w-[34rem]">
            <thead>
              <tr className="border-b border-hairline">
                {['', 'Shared boat', 'Private boat'].map((h) => (
                  <th key={h} className="th px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Foilers allowed', 'No', 'Yes — towed into waves'],
                ['Low season (Nov, Dec)', '$30 per person', '$200 per session'],
                ['High season (Mar–Jul, Sep, Oct)', '$35 per person', '$250 per session'],
                ['Capacity', '8 surfers, min 2 to launch', '5 surfers or 2 foilers'],
                ['Session length', '3 h morning, 2¼ h afternoon', 'Up to 3 h, 07:00–17:30'],
                ['Booking', 'At the desk', 'At least 24 h ahead'],
              ].map(([what, shared, priv], i) => (
                <tr key={i} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 font-medium">{what}</td>
                  <td className={'px-4 py-3 ' + (i === 0 ? 'text-rust' : 'mono')}>{shared}</td>
                  <td className={'px-4 py-3 ' + (i === 0 ? 'text-sea' : 'mono')}>{priv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-slate2 mt-4 max-w-2xl">
          Our window is the boat&rsquo;s <strong className="text-ink">low season</strong>, so $200 a
          session rather than $250 — about <strong className="text-ink">$100 each</strong> with two
          foilers aboard. The open question is how many boats they actually run: twelve foilers
          wanting one session a day is six boat sessions a day, and the private boat only operates
          07:00 to 17:30. That is the thing to pin down in the quote.
        </p>
      </section>

      <section className="mt-14">
        <p className="marker mb-3">Terms worth knowing before you pay</p>
        <ul className="text-sm text-slate2 space-y-2 max-w-2xl">
          <li>
            <span className="text-ink">Group bookings get a payments schedule</span> rather than one
            charge — ask for it in writing and pass it on before anyone sends money.
          </li>
          <li>
            <span className="text-ink">One postponement is allowed</span> within the year the
            booking was made.
          </li>
          <li>
            <span className="text-ink">Refunds carry a fee</span> — around US$40 for transfers
            abroad, US$25 within Peru — deducted from prepayments.
          </li>
          <li>
            <span className="text-ink">Rates are quoted in US dollars</span> and the hotel reserves
            the right to move them with the exchange rate or the season, so get the quote dated.
          </li>
          <li>
            <span className="text-ink">Ask for the IGV exemption</span> on the quote. Non-resident
            foreigners staying under 60 days are zero-rated on lodging and food — bring your
            passport entry stamp or the digital TAM.
          </li>
        </ul>
        <p className="text-xs text-slate2 mt-4">
          Taken from the hotel&rsquo;s published reservation terms. Confirm all of it in the quote —
          these change.
        </p>
      </section>

      <section className="mt-14">
        <p className="marker mb-3">If you do book your own room anyway</p>
        <CopyBlock text={`${leading.start} to ${leading.end} · ${TRIP.venue.name} · ask for the group rate under the block booking`} />
      </section>
    </Page>
  )
}
