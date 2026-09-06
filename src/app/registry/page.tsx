import { notFound } from 'next/navigation'
import { Page } from '@/components/ui'
import { WEDDING, real } from '@/lib/config'
import { registryReady } from '@/lib/nav'

export const metadata = { title: 'Registry' }

export default function RegistryPage() {
  // Nothing to link to yet — better a 404 than a page that says "gifts" and
  // then nothing at all.
  if (!registryReady()) notFound()

  const links = WEDDING.registry.links.filter((l) => real(l.url))

  return (
    <Page marker="Presents" title="Registry" lede={real(WEDDING.registry.note) ?? undefined}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="card p-6 block hover:bg-linen2/40 transition-colors"
            >
              <p className="display text-xl mb-1">{real(link.name) ?? link.url}</p>
              {link.note && <p className="text-sm text-muted">{link.note}</p>}
              <p className="marker mt-3">Open ↗</p>
            </a>
          </li>
        ))}
      </ul>
    </Page>
  )
}
