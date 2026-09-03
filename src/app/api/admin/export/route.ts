import { listAttendees } from '@/lib/attendees'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLUMNS = [
  'name',
  'nickname',
  'status',
  'email',
  'phone',
  'origin_city',
  'origin_airport',
  'arrival_flight',
  'arrival_at',
  'departure_flight',
  'departure_at',
  'needs_transfer',
  'room_pref',
  'roommate_pref',
  'foil_level',
  'bringing_gear',
  'rental_needed',
  'wetsuit_size',
  'shirt_size',
  'dietary',
  'passport_expiry',
  'emergency_contact',
  'paid_status',
  'notes',
] as const

// Quote everything and double any embedded quote — a name with a comma in it
// should not silently split a column in Sheets.
function cell(value: unknown) {
  if (value == null) return '""'
  const text = Array.isArray(value) ? value.join(' ') : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET() {
  const attendees = await listAttendees()
  const rows = [
    COLUMNS.join(','),
    ...attendees.map((a) => COLUMNS.map((c) => cell(a[c])).join(',')),
  ]

  return new Response(rows.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="chicama-crew-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
