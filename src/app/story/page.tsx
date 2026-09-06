import { notFound } from 'next/navigation'
import { Page } from '@/components/ui'
import { WEDDING, isTodo, real } from '@/lib/config'
import { storyWritten } from '@/lib/nav'

export const metadata = { title: 'Us' }

export default function StoryPage() {
  if (!storyWritten()) notFound()

  const paragraphs = WEDDING.story.paragraphs.filter((p) => !isTodo(p) && p.trim())

  return (
    <Page marker="Us" title={real(WEDDING.story.headline) ?? 'How we got here'}>
      <div className="max-w-2xl space-y-5 text-lg leading-relaxed">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </Page>
  )
}
