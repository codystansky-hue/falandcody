import { listGuests, headcount, type Guest } from '@/lib/guests'
import { WEDDING, real } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Header label -> how to read it off the row. Timestamps render in the venue's
// timezone, because that is the only one anybody planning this cares about and
// String(date) would otherwise emit whatever zone the server happens to run in.
const FULL: [string, (g: Guest) => unknown][] = [
  ['name', (g) => g.name],
  ['status', (g) => g.status],
  ['heads', (g) => headcount(g)],
  ['side', (g) => g.side],
  ['email', (g) => g.email],
  ['phone', (g) => g.phone],
  ['postal_address', (g) => oneLine(g.postal_address)],
  ...WEDDING.events.map(
    (event) =>
      [`at_${event.key}`, (g: Guest) => (g.attending_events.includes(event.key) ? 'yes' : '')] as [
        string,
        (g: Guest) => unknown,
      ],
  ),
  ['plus_one', (g) => (g.plus_one ? g.plus_one_name || 'yes' : '')],
  ['kids', (g) => g.kids || ''],
  ['kids_names', (g) => g.kids_names],
  ['dietary', (g) => g.dietary],
  ['song_request', (g) => g.song_request],
  ['message', (g) => oneLine(g.message)],
  ['stay_pref', (g) => g.stay_pref],
  ['staying_with', (g) => g.staying_with],
  ['origin_city', (g) => g.origin_city],
  ['origin_airport', (g) => g.origin_airport],
  ['arrival_flight', (g) => g.arrival_flight],
  ['arrival_venue_time', (g) => venueDateTime(g.arrival_at)],
  ['departure_flight', (g) => g.departure_flight],
  ['departure_venue_time', (g) => venueDateTime(g.departure_at)],
  ['needs_transfer', (g) => g.needs_transfer],
  ['passport_expiry', (g) => isoDate(g.passport_expiry)],
  ['emergency_contact', (g) => g.emergency_contact],
  ['paid_status', (g) => g.paid_status],
  ['notes', (g) => oneLine(g.notes)],
]

// A second, narrower export, because addressing envelopes is its own evening
// and does not want thirty columns of flight data in the way.
const ADDRESSES: [string, (g: Guest) => unknown][] = [
  ['name', (g) => g.name],
  ['plus_one', (g) => (g.plus_one ? g.plus_one_name || 'yes' : '')],
  ['postal_address', (g) => oneLine(g.postal_address)],
  ['email', (g) => g.email],
  ['status', (g) => g.status],
]

const tz = () => real(WEDDING.date.tz) ?? undefined

/** Newlines inside a CSV cell survive quoting but break most paste targets. */
function oneLine(value: string | null) {
  return value ? value.replace(/\s*\n\s*/g, ' · ') : ''
}

function venueDateTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const zone = tz()
  // en-CA gives YYYY-MM-DD, which spreadsheets sort and parse correctly.
  const date = d.toLocaleDateString('en-CA', zone ? { timeZone: zone } : {})
  const time = d.toLocaleTimeString('en-GB', {
    ...(zone ? { timeZone: zone } : {}),
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

function isoDate(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA', { timeZone: 'UTC' })
}

// Quote everything and double any embedded quote — a name with a comma in it
// should not silently split a column in Sheets.
function cell(value: unknown) {
  if (value == null) return '""'
  return `"${String(value).replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  const what = new URL(request.url).searchParams.get('what')
  const addressesOnly = what === 'addresses'
  const columns = addressesOnly ? ADDRESSES : FULL

  let guests = await listGuests()
  if (addressesOnly) guests = guests.filter((g) => g.postal_address)

  const rows = [
    columns.map(([label]) => label).join(','),
    ...guests.map((g) => columns.map(([, read]) => cell(read(g))).join(',')),
  ]

  const slug = (real(WEDDING.couple.joined) ?? 'wedding')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return new Response(rows.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${slug}-${addressesOnly ? 'addresses' : 'guests'}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
