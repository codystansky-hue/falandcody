import { AIRPORTS, FOIL_LEVELS, GEAR_ITEMS, TRIP } from '@/lib/config'
import { getByToken, groupShuttles, listAttendees, listVotes, passportRisk } from '@/lib/attendees'
import { saveAttendee, saveVotes } from '@/lib/saveAttendee'
import { compass, getForecast, metresToFeet } from '@/lib/swell'
import { CLIMATE_SOURCE, SEASON, WINDOW_BLOCKS, wetsuitFor } from '@/lib/season'
import { PROPOSED_WEEKS, tallyWeeks, VOTES, weekByKey } from '@/lib/weeks'
import { routeOptions } from '@/lib/flightSearch'
import { isDbReady } from '@/lib/db'
import { DEFAULTS, IGV_RATE, costFor, usd } from '@/lib/costs'
import { HOTEL } from '@/lib/hotel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A Model Context Protocol server over Streamable HTTP, so anyone on the trip
// can point their own Claude at this site and just talk to it:
//
//   "add me to the Chicama trip, I'm flying out of Denver, second week works"
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

// ---------------------------------------------------------------- tool schemas

const TOOLS = [
  {
    name: 'trip_overview',
    description:
      'The trip at a glance: where it is, the window under consideration, the venue and rooms, how you get there, and how many people are in so far. Start here.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'proposed_weeks',
    description:
      'The three candidate weeks with their historical conditions and the current vote tally. Use this before suggesting dates to anyone.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'swell_forecast',
    description:
      'Live seven-day swell, wind and conditions score for the point, from Open-Meteo. Real forecast data, refreshed hourly.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'season_outlook',
    description:
      'Month-by-month climatology for Chicama computed from five years of reanalysis: share of good and firing days, swell, water temperature, wetsuit advice. Use for questions about when to go or what to pack.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'crew_list',
    description:
      'Everyone who has signed up, with where they are flying from, their arrival time, foil level and gear. Personal contact details are not exposed here.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'find_flights',
    description:
      'Prefilled flight-search links from a home airport for one of the proposed weeks. Returns real URLs to Google Flights, Kayak and Skyscanner with dates already filled in — give them to the user to click.',
    inputSchema: {
      type: 'object',
      properties: {
        origin_airport: { type: 'string', description: 'Three-letter IATA code, e.g. DEN' },
        week_key: {
          type: 'string',
          enum: PROPOSED_WEEKS.map((w) => w.key),
          description: 'Which proposed week. Defaults to the one currently winning the vote.',
        },
      },
      required: ['origin_airport'],
    },
  },
  {
    name: 'arrivals_board',
    description:
      'Who lands when at Trujillo, and which shuttle run each person is grouped into. Anyone landing within two hours of each other shares a van.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'trip_budget',
    description:
      'What the trip costs per person and for the group, broken down by room, transfer, food, gear hire and flights. Assumptions can be overridden. Use for any "how much will this cost" question.',
    inputSchema: {
      type: 'object',
      properties: {
        occupancy: { type: 'number', description: 'People per room, 1-3. Default 2.' },
        nights: { type: 'number', description: 'Default 7.' },
        paying_igv: {
          type: 'boolean',
          description: 'Model the 18% Peruvian sales tax. Default false, because foreign tourists staying under 60 days are exempt.',
        },
      },
    },
  },
  {
    name: 'how_to_book_the_hotel',
    description:
      'How the group books Chicama Boutique Hotel, the contact channels, and the reservation terms. Read this before telling anyone to book a room — individual bookings are the wrong move for this trip.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'join_trip',
    description:
      'Add yourself to the trip, or update your details. Returns an edit_token — KEEP IT and pass it back on every later call, otherwise you will create a duplicate person. Only `name` is required; everything else can be filled in later.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        edit_token: {
          type: 'string',
          description: 'From a previous join_trip call. Pass it to update instead of duplicating.',
        },
        nickname: { type: 'string' },
        status: { type: 'string', enum: ['in', 'maybe', 'out'] },
        email: { type: 'string' },
        phone: { type: 'string' },
        origin_city: { type: 'string' },
        origin_airport: { type: 'string', description: 'Three-letter IATA code' },
        arrival_flight: { type: 'string' },
        arrival_at: {
          type: 'string',
          description: 'Landing time in Peru local time, "YYYY-MM-DDTHH:MM". Peru is UTC-5, no DST.',
        },
        departure_flight: { type: 'string' },
        departure_at: { type: 'string', description: 'Peru local time, same format' },
        needs_transfer: { type: 'boolean', description: 'Wants the hotel shuttle from Trujillo' },
        room_pref: { type: 'string', enum: ['any', 'garden', 'ocean', 'premium'] },
        roommate_pref: { type: 'string' },
        foil_level: { type: 'string', enum: FOIL_LEVELS.map((l) => l.key) },
        bringing_gear: {
          type: 'array',
          items: { type: 'string', enum: GEAR_ITEMS.map((g) => g.key) },
        },
        rental_needed: { type: 'string' },
        wetsuit_size: { type: 'string' },
        shirt_size: { type: 'string' },
        dietary: { type: 'string' },
        passport_expiry: {
          type: 'string',
          description: 'YYYY-MM-DD. Peru requires six months validity past entry.',
        },
        emergency_contact: { type: 'string' },
        flight_cost_usd: {
          type: 'number',
          description: 'What their flight actually cost, once booked. Feeds the budget.',
        },
        notes: { type: 'string' },
        week_votes: {
          type: 'object',
          description: 'Vote per week key, e.g. {"nov07":"yes","nov21":"maybe","nov28":"no"}',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'vote_weeks',
    description:
      'Vote yes, maybe or no on the proposed weeks for someone already on the trip. Needs their edit_token.',
    inputSchema: {
      type: 'object',
      properties: {
        edit_token: { type: 'string' },
        votes: {
          type: 'object',
          description: 'e.g. {"nov07":"yes","nov21":"yes","nov28":"no"}',
        },
      },
      required: ['edit_token', 'votes'],
    },
  },
]

