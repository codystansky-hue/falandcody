'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { NavLink } from '@/lib/nav'

export default function Nav({ links, wordmark }: { links: NavLink[]; wordmark: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname === '/gate') return null

  return (
    <header className="border-b border-hairline sticky top-0 z-30 bg-linen/90 backdrop-blur">
      <nav className="max-w-page mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="display text-lg shrink-0" onClick={() => setOpen(false)}>
          {wordmark}
        </Link>

        {/* Wide screens get the whole list. */}
        <ul className="hidden lg:flex items-center gap-5 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <NavItem link={link} active={pathname === link.href} />
            </li>
          ))}
        </ul>

        {/* Phones get a real menu rather than a row that scrolls off the edge —
            half the guests will open this on a phone in a taxi. */}
        <button
          type="button"
          className="lg:hidden btn-quiet px-3 py-1.5 text-sm border"
          aria-expanded={open}
          aria-controls="nav-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </nav>

      {open && (
        <ul id="nav-menu" className="lg:hidden border-t border-hairline px-6 py-3 space-y-2.5 bg-linen">
          {links.map((link) => (
            <li key={link.href}>
              <NavItem link={link} active={pathname === link.href} onClick={() => setOpen(false)} />
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}

function NavItem({
  link,
  active,
  onClick,
}: {
  link: NavLink
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={link.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={
        'whitespace-nowrap border-b-2 pb-0.5 transition-colors ' +
        (active ? 'border-olive text-ink font-medium' : 'border-transparent text-muted hover:text-ink')
      }
    >
      {link.label}
    </Link>
  )
}
