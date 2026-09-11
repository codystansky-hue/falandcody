-- Wedding site schema. Idempotent; safe to re-run with `npm run migrate`.
--
-- One table does almost all of the work. A guest row is a whole invitation:
-- the person, whoever they are bringing, how they are travelling, and where
-- they are sleeping. Splitting a plus-one into its own row would double every
-- lookup and give you two half-answers to chase instead of one.

create table if not exists guests (
  id                serial primary key,
  -- No accounts. This token is the guest's only credential: it lives in a
  -- cookie and can be shared as /rsvp?token=… so they can edit from any device.
  edit_token        text        not null unique,

  name              text        not null,
  email             text,
  phone             text,
  -- For invitations and thank-you cards. Free text on purpose — international
  -- addresses do not fit a fixed shape.
  postal_address    text,
  -- one | two | both. Which of you invited them; drives seating and filters.
  side              text        not null default 'both',

  -- yes | maybe | no | invited. invited is organiser-seeded, not yet a reply.
  status            text        not null default 'yes',
  -- Event keys from WEDDING.events in src/lib/config.ts, e.g. ["ceremony"].
  attending_events  jsonb       not null default '[]'::jsonb,

  plus_one          boolean     not null default false,
  plus_one_name     text,
  kids              integer     not null default 0,
  kids_names        text,

  dietary           text,
  song_request      text,
  -- Shown to other guests on /guests. The only field on this table that is
  -- public to the rest of the list, which is why it is separate from `notes`.
  message           text,

  origin_city       text,
  origin_airport    text,                       -- IATA, uppercased on write
  arrival_flight    text,
  arrival_at        timestamptz,
  departure_flight  text,
  departure_at      timestamptz,
  needs_transfer    boolean     not null default false,
  flight_cost       numeric,

  -- block | own | help | local | undecided
  stay_pref         text        not null default 'undecided',
  staying_with      text,

  passport_expiry   date,
  emergency_contact text,

  -- Organiser-only. n/a | unpaid | deposit | paid, for anything you collect.
  paid_status       text        not null default 'n/a',
  -- Organiser-only, never rendered to guests.
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists guests_status_idx on guests (status);
create index if not exists guests_arrival_idx on guests (arrival_at);

-- Cached cheapest fares per origin and date, so the travel page can show a
-- real number without a paid API and without re-asking on every page view.
create table if not exists fare_snapshots (
  id           serial primary key,
  origin       text        not null,
  dest         text        not null,
  depart_date  date,
  price_usd    numeric,
  airline      text,
  transfers    integer,
  fetched_at   timestamptz not null default now()
);

create index if not exists fare_snapshots_route_idx on fare_snapshots (origin, dest, fetched_at desc);
