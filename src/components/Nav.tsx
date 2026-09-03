'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Trip' },
  { href: '/me', label: 'Your details' },
  { href: '/roster', label: 'Crew' },
  { href: '/dates', label: 'Dates' },
  { href: '/swell', label: 'Swell' },
  { href: '/flights', label: 'Flights' },
  { href: '/arrivals', label: 'Arrivals' },
]

export default function Nav() {
  const pathname = usePathname()
  if (pathname === '/gate') return null

  return (
    <header className="border-b border-hairline sticky top-0 z-30 bg-bone/90 backdrop-blur">
      <nav className="max-w-page mx-auto px-6 h-14 flex items-center gap-6 overflow-x-auto">
        <Link href="/" className="display text-lg shrink-0">
          CHICAMA
        </Link>
        <ul className="flex items-center gap-5 text-sm">
          {LINKS.slice(1).map((link) => {
            const active = pathname === link.href
            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'whitespace-nowrap border-b-2 pb-0.5 transition-colors ' +
                    (active
                      ? 'border-ochre text-ink font-medium'
                      : 'border-transparent text-slate2 hover:text-ink')
                  }
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
