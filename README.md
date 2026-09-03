# Chicama 🌊

Trip site for the Chicama bachelor party — [Chicama Boutique Hotel](https://www.chicamaboutiquehotel.com/),
Puerto Malabrigo, Peru. The crew fills in their own details; the flights, transfers, rooming and
swell assemble themselves around that.

Runs on Vercel Hobby and Neon Free. **Nothing here costs money.**

---

## Where it came from

Ported by hand from [`aaronparton2-sketch/swell-event`](https://github.com/aaronparton2-sketch/swell-event)
(MIT) — an n8n workflow that watches a Surfline forecast and, when the swell fires, scrapes flights
and a villa, polls a Telegram group, and makes AI voice calls to book a taxi and a beer run.

Its trigger premise does not apply to a trip with a booked venue and a chosen week. The
*information* it assembles does. Every paid dependency was replaced with a free one:

| swell-event node | Here | Cost | Key |
|---|---|---|---|
| Surfline wave + wind (via r.jina.ai) | Open-Meteo Marine + Forecast — `src/lib/swell.ts` | free | none |
| Evaluate swell / Swell ON? | `scoreSwell()` — period-weighted, SSW 190–235°, offshore ≈150° | free | none |
| Apify flight scraper | Travelpayouts Aviasales Data API — `src/lib/fares.ts` | free | free token |
| Apify villa scraper | dropped — the venue is chosen | — | — |
| Telegram message + poll | the site itself | free | none |
| Gmail check + send | dropped | — | — |
| AeroDataBox flight tracking | OpenSky arrivals at `SPRU` — `src/lib/opensky.ts` | free | free OAuth2 client |
| Bland AI taxi call | shuttle grouping + pickup manifest — `groupShuttles()` | free | — |
| Bland AI beer run | dropped — the hotel has a bar | — | — |
| `every 6h` schedule | Next.js fetch revalidation | free | — |

**The one thing that could not be made free:** outbound voice calls to Peru cost money from any
provider. `/arrivals` tracks who is on the ground and groups the vans, but nobody gets phoned.

**No cron.** Vercel Hobby caps cron at once per day, which would have forced a GitHub Actions
scheduler. Because nothing needs to happen while nobody is looking, every external feed is read in
a server component behind `fetch(..., { next: { revalidate } })` instead — swell 1 h, fares 24 h,
OpenSky 5 min.

---

## Running it

```bash
npm install
vercel env pull .env.local      # or copy .env.example and fill it in
npm run migrate                 # applies db/schema.sql
npm run dev
```

`npx tsc --noEmit` is the type gate — `next build` alone tolerates errors that `tsc` does not.

## Environment

| Variable | Needed for | Without it |
|---|---|---|
| `DATABASE_URL` | everything that persists | `/me` says there is no database; the rest still renders |
| `GATE_SECRET` | signing the gate cookie | nobody can get past `/gate` |
| `GATE_PASSPHRASE` | the shared passphrase | `/api/gate` returns 503 with the reason |
| `ADMIN_PASSPHRASE` | `/admin` | organiser view stays locked |
| `TRAVELPAYOUTS_TOKEN` | `/flights` | page explains how to switch it on |
| `OPENSKY_CLIENT_ID` / `_SECRET` | live tracking on `/arrivals` | board still works off typed-in times |

Both optional integrations render an explicit unconfigured state. The site is fully usable before
either account exists.

## Point an agent at it

`/api/mcp` is a Model Context Protocol server over Streamable HTTP — nine tools, so anyone on the
trip can talk to the site instead of filling forms:

```bash
claude mcp add --transport http chicama "https://chicama-hombres.vercel.app/api/mcp" --header "Authorization: Bearer <passphrase>"
```

`?key=<passphrase>` works too, for clients where a header is awkward. Same shared passphrase as the
site; `src/middleware.ts` exempts the path from the cookie gate because MCP clients cannot do the
browser cookie dance. `/connect` is the page that explains all this to the crew.

Read tools: `trip_overview`, `proposed_weeks`, `swell_forecast`, `season_outlook`, `crew_list`,
`find_flights`, `arrivals_board`. Write tools: `join_trip`, `vote_weeks`.

`join_trip` returns an `edit_token`; passing it back updates that person instead of duplicating
them, and the tool description says so loudly enough that models actually do it.

Hand-rolled JSON-RPC rather than the SDK — no sessions, no streaming, no server-initiated
messages, so it is about 100 lines of dispatch and survives cold starts with no session store.

## Dates and flights, with the friction taken out

**Dates** are three proposed Saturday-to-Saturday weeks (`src/lib/weeks.ts`) with a yes/maybe/no
vote, not a blank calendar. Every candidate Saturday was scored against the same calendar days
across 2021–2025. Free-form ranges survive behind a disclosure.

**Flights** need one input — three letters. You get three things from it, none of which need a key:

1. **The journey**, computed from the vendored OurAirports table (`src/lib/journey.ts`) — distance
   to Lima, whether it is nonstop, airborne time, and door-to-door including the Lima connection,
   the Trujillo hop and the drive up the coast.
2. **Live prices per week** (`src/lib/googleFlights.ts`). Google Flights encodes a search into the
   `?tfs=` parameter as a base64url Protobuf; build that and the ordinary page returns real fares.
   Hand-encoded, so no protobuf dependency. Field numbers from
   [AWeirdDev/flights](https://github.com/AWeirdDev/flights) (MIT).
3. **Prefilled searches** (`src/lib/flightSearch.ts`) — Google Flights, Kayak, Skyscanner, plus the
   Lima split that people who have not been to Peru do not know exists.

Google's page is intermittent — a usable response roughly two times in three, throttling rather
than failure. So `src/lib/fares-cache.ts` retries once, writes every success to `fare_snapshots`,
and falls back to the last stored price (labelled stale past six hours). The week-comparison table
reads **cache only**, because origins × weeks would otherwise be two dozen outbound requests per
page view; the cache is warmed organically when someone looks up their own route.

None of it is a supported API and it can break without warning. The site degrades correctly — the
journey model, the search buttons and the comparison table minus its price columns need none of it.
Travelpayouts survives as an optional second source when `TRAVELPAYOUTS_TOKEN` is set.

## Layout

```
src/lib/          swell · season · weeks · fares · flightSearch · opensky
                  attendees · saveAttendee · auth · db · config
src/app/          gate · me · roster · dates · swell · flights · arrivals
                  connect · admin
src/app/api/mcp   the MCP server
src/middleware.ts passphrase gate, plus a second one on /admin
db/schema.sql     attendees · availability · date_votes · fare_snapshots
                  swell_snapshots
scripts/season.py regenerates src/lib/season.ts from ERA5
```

`saveAttendee.ts` is the single upsert behind both the form route and the MCP `join_trip` tool, so
validation and Peru-time handling cannot drift between the two doors onto the same table.

Captain — the pixel husky on the hero — is ported from the portfolio site: sprite, the pure
behaviour module, and its test (`node scripts/test-captain-brain.mjs`).

Everything Cody still has to decide — the window, the groom, the venue facts — lives in
`src/lib/config.ts`.

## Notes

- **Times are Peru time.** Peru is UTC−5 year round with no DST; arrival and departure inputs are
  pinned to it so shuttle grouping does not drift by the organiser's own offset.
- **Passports.** Peru wants six months of validity past entry. The form checks against the end of
  the window, not today, and `/admin` lists anyone short.
- **No accounts.** Each person gets an `edit_token`, kept in a cookie and shareable as
  `/me?token=…` so they can edit from another device.
