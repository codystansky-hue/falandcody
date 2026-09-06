import type { Metadata } from 'next'
import { Fraunces, Archivo, IBM_Plex_Mono } from 'next/font/google'
import { WEDDING, real } from '@/lib/config'
import { navLinks } from '@/lib/nav'
import Nav from '@/components/Nav'
import './globals.css'

// Fraunces for display — a serif with enough warmth and wobble to read as an
// invitation rather than a dashboard, without tipping into copperplate script.
// Archivo carries the reading text. Plex Mono carries anything that is really
// an instrument reading: times, flight numbers, prices, the countdown.
const display = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-display',
  display: 'swap',
})
const body = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

const names = real(WEDDING.couple.joined) ?? 'Our wedding'
const where = real(WEDDING.venue.town)
const when = real(WEDDING.date.label)

export const metadata: Metadata = {
  title: names,
  description: [names, when, where].filter(Boolean).join(' · '),
  // A guest list is not for search engines. The passphrase gate is the real
  // control; this just keeps the page out of results if the link leaks.
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Nav links={navLinks()} wordmark={names} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-hairline mt-24">
          <div className="max-w-page mx-auto px-6 py-8 flex flex-wrap gap-x-6 gap-y-2 justify-between marker">
            <span>{[when, where].filter(Boolean).join(' · ') || 'Details to come'}</span>
            {real(WEDDING.contact.email) && (
              <a href={`mailto:${WEDDING.contact.email}`} className="hover:text-ink">
                Questions → {WEDDING.contact.email}
              </a>
            )}
          </div>
        </footer>
      </body>
    </html>
  )
}
