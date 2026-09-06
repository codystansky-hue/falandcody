import Link from 'next/link'
import { Notice, Page, Todo } from '@/components/ui'
import CopyBlock from '@/components/CopyBlock'
import { WEDDING, isTodo, real } from '@/lib/config'
import { listGuests } from '@/lib/guests'
import { money } from '@/lib/costs'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Where to stay' }

export default async function StayPage() {
  const guests = await listGuests()
  const inBlock = guests.filter((g) => g.status !== 'no' && g.stay_pref === 'block').length
  const needHelp = guests.filter((g) => g.status !== 'no' && g.stay_pref === 'help').length

  const blocks = WEDDING.stay.blocks.filter((b) => !isTodo(b.name))
  const release = real(WEDDING.stay.blockReleaseDate)
  const groupEmail = real(WEDDING.stay.groupEmail)

  return (
    <Page
      marker={real(WEDDING.venue.town) ?? 'Accommodation'}
      title="Where to stay"
      lede="We have held rooms so nobody has to gamble on a search engine. Book early — a held block is only held until the date below."
    >
      {release && (
        <div className="mb-8">
          <Notice title={`Rooms are held until ${release}`} tone="warn">
            <p>
              After that the hotel releases whatever is unbooked and the rate goes back to whatever
              the internet says that week. Book before then even if your flights are not sorted.
            </p>
          </Notice>
        </div>
      )}

      {blocks.length === 0 ? (
        <Notice title="No rooms blocked yet">
          <p>
            When you have negotiated a block, add it to <span className="mono">WEDDING.stay.blocks</span>{' '}
            in <span className="mono">src/lib/config.ts</span> and it appears here with the rate,
            the code and the deadline.
          </p>
        </Notice>
      ) : (
        <div className="space-y-6">
          {blocks.map((block) => (
            <section key={block.key} className="card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-3">
                <h2 className="display text-2xl">{block.name}</h2>
                {block.fromRate > 0 && (
                  <p className="mono text-lg">
                    {money(block.fromRate)}
                    <span className="text-muted text-sm"> a night</span>
                  </p>
                )}
              </div>

              <dl className="text-sm divide-y divide-hairline border-y border-hairline mb-4">
                {block.rooms > 0 && (
                  <div className="flex justify-between gap-6 py-2.5">
                    <dt className="text-muted">Rooms held</dt>
                    <dd className="mono">{block.rooms}</dd>
                  </div>
                )}
                {block.walkMinutes != null && (
                  <div className="flex justify-between gap-6 py-2.5">
                    <dt className="text-muted">From the venue</dt>
                    <dd className="mono">{block.walkMinutes} min walk</dd>
                  </div>
                )}
                {block.driveMinutes != null && (
                  <div className="flex justify-between gap-6 py-2.5">
                    <dt className="text-muted">From the venue</dt>
                    <dd className="mono">{block.driveMinutes} min drive</dd>
                  </div>
                )}
              </dl>

              {real(block.note) && <p className="text-sm mb-4">{block.note}</p>}

              {block.code && (
                <div className="mb-4">
                  <p className="label">Booking code</p>
                  <CopyBlock text={block.code} />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {real(block.url) && (
                  <a href={block.url} target="_blank" rel="noreferrer" className="btn">
                    Book a room ↗
                  </a>
                )}
                {groupEmail && (
                  <a
                    href={`mailto:${groupEmail}?subject=${encodeURIComponent(
                      `Room in the ${real(WEDDING.couple.joined) ?? 'wedding'} block`,
                    )}&body=${encodeURIComponent(
                      [
                        'Hello,',
                        '',
                        `I would like a room in the block held for ${real(WEDDING.couple.joined) ?? 'the wedding'}${
                          block.code ? ` (code ${block.code})` : ''
                        }.`,
                        '',
                        'Nights: ',
                        'Name: ',
                        'Number of guests: ',
                        '',
                        'Thank you.',
                      ].join('\n'),
                    )}`}
                    className="btn btn-quiet"
                  >
                    Email the hotel
                  </a>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {real(WEDDING.stay.alternativesNote) && (
        <section className="mt-12">
          <p className="marker mb-3">If the block is not for you</p>
          <p className="text-muted max-w-2xl">{WEDDING.stay.alternativesNote}</p>
        </section>
      )}

      <section className="mt-12">
        <p className="marker mb-3">Where everyone else is</p>
        <p className="text-muted">
          {inBlock > 0 || needHelp > 0 ? (
            <>
              {inBlock} {inBlock === 1 ? 'reply is' : 'replies are'} in the block so far
              {needHelp > 0 && <>, and {needHelp} asked for a hand working it out</>}.
            </>
          ) : (
            <Todo what="Nobody has said where they are sleeping yet." />
          )}
        </p>
        <p className="mt-4">
          <Link href="/rsvp" className="underline underline-offset-2">
            Tell us your plan
          </Link>
        </p>
      </section>
    </Page>
  )
}
