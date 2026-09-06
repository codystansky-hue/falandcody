# Our wedding

A wedding site that does the logistics as well as the invitation: RSVPs that
count heads per event, a guest list, room blocks, a flight search that already
knows the dates, an arrivals board that groups people into cars, and a CSV of
the whole thing when you need it in a spreadsheet.

Runs on Vercel Hobby and Neon Free. **Nothing here costs money.**

---

## Start here

Everything the two of us have to decide lives in one file:
**[`src/lib/config.ts`](src/lib/config.ts)**.

Anything still undecided is a string that starts with `TODO:`. The site shows an
honest *"not decided yet"* wherever one appears rather than inventing a venue,
and `/admin` lists every one that is left. Writing the site is: delete the
`TODO:` prefix, write the real value, save.

```bash
npm install
cp .env.example .env.local     # then fill it in — see Environment below
npm run migrate                # creates the tables
npm run dev                    # http://localhost:3000
```

`npx tsc --noEmit` is the type gate — `next build` alone tolerates errors that
`tsc` does not.

### What the config controls

| Setting | Effect |
|---|---|
| `date.confirmed` | `false` and the hero says the date is being settled instead of counting down to one that might move |
| `events[]` | The whole weekend. Add a Sunday hike and it appears on the home page, the schedule, the RSVP form, the head counts and the CSV — nothing else to edit |
| `travel.flyIn` | `false` and `/travel` and `/arrivals` disappear from the nav and 404 |
| `travel.gateway` | Set it and the journey model routes through a hub and offers the split-it-yourself booking; leave it `null` for anywhere with direct service |
| `travel.passportMonthsRequired` | `0` and every passport question leaves the form |
| `registry.links` / `story.paragraphs` | Left as `TODO:` and those pages stay out of the nav entirely |
| `MAX_PLUS_ONES` | `0` and the plus-one question disappears |

The colours are nine CSS variables at the top of
[`src/app/globals.css`](src/app/globals.css). Change them and the whole site
follows — no component hard-codes a colour.

---

## Where it came from

