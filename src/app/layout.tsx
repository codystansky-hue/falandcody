import type { Metadata } from 'next'
import { Archivo, Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google'
import { TRIP } from '@/lib/config'
import Nav from '@/components/Nav'
import './globals.css'

// Bricolage for display — a grotesque with enough kink to read as hand-painted
// hull lettering rather than a default UI face. Plex Mono carries anything that
// is really an instrument reading: swell, flight numbers, times.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['700', '800'],
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

export const metadata: Metadata = {
  title: `${TRIP.name} — ${TRIP.subtitle}`,
  description: `Trip details, crew list and swell for ${TRIP.venue.name}, ${TRIP.venue.town}.`,
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-hairline mt-24">
          <div className="max-w-page mx-auto px-6 py-8 flex flex-wrap gap-x-6 gap-y-2 justify-between marker">
            <span>{TRIP.venue.name} · {TRIP.venue.town}</span>
            <span>Forecast: Open-Meteo · Tracking: OpenSky</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
