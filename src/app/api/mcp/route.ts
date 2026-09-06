import {
  EVENT_KEYS,
  RSVP_STATUS,
  SIDE_KEYS,
  STAY_KEYS,
  STAY_OPTIONS,
  WEDDING,
  defaultStay,
  eventDate,
  formatDate,
  isTodo,
  outstanding,
  real,
  weddingDate,
} from '@/lib/config'
import { getByToken, groupTransfers, headcount, headcountFor, listGuests, seats, tally } from '@/lib/guests'
import { saveGuest } from '@/lib/saveGuest'
import { routeOptions } from '@/lib/flightSearch'
import { hoursLabel, journeyFor } from '@/lib/journey'
import { isDbReady } from '@/lib/db'
import { DEFAULTS, estimate, money } from '@/lib/costs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A Model Context Protocol server over Streamable HTTP, so a guest can point
// their own Claude at this site and just talk to it:
//
//   "RSVP me for the wedding, two of us, flying from Denver, we'll skip brunch"
//
// Deliberately hand-rolled JSON-RPC rather than pulling in the SDK: the whole
// surface is a handful of tools with no sessions, no server-initiated messages
// and no streaming, which is about 100 lines of dispatch. Stateless, so it
// survives serverless cold starts without any session store.
//
// Auth is the same shared passphrase as the website, passed either as
// `Authorization: Bearer <passphrase>` or `?key=<passphrase>`. middleware.ts
// exempts this path from the cookie gate because MCP clients cannot do the
// browser cookie dance.

const PROTOCOL_VERSION = '2025-06-18'

type Json = Record<string, unknown>

function authorized(request: Request) {
  const expected = process.env.GATE_PASSPHRASE
  if (!expected) return false
  const header = request.headers.get('authorization')
  const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1]
  const key = new URL(request.url).searchParams.get('key')
  return bearer === expected || key === expected
}

const text = (value: unknown) => ({
  content: [
    { type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
  ],
})

const fail = (message: string) => ({
  content: [{ type: 'text', text: message }],
  isError: true,
})

/** Never hand a model a `TODO:` placeholder — it will repeat it as fact. */
const say = (v: string) => (isTodo(v) ? null : v)

const venueTime = (iso: string | null) => {
  if (!iso) return null
  const tz = real(WEDDING.date.tz)
  return new Date(iso).toLocaleString('en-GB', tz ? { timeZone: tz } : {})
}

// ---------------------------------------------------------------- tool schemas

const TOOLS = [
  {
    name: 'wedding_overview',
    description:
      'The wedding at a glance: who, when, where, the shape of the weekend, how to get there, and how many people have replied. Start here before answering anything else.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'schedule',
    description:
      'Every event of the weekend in order, with dates, times, places, dress code and how many people are coming to each. Use for any "when is X" or "what should I wear" question.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'guest_list',
    description:
      'Who has replied and who is coming, with head counts. Contact details, addresses and private notes are deliberately NOT exposed here.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'where_to_stay',
    description:
      'The room blocks the couple have held: rates, booking codes, deadlines and how to book. Read this before telling anybody to book a hotel themselves.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'faq',
    description:
      'The couple’s own answers to the common questions — dress code, plus-ones, children, parking, timings. Prefer these over guessing.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'find_flights',
    description:
      'Prefilled flight-search links from a home airport, on the dates a guest would actually travel, plus a computed journey time. Returns real URLs to Google Flights, Kayak and Skyscanner — give them to the user to click.',
    inputSchema: {
      type: 'object',
      properties: {
        origin_airport: { type: 'string', description: 'Three-letter IATA code, e.g. DEN' },
      },
      required: ['origin_airport'],
    },
  },
  {
    name: 'arrivals_board',
    description:
      'Who lands when, and which car from the airport each person is grouped into. Anyone landing within two hours of each other shares one.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'cost_estimate',
    description:
      'What it costs one guest to come — bed, flights, transfer, food, gift. Every assumption can be overridden. Use for any "how much will this cost me" question.',
    inputSchema: {
      type: 'object',
      properties: {
        nights: { type: 'number', description: `Default ${DEFAULTS.nights}.` },
        sharing: { type: 'number', description: 'People per room. Default 2.' },
        room_rate: { type: 'number', description: 'Per room per night.' },
        flight: { type: 'number', description: 'Return airfare per person.' },
        gift: { type: 'number' },
      },
    },
  },
  {
    name: 'rsvp',
    description:
      'Reply to the invitation, or change a reply already sent. Returns an edit_token — KEEP IT and pass it back on every later call, otherwise you will create a duplicate guest instead of updating one. Only `name` is required; everything else can follow later.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        edit_token: {
          type: 'string',
          description:
            'From a previous rsvp call. Pass it to UPDATE that guest. Omit only for a genuinely new person.',
        },
        status: { type: 'string', enum: [...RSVP_STATUS], description: 'Default yes.' },
        attending_events: {
          type: 'array',
          items: { type: 'string', enum: [...EVENT_KEYS] },
          description: `Which parts they are coming to. Options: ${EVENT_KEYS.join(', ')}.`,
        },
        email: { type: 'string' },
        phone: { type: 'string' },
        postal_address: { type: 'string' },
        side: { type: 'string', enum: [...SIDE_KEYS], description: 'Who invited them.' },
        plus_one: { type: 'boolean' },
        plus_one_name: { type: 'string' },
        kids: { type: 'number' },
        kids_names: { type: 'string' },
        dietary: { type: 'string', description: 'For everyone in their party, in one line.' },
        song_request: { type: 'string' },
        message: { type: 'string', description: 'A note to the couple. Shown on the guest list.' },
        origin_city: { type: 'string' },
        origin_airport: { type: 'string', description: 'Three-letter IATA code.' },
        arrival_flight: { type: 'string' },
        arrival_at: {
          type: 'string',
          description: 'Landing time in the VENUE’s local time, e.g. 2027-05-14T16:20.',
        },
        departure_flight: { type: 'string' },
        departure_at: { type: 'string', description: 'Venue local time.' },
        needs_transfer: { type: 'boolean', description: 'Wants a car from the airport.' },
        stay_pref: {
          type: 'string',
          enum: [...STAY_KEYS],
          description: STAY_OPTIONS.map((o) => `${o.key} = ${o.label}`).join('; '),
        },
        staying_with: { type: 'string' },
        passport_expiry: { type: 'string', description: 'YYYY-MM-DD.' },
        emergency_contact: { type: 'string' },
      },
      required: ['name'],
    },
  },
] as const