// ------------------------------------------------------------------ tool calls

async function callTool(name: string, args: Json) {
  switch (name) {
    case 'trip_overview': {
      const crew = await listAttendees()
      return text({
        trip: TRIP.name,
        what: 'Bachelor party at the longest left-hand wave in the world.',
        window: TRIP.window,
        venue: { ...TRIP.venue },
        getting_there: {
          arrival_airport: `${AIRPORTS.arrival.iata} (${AIRPORTS.arrival.city})`,
          gateway: `${AIRPORTS.gateway.iata} (${AIRPORTS.gateway.city}) — nearly all international routes connect here`,
          transfer: `${TRIP.venue.transferKm} km, about ${TRIP.venue.transferHours} hours by road`,
        },
        crew: {
          total: crew.length,
          in: crew.filter((a) => a.status === 'in').length,
          maybe: crew.filter((a) => a.status === 'maybe').length,
        },
        note: 'Dates are not locked. Call proposed_weeks to see the options and the vote.',
      })
    }

    case 'proposed_weeks': {
      const votes = await listVotes()
      const ranked = tallyWeeks(votes)
      return text({
        how_it_works: 'Say yes to every week you could make. Most yeses wins; a maybe counts half.',
        weeks: ranked.map((w) => ({
          key: w.key,
          dates: w.label,
          start: w.start,
          end: w.end,
          pitch: w.pitch,
          historical: {
            good_days_pct: w.good,
            firing_days_pct: w.firing,
            mean_swell_ft: w.swellFt,
            mean_period_s: w.periodS,
          },
          votes: { yes: w.yes, maybe: w.maybe, no: w.no },
        })),
        leading: ranked[0]?.label ?? null,
        source: CLIMATE_SOURCE,
      })
    }

    case 'swell_forecast': {
      const days = await getForecast(7)
      return text({
        spot: 'Chicama, Puerto Malabrigo, Peru',
        note: 'Period matters more than size here — long-period SSW groundswell is what wraps the headland.',
        days: days.map((d) => ({
          date: d.day,
          swell_ft: metresToFeet(d.swellM)?.toFixed(1) ?? null,
          period_s: d.periodS,
          direction: `${compass(d.dirDeg)} ${d.dirDeg?.toFixed(0) ?? '?'}°`,
          wind: `${d.windKmh?.toFixed(0) ?? '?'} km/h from ${compass(d.windDirDeg)}`,
          score: d.score,
          verdict: d.verdict,
        })),
      })
    }

    case 'season_outlook':
      return text({
        source: CLIMATE_SOURCE,
        by_month: SEASON.map((m) => ({
          month: m.month,
          good_days_pct: m.good,
          firing_days_pct: m.firing,
          water_c: m.sst,
          wetsuit: wetsuitFor(m.sst),
          air_max_c: m.air[0],
          air_min_c: m.air[1],
          swell_ft: m.swellFt,
          rain_mm: m.rainMm,
          odds_of_3_good_days_in_a_week: m.weekOdds,
        })),
        ten_day_blocks_in_window: WINDOW_BLOCKS,
        headline:
          'October has the highest share of standout days of any month, and the coldest water of the year at 16.8 C. November is level on good days, driest and least crowded. After 10 December it is over.',
        packing_warning:
          'The Humboldt current keeps this water cold all year despite the latitude. A 4/3, or a 3/2 with boots. People pack for a desert and get in the water in boardshorts exactly once.',
      })

    case 'crew_list': {
      const crew = await listAttendees()
      return text(
        crew.map((a) => ({
          name: a.nickname || a.name,
          full_name: a.name,
          status: a.status,
          from: a.origin_city,
          home_airport: a.origin_airport,
          arrival_flight: a.arrival_flight,
          lands_peru_time: a.arrival_at
            ? new Date(a.arrival_at).toLocaleString('en-GB', { timeZone: 'America/Lima' })
            : null,
          needs_shuttle: a.needs_transfer,
          foil_level: a.foil_level,
          bringing: a.bringing_gear,
          renting: a.rental_needed,
          passport_ok: passportRisk(a.passport_expiry, TRIP.window.end),
        })),
      )
    }

    case 'find_flights': {
      const origin = String(args.origin_airport ?? '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
      if (origin.length !== 3) return fail('origin_airport must be a three-letter IATA code.')

      let week = args.week_key ? weekByKey(String(args.week_key)) : null
      if (!week) {
        const ranked = tallyWeeks(await listVotes())
        week = ranked[0] ?? PROPOSED_WEEKS[0]
      }
      const routes = routeOptions(origin, week.start, week.end)
      return text({
        week: week.label,
        depart: week.start,
        return: week.end,
        routes,
        advice:
          'The through-booking to TRU is simplest because the airline owns the connection. Splitting at Lima is often cheaper but the missed-connection risk becomes yours.',
      })
    }

    case 'arrivals_board': {
      const crew = await listAttendees()
      const runs = groupShuttles(crew)
      return text({
        airport: `${AIRPORTS.arrival.iata} / ${AIRPORTS.arrival.icao}, ${AIRPORTS.arrival.city}`,
        transfer: `${TRIP.venue.transferKm} km, about ${TRIP.venue.transferHours} hours`,
        shuttle_runs: runs.map((run, i) => ({
          van: i + 1,
          leaves_airport_peru_time: run.departsAt.toLocaleString('en-GB', {
            timeZone: 'America/Lima',
          }),
          riders: run.riders.map((r) => ({
            name: r.nickname || r.name,
            flight: r.arrival_flight,
            lands: r.arrival_at
              ? new Date(r.arrival_at).toLocaleString('en-GB', { timeZone: 'America/Lima' })
              : null,
          })),
        })),
        without_flights: crew
          .filter((a) => a.status !== 'out' && !a.arrival_at)
          .map((a) => a.nickname || a.name),
      })
    }

    case 'trip_budget': {
      const crew = (await listAttendees()).filter((a) => a.status !== 'out')
      const a = {
        ...DEFAULTS,
        occupancy: Math.min(3, Math.max(1, Number(args.occupancy) || DEFAULTS.occupancy)),
        nights: Math.min(30, Math.max(1, Number(args.nights) || DEFAULTS.nights)),
        payingIgv: args.paying_igv === true,
      }
      const costs = crew.map((p) =>
        costFor(
          {
            name: p.nickname || p.name,
            room_pref: p.room_pref,
            bringing_gear: p.bringing_gear,
            needs_transfer: p.needs_transfer,
            flight_cost_usd: p.flight_cost_usd,
            paid_status: p.paid_status,
          },
          a,
        ),
      )
      const ground = costs.reduce((sum, c) => sum + c.onTheGround, 0)
      return text({
        caveat:
          'These are assumptions, not quotes. The hotel prices by date and the published rates are "from" prices. Get a real group quote before anyone budgets seriously.',
        assumptions: {
          nights: a.nights,
          people_per_room: a.occupancy,
          room_rates_per_room_per_night: a.roomRates,
          transfer_round_trip: a.transferUsd,
          food_per_day: a.foodPerDayUsd,
          gear_hire_per_day: a.rentalPerDayUsd,
          extras: a.extrasUsd,
          paying_igv: a.payingIgv,
        },
        per_person_on_the_ground: crew.length ? usd(ground / crew.length) : usd(0),
        group_on_the_ground: usd(ground),
        flights_booked_so_far: usd(costs.reduce((s2, c) => s2 + (c.flight ?? 0), 0)),
        people: costs.map((c) => ({
          name: c.name,
          room: usd(c.room),
          transfer: usd(c.transfer),
          food: usd(c.food),
          gear_hire: c.rental ? usd(c.rental) : null,
          extras: usd(c.extras),
          on_the_ground: usd(c.onTheGround),
          flight: c.flight == null ? 'not booked' : usd(c.flight),
          total: c.total == null ? null : usd(c.total),
          paid: c.paid,
        })),
        biggest_lever:
          'Occupancy. Call this again with occupancy 3 to see what sharing saves — the hotel has triple rooms.',
        tax_note: `Peru zero-rates its ${Math.round(IGV_RATE * 100)}% IGV on lodging and food for non-resident foreigners staying under 60 days, but you need the passport entry stamp or the digital TAM record from the Migraciones portal. Worth 18% of the largest line here.`,
      })
    }

    case 'how_to_book_the_hotel': {
      const crew = (await listAttendees()).filter((a) => a.status !== 'out')
      return text({
        headline:
          'Do not book individually. The hotel handles groups through a separate reservations channel with its own payments schedule; twelve separate online bookings means no group rate, no guarantee the rooms are together, and a real risk the last few sell out.',
        how: `One person emails ${HOTEL.groupEmail}, gets a written quote and a payment schedule, and everyone settles with them. The site has a prefilled draft at /hotel.`,
        contacts: {
          group_reservations_email: HOTEL.groupEmail,
          whatsapp: HOTEL.whatsapp,
          phones: HOTEL.phones,
          online_engine: `${HOTEL.bookingEngine} (individuals only)`,
        },
        ask_for: [
          'A group rate and a held block of rooms',
          'Triple rooms — the biggest single lever on cost per head',
          'The IGV exemption applied to the quote',
          'The payment schedule and deposit deadline in writing',
          `Shared airport transfers from TRU for ${crew.filter((a) => a.needs_transfer).length || crew.length} people, grouped by arrival time`,
          'Hydrofoil hire and tow-back rates',
        ],
        terms: [
          'Group bookings get a payments schedule rather than a single charge',
          'One postponement allowed within the year the booking was made',
          'Refund fees around US$40 abroad / US$25 within Peru, deducted from prepayments',
          'Rates quoted in USD and may move with the exchange rate or season — get the quote dated',
        ],
        rooms_available: TRIP.venue.rooms,
      })
    }

    case 'join_trip': {
      if (!isDbReady()) return fail('The trip database is not configured yet.')
      try {
        const row = await saveAttendee(args)
        const votes = await listVotes()
        return text({
          ok: true,
          id: row.id,
          edit_token: row.edit_token,
          important:
            'Keep this edit_token. Pass it back on any future join_trip or vote_weeks call for this person, or you will create a duplicate.',
          edit_link: `/me?token=${row.edit_token}`,
          leading_week: tallyWeeks(votes)[0]?.label ?? null,
        })
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'Could not save.')
      }
    }

    case 'vote_weeks': {
      if (!isDbReady()) return fail('The trip database is not configured yet.')
      const token = String(args.edit_token ?? '')
      const person = token ? await getByToken(token) : null
      if (!person) return fail('No one matches that edit_token. Call join_trip first.')

      const raw = (args.votes ?? {}) as Json
      const bad = Object.entries(raw).filter(
        ([k, v]) => !weekByKey(k) || !VOTES.includes(v as never),
      )
      if (bad.length) {
        return fail(
          `Unusable votes: ${bad.map(([k, v]) => `${k}=${v}`).join(', ')}. ` +
            `Week keys are ${PROPOSED_WEEKS.map((w) => w.key).join(', ')} and votes are ${VOTES.join(', ')}.`,
        )
      }

      await saveVotes(person.id, raw)
      return text({
        ok: true,
        voted_as: person.nickname || person.name,
        tally: tallyWeeks(await listVotes()).map((w) => ({
          week: w.label,
          yes: w.yes,
          maybe: w.maybe,
          no: w.no,
        })),
      })
    }

    default:
      return fail(`Unknown tool: ${name}`)
  }
}

// -------------------------------------------------------------- JSON-RPC plumbing

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
        serverInfo: { name: 'chicama', version: '1.0.0' },
        instructions:
          'The trip site for a bachelor party at Chicama, Peru. Read with trip_overview and ' +
          'proposed_weeks first. To add someone, call join_trip and keep the edit_token it ' +
          'returns — pass it back on later calls so you update that person instead of ' +
          'duplicating them. All times are Peru local (UTC-5, no daylight saving).',
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
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized. Pass the trip passphrase as a Bearer token or ?key=' } },
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