Forked from [`chicama`](https://github.com/codystansky-hue/chicama), a trip site
for a bachelor party in Peru, which was itself ported from
[`aaronparton2-sketch/swell-event`](https://github.com/aaronparton2-sketch/swell-event)
(MIT).

What survived the fork is the machinery that turns out to be the same problem:
getting a dozen-plus people to one place on one date, and knowing where they all
are. The surf forecasting, the swell scoring, the tow-in boat and the pixel husky
did not.

| Chicama | Here |
|---|---|
| Attendees with foil levels and gear | Guests with events, plus-ones, children and dietary needs |
| Three candidate weeks with a vote | One fixed date; the travel window derives from the events |
| Swell forecast, season climatology | Gone |
| Hotel room types | Room blocks with rates, codes and a release date |
| Shuttle grouping from Trujillo | Car grouping from whatever airport, counting plus-ones as seats |
| Trip budget split across the group | What coming costs one guest |
| Nine MCP tools | Nine different MCP tools |

---

## The parts

**RSVP is per event, not per wedding.** Somebody who is coming to the ceremony
but not the brunch is the common case, and the caterer needs that number, so the
form asks per event and every count on the site is a head count — plus-ones and
children included — rather than a count of replies.

**No accounts.** Each guest gets an `edit_token`, kept in a cookie and shareable
as `/rsvp?token=…` so they can edit from another device. Replying a second time
updates their row instead of adding a duplicate. On a shared laptop, *Start a
fresh reply* deliberately does not fall back to the cookie.

**Two gates.** One passphrase for guests, a different one for `/admin`. The guest
list page shows names, party size and the note somebody wrote you; emails, phone
numbers, postal addresses, flight times and emergency contacts are behind the
admin gate only. `src/middleware.ts` enforces both.

**Flights need one input — three letters.** From a home airport you get:

1. **The journey**, computed from the vendored OurAirports table
   (`src/lib/journey.ts`) — distance, whether it is nonstop, airborne time, and
   door-to-door including any hub connection and the drive from the airport.
2. **A live price** for the dates that actually matter
   (`src/lib/googleFlights.ts`). Google Flights encodes a search into the `?tfs=`
   parameter as a base64url Protobuf; build that and the ordinary page returns
   real fares. Hand-encoded, so no protobuf dependency. Field numbers from
   [AWeirdDev/flights](https://github.com/AWeirdDev/flights) (MIT).
3. **Prefilled searches** — Google Flights, Kayak, Skyscanner, plus the split
   booking when the venue sits behind a hub.

The dates come from the events: in the day before the first, out the day after
the last. Nobody has to work that out from a calendar.

Google's page is intermittent — a usable response roughly two times in three,
throttling rather than failure. So `src/lib/fares-cache.ts` retries once, writes
every success to `fare_snapshots`, and falls back to the last stored price
(labelled stale past six hours). None of it is a supported API and it can break
without warning; the site degrades correctly, because the journey model, the
search buttons and the cost estimate need none of it.

**No cron.** Vercel Hobby caps cron at once per day. Nothing here needs to happen
while nobody is looking, so every external feed is read in a server component
behind `fetch(..., { next: { revalidate } })` instead.

---

## Point an agent at it

`/api/mcp` is a Model Context Protocol server over Streamable HTTP — nine tools,
so a guest can talk to the site instead of filling in a form:

```bash
claude mcp add --transport http wedding "https://<your-site>/api/mcp" \
  --header "Authorization: Bearer <passphrase>"
```

`?key=<passphrase>` works too, for clients where a header is awkward. Same shared
passphrase as the site; `src/middleware.ts` exempts the path from the cookie gate
because MCP clients cannot do the browser cookie dance. `/connect` is the page
that explains this to guests.

Read tools: `wedding_overview`, `schedule`, `guest_list`, `where_to_stay`, `faq`,
`find_flights`, `arrivals_board`, `cost_estimate`. Write tool: `rsvp`.

`wedding_overview` reports everything still undecided by name, so a model says
"they have not picked a venue yet" instead of confidently inventing one. `rsvp`
returns an `edit_token` and says loudly enough that models actually pass it back.

Hand-rolled JSON-RPC rather than the SDK — no sessions, no streaming, no
server-initiated messages, so it is about 100 lines of dispatch and survives cold
starts with no session store.

---

## Environment

| Variable | Needed for | Without it |
|---|---|---|
| `DATABASE_URL` | everything that persists | `/rsvp` says there is no database; the rest still renders |
| `GATE_SECRET` | signing the gate cookie | nobody can get past `/gate` |
| `GATE_PASSPHRASE` | the shared passphrase | `/api/gate` returns 503 with the reason |
| `ADMIN_PASSPHRASE` | `/admin` | organiser view stays locked |
| `TRAVELPAYOUTS_TOKEN` | a second fare source | the keyless one still works |
| `OPENSKY_CLIENT_ID` / `_SECRET` | live tracking on `/arrivals` | board still works off typed-in times |

Both optional integrations render an explicit unconfigured state. The site is
fully usable before either account exists.

---

## Layout

```
src/lib/config.ts    ← the only file you have to edit
src/lib/            guests · saveGuest · journey · flightSearch · fares
                    costs · nav · opensky · auth · db
src/app/            gate · rsvp · guests · schedule · stay · travel
                    arrivals · registry · faq · story · connect · admin
src/app/api/mcp     the MCP server
src/middleware.ts   passphrase gate, plus a second one on /admin
db/schema.sql       guests · fare_snapshots
```

`saveGuest.ts` is the single upsert behind both the form route and the MCP `rsvp`
tool, so validation and timezone handling cannot drift between the two doors onto
the same table.

## Notes

- **Times are venue time.** Set `date.tz` and `date.utcOffsetHours` in the config
  and every arrival time is pinned to it, so car grouping does not drift by
  whichever timezone a guest happened to type from.
- **A `no` clears itself.** Changing a yes to a no drops that guest's events,
  plus-one, children and car request server-side rather than trusting the
  browser, so the head count stays honest.
- **`robots: noindex`.** A guest list is not for search engines. The passphrase
  is the real control; this stops a leaked link ending up in results.

## Working on this together

See [CONTRIBUTING.md](CONTRIBUTING.md) — the two-person workflow, and what is
safe to change without asking.