// ---------------------------------------------------------------------- tools

async function callTool(name: string, args: Json) {
  switch (name) {
    case 'wedding_overview': {
      const guests = await listGuests()
      const counts = tally(guests)
      const date = weddingDate()
      const stay = defaultStay()
      const pending = outstanding()

      return text({
        couple: say(WEDDING.couple.joined),
        date: WEDDING.date.confirmed ? say(WEDDING.date.label) : null,
        date_confirmed: WEDDING.date.confirmed && date !== null,
        rsvp_by: say(WEDDING.date.rsvpBy),
        venue: {
          name: say(WEDDING.venue.name),
          town: say(WEDDING.venue.town),
          address: say(WEDDING.venue.address),
          url: say(WEDDING.venue.url),
          about: say(WEDDING.venue.note),
        },
        events: WEDDING.events.map((e) => e.name),
        travel: WEDDING.travel.flyIn
          ? {
              land_at: say(WEDDING.travel.arrival.iata),
              nearest_city: say(WEDDING.travel.arrival.city),
              via: WEDDING.travel.gateway?.iata ?? null,
              from_airport: WEDDING.travel.transferHours
                ? `${WEDDING.travel.transferKm} km, about ${WEDDING.travel.transferHours} h`
                : null,
              suggested_dates: stay,
            }
          : 'Everybody drives — there is no flying involved.',
        replies: counts,
        contact: say(WEDDING.contact.email),
        // Honest about what nobody has decided, so the model says "not settled
        // yet" instead of inventing a venue.
        not_yet_decided: pending.length
          ? `${pending.length} details are still unset in the site config: ${pending.join(', ')}. Say they are not decided yet rather than guessing.`
          : null,
      })
    }

    case 'schedule': {
      const guests = await listGuests()
      return text({
        date_confirmed: WEDDING.date.confirmed,
        events: WEDDING.events.map((event) => {
          const when = eventDate(event)
          return {
            key: event.key,
            name: event.name,
            date: when ? formatDate(when) : null,
            time: say(event.time),
            where: say(event.where),
            dress_code: say(event.dressCode),
            note: say(event.note),
            optional: event.optional,
            coming_so_far: headcountFor(guests, event.key),
          }
        }),
      })
    }

    case 'guest_list': {
      const guests = await listGuests()
      const counts = tally(guests)
      return text({
        counts,
        // Names, party size and public notes only. Everything a guest handed
        // over for logistics stays behind /admin.
        guests: guests.map((g) => ({
          name: g.name,
          status: g.status,
          party_size: headcount(g),
          bringing: [
            g.plus_one ? g.plus_one_name || 'a plus one' : null,
            g.kids > 0 ? `${g.kids} children` : null,
          ].filter(Boolean),
          from: g.origin_city,
          coming_to: g.attending_events,
          note: g.message,
        })),
      })
    }

    case 'where_to_stay': {
      const guests = await listGuests()
      const blocks = WEDDING.stay.blocks.filter((b) => !isTodo(b.name))
      return text({
        rooms_held_until: say(WEDDING.stay.blockReleaseDate),
        group_email: say(WEDDING.stay.groupEmail),
        blocks: blocks.map((b) => ({
          name: b.name,
          url: say(b.url),
          nightly_rate: b.fromRate > 0 ? money(b.fromRate) : null,
          rooms_held: b.rooms || null,
          booking_code: b.code || null,
          walk_minutes: b.walkMinutes,
          drive_minutes: b.driveMinutes,
          note: say(b.note),
        })),
        alternatives: say(WEDDING.stay.alternativesNote),
        so_far: {
          in_the_block: guests.filter((g) => g.status !== 'no' && g.stay_pref === 'block').length,
          need_help: guests.filter((g) => g.status !== 'no' && g.stay_pref === 'help').length,
        },
      })
    }

    case 'faq':
      return text({
        answered: WEDDING.faq.filter((f) => !isTodo(f.a) && f.a.trim()),
        unanswered: WEDDING.faq.filter((f) => isTodo(f.a) || !f.a.trim()).map((f) => f.q),
        contact: say(WEDDING.contact.email),
        note: 'Anything in `unanswered` has not been decided. Say so rather than guessing.',
      })

    case 'find_flights': {
      if (!WEDDING.travel.flyIn) return fail('Nobody is flying to this wedding — it is a drive.')

      const origin = String(args.origin_airport ?? '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
      if (origin.length !== 3) return fail('origin_airport must be a three-letter IATA code.')

      const stay = defaultStay()
      if (!stay) return fail('The wedding date is not fixed yet, so there are no dates to search.')

      const j = journeyFor(origin)
      return text({
        depart: stay.depart,
        return: stay.return,
        nights: stay.nights,
        why_these_dates: 'In the day before the first event, out the day after the last.',
        journey: j
          ? {
              from: `${j.origin.iata} — ${j.origin.name}, ${j.origin.city} (${j.origin.country})`,
              distance_km: j.main.km,
              nonstop: j.main.nonstop,
              stops: j.stops,
              airborne: hoursLabel(j.main.airborneHours + (j.hop?.airborneHours ?? 0)),
              door_to_door: hoursLabel(j.totalHours),
              summary: j.summary,
            }
          : null,
        routes: routeOptions(origin, stay.depart, stay.return),
      })
    }

    case 'arrivals_board': {
      const guests = await listGuests()
      const runs = groupTransfers(guests)
      return text({
        airport: say(WEDDING.travel.arrival.iata),
        rule: 'Anyone landing within two hours of each other shares a car.',
        cars: runs.map((run, i) => ({
          car: i + 1,
          leaves: venueTime(run.departsAt.toISOString()),
          seats: seats(run.riders),
          riders: run.riders.map((g) => ({
            name: g.name,
            flight: g.arrival_flight,
            lands: venueTime(g.arrival_at),
            party_size: headcount(g),
          })),
        })),
        no_flight_time_yet: guests
          .filter((g) => g.status !== 'no' && g.origin_airport && !g.arrival_at)
          .map((g) => g.name),
      })
    }

    case 'cost_estimate': {
      const a = {
        ...DEFAULTS,
        nights: Number(args.nights) || DEFAULTS.nights,
        sharing: Number(args.sharing) || DEFAULTS.sharing,
        roomRate: Number(args.room_rate) || DEFAULTS.roomRate,
        flight: Number(args.flight) || DEFAULTS.flight,
        gift: args.gift === undefined ? DEFAULTS.gift : Number(args.gift) || 0,
      }
      const { lines, total } = estimate(a)
      return text({
        currency: WEDDING.currency.code,
        assumptions: a,
        breakdown: lines.map((l) => ({ item: l.label, amount: money(l.amount), note: l.note })),
        total_per_person: money(total),
        caveat:
          'These are assumptions, not quotes. Say so — a guest deciding whether they can afford this deserves to know which numbers are guesses.',
      })
    }

    case 'rsvp': {
      if (!isDbReady()) return fail('No database configured, so replies cannot be saved yet.')
      const row = await saveGuest(args as Record<string, unknown>)
      const guest = await getByToken(row.edit_token)
      return text({
        saved: true,
        edit_token: row.edit_token,
        keep_this: 'Pass edit_token back on any later rsvp call to update this person rather than adding a second one.',
        edit_link: `/rsvp?token=${row.edit_token}`,
        guest: guest && {
          name: guest.name,
          status: guest.status,
          coming_to: guest.attending_events,
          party_size: headcount(guest),
        },
      })
    }

    default:
      return fail(`Unknown tool: ${name}`)
  }
}

// ------------------------------------------------------------------ transport

const rpcResult = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result })
const rpcError = (id: unknown, code: number, message: string) => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
})

