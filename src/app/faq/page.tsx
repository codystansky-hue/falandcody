import Link from 'next/link'
import { Notice, Page } from '@/components/ui'
import { WEDDING, isTodo, real } from '@/lib/config'

export const metadata = { title: 'FAQ' }

export default function FaqPage() {
  // A question with no answer yet is worse than no question, so unanswered
  // rows are simply not rendered.
  const answered = WEDDING.faq.filter((item) => !isTodo(item.a) && item.a.trim())

  return (
    <Page
      marker="Before you ask"
      title="Questions"
      lede="The things people email us about. If yours is not here, it should be — tell us and we will add it."
    >
      {answered.length === 0 ? (
        <Notice title="No answers written yet">
          <p>
            Answer the questions in <span className="mono">WEDDING.faq</span> in{' '}
            <span className="mono">src/lib/config.ts</span> and they appear here. Anything still
            marked TODO stays hidden rather than showing an empty answer.
          </p>
        </Notice>
      ) : (
        <dl className="divide-y divide-hairline border-y border-hairline">
          {answered.map((item) => (
            <div key={item.q} className="py-6 grid md:grid-cols-[18rem_1fr] gap-x-8 gap-y-2">
              <dt className="display text-lg">{item.q}</dt>
              <dd className="text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-10 flex flex-wrap gap-4 items-center">
        {real(WEDDING.contact.email) && (
          <a href={`mailto:${WEDDING.contact.email}`} className="btn">
            Ask us something
          </a>
        )}
        <Link href="/rsvp" className="btn btn-quiet">
          RSVP
        </Link>
      </div>
    </Page>
  )
}
