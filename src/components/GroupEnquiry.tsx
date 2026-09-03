'use client'

import { useState } from 'react'
import type { ProposedWeek } from '@/lib/weeks'

/**
 * Writes the whole group enquiry from the roster so the organiser sends one
 * email instead of assembling it. Editable before sending, because the roster
 * is never quite finished and the hotel should get real numbers.
 */
export default function GroupEnquiry({
  email,
  week,
  headcount,
  rooms,
  noPreference,
  shuttle,
  dietary,
  rentals,
}: {
  email: string
  week: ProposedWeek
  headcount: number
  rooms: { key: string; label: string; count: number; wanted: number }[]
  noPreference: number
  shuttle: number
  dietary: string[]
  rentals: string[]
}) {
  const roomLines = rooms
    .filter((r) => r.wanted > 0)
    .map((r) => `  - ${r.label}: ${r.wanted} requested`)
  if (noPreference > 0) roomLines.push(`  - No preference: ${noPreference}`)

  const draft = [
    `Hello,`,
    ``,
    `I would like a group quote for ${headcount || 'about 12'} people, arriving ${week.start} and departing ${week.end} (${week.label}, 7 nights).`,
    ``,
    `We are a group of hydrofoilers coming for the point. A few questions:`,
    ``,
    `1. What is your best group rate for these dates, and can you hold a block of rooms?`,
    `2. Can any of the rooms be set up as triples? We would rather share and spend the`,
    `   difference on the water.`,
    `3. Please quote with the IGV exemption applied — we are all non-resident foreigners`,
    `   staying well under 60 days, and will bring passports and TAM records.`,
    `4. What is the payment schedule and the deposit deadline?`,
    `5. Airport transfers from Trujillo (TRU) for ${shuttle || headcount} people — cost, and can`,
    `   you group us into shared vans by arrival time?`,
    `6. Hydrofoil equipment hire and tow-back service — availability and daily rates.`,
    ...(roomLines.length ? [``, `Room preferences so far:`, ...roomLines] : []),
    ...(rentals.length
      ? [``, `Gear we expect to hire:`, ...rentals.map((r) => `  - ${r}`)]
      : []),
    ...(dietary.length
      ? [``, `Dietary requirements:`, ...dietary.map((d) => `  - ${d}`)]
      : []),
    ``,
    `Our dates are not fully locked yet, so if another week in November suits your`,
    `availability better, please say so.`,
    ``,
    `Thank you,`,
  ].join('\n')

  const [body, setBody] = useState(draft)
  const [copied, setCopied] = useState(false)

  const subject = `Group booking enquiry — ${headcount || 12} people, ${week.start} to ${week.end}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* the textarea is selectable anyway */
    }
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 text-sm">
        <span>
          <span className="label inline mr-2">To</span>
          <span className="mono">{email}</span>
        </span>
        <span>
          <span className="label inline mr-2">Subject</span>
          <span className="mono">{subject}</span>
        </span>
      </div>
      <textarea
        className="field mono text-xs leading-relaxed"
        rows={22}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Group booking enquiry draft"
      />
      <div className="flex flex-wrap gap-2 mt-3">
        <a
          className="btn"
          href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
        >
          Open in email
        </a>
        <button type="button" className="btn btn-quiet" onClick={copy}>
          {copied ? 'Copied' : 'Copy the text'}
        </button>
      </div>
      <p className="text-xs text-slate2 mt-3">
        Edit anything before you send it. Long drafts sometimes get truncated by the mail client —
        if that happens, copy the text and paste it instead.
      </p>
    </div>
  )
}
