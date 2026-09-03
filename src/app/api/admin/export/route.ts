import { listAttendees, type Attendee } from '@/lib/attendees'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Header label -> how to read it off the row. Timestamps are rendered in Peru
// time, because that is the only timezone anyone on this trip cares about and
// String(date) would otherwise emit whatever zone the server happens to run in.
const COLUMNS: [string, (a: Attendee) => unknown][] = [
  ['name', (a) => a.name],
  ['nickname', (a) => a.nickname],
  ['status', (a) => a.status],
  ['email', (a) => a.email],
  ['phone', (a) => a.phone],
  ['origin_city', (a) => a.origin_city],
  ['origin_airport', (a) => a.origin_airport],
  ['arrival_flight', (a) => a.arrival_flight],
  ['arrival_peru_time', (a) => peruDateTime(a.arrival_at)],
  ['departure_flight', (a) => a.departure_flight],
  ['departure_peru_time', (a) => peruDateTime(a.departure_at)],
  ['needs_transfer', (a) => a.needs_transfer],
  ['room_pref', (a) => a.room_pref],
  ['roommate_pref', (a) => a.roommate_pref],
  ['foil_level', (a) => a.foil_level],
  ['bringing_gear', (a) => a.bringing_gear.join(', ')],
  ['rental_needed', (a) => a.rental_needed],
  ['wetsuit_size', (a) => a.wetsuit_size],
  ['shirt_size', (a) => a.shirt_size],
  ['dietary', (a) => a.dietary],
  ['passport_expiry', (a) => isoDate(a.passport_expiry)],
  ['emergency_contact', (a) => a.emergency_contact],
  ['paid_status', (a) => a.paid_status],
  ['notes', (a) => a.notes],
]

function peruDateTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // en-CA gives YYYY-MM-DD, which spreadsheets sort and parse correctly.
  const date = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const time = d.toLocaleTimeString('en-GB', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

function isoDate(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
}

// Quote everything and double any embedded quote — a name with a comma in it
// should not silently split a column in Sheets.
function cell(value: unknown) {
  if (value == null) return '""'
  return `"${String(value).replace(/"/g, '""')}"`
}

export async function GET() {
  const attendees = await listAttendees()
  const rows = [
    COLUMNS.map(([label]) => label).join(','),
    ...attendees.map((a) => COLUMNS.map(([, read]) => cell(read(a))).join(',')),
  ]

  return new Response(rows.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="chicama-crew-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