async function handleMessage(message: Json) {
  const { method, id, params } = message as { method: string; id?: unknown; params?: Json }

  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion:
          typeof params?.protocolVersion === 'string' ? params.protocolVersion : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'wedding', version: '1.0.0' },
        instructions:
          'The wedding site for ' +
          (real(WEDDING.couple.joined) ?? 'this couple') +
          '. Call wedding_overview first — it says what has actually been decided. Anything it ' +
          'reports as not decided really is not decided: say so rather than inventing it. To ' +
          'reply to the invitation call rsvp and KEEP the edit_token it returns, passing it back ' +
          'on later calls so you update that guest instead of duplicating them. Times are local ' +
          'to the venue.',
      })

    case 'tools/list':
      return rpcResult(id, { tools: TOOLS })

    case 'tools/call': {
      const name = String(params?.name ?? '')
      const args = (params?.arguments ?? {}) as Json
      if (!TOOLS.some((t) => t.name === name)) {
        return rpcError(id, -32602, `Unknown tool: ${name}`)
      }
      try {
        return rpcResult(id, await callTool(name, args))
      } catch (e) {
        return rpcResult(id, fail(e instanceof Error ? e.message : 'Tool failed.'))
      }
    }

    case 'ping':
      return rpcResult(id, {})

    // Everything the spec lets a server answer empty rather than 501.
    case 'resources/list':
      return rpcResult(id, { resources: [] })
    case 'prompts/list':
      return rpcResult(id, { prompts: [] })

    default:
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Unauthorized. Pass the site passphrase as a Bearer token or ?key=',
        },
      },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json(rpcError(null, -32700, 'Parse error'), { status: 400 })
  }

  // A batch is a JSON array; a single call is an object. Notifications carry no
  // id and get no response body at all.
  const batch = Array.isArray(payload) ? payload : [payload]
  const responses = []
  for (const message of batch) {
    if (!message || typeof message !== 'object') {
      responses.push(rpcError(null, -32600, 'Invalid request'))
      continue
    }
    const m = message as Json
    if (m.id === undefined || m.id === null) continue // notification
    responses.push(await handleMessage(m))
  }

  if (responses.length === 0) return new Response(null, { status: 202 })
  return Response.json(Array.isArray(payload) ? responses : responses[0], {
    headers: { 'cache-control': 'no-store' },
  })
}

// No server-initiated streams, so there is nothing to open an SSE channel for.
export async function GET() {
  return new Response('This is an MCP endpoint. POST JSON-RPC to it.', {
    status: 405,
    headers: { allow: 'POST' },
  })
}
