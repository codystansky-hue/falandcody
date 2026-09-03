-- Chicama bachelor party — schema. Idempotent; safe to re-run.

create table if not exists attendees (
  id                serial primary key,
  edit_token        text        not null unique,
  name              text        not null,
  nickname          text,
  email             text,
  phone             text,
  origin_city       text,
  origin_airport    text,                       -- IATA, uppercased on write
  arrival_flight    text,
  arrival_at        timestamptz,
  departure_flight  text,
  departure_at      timestamptz,
  needs_transfer    boolean     not null default true,
  room_pref         text,                       -- garden | ocean | premium | any
  roommate_pref     text,
  foil_level        text,                       -- never | learning | intermediate | rips
  bringing_gear     jsonb       not null default '[]'::jsonb,
  rental_needed     text,
  wetsuit_size      text,
  shirt_size        text,
  dietary           text,
  passport_expiry   date,
  emergency_contact text,
  paid_status       text        not null default 'unpaid',  -- unpaid | deposit | paid
  status            text        not null default 'in',      -- in | maybe | out
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists availability (
  id           serial primary key,
  attendee_id  integer     not null references attendees(id) on delete cascade,
  window_start date        not null,
  window_end   date        not null,
  created_at   timestamptz not null default now()
);

create index if not exists availability_attendee_idx on availability (attendee_id);

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

create table if not exists swell_snapshots (
  day           date primary key,
  swell_m       numeric,
  period_s      numeric,
  dir_deg       numeric,
  wind_kmh      numeric,
  wind_dir_deg  numeric,
  score         numeric,
  fetched_at    timestamptz not null default now()
);

-- Votes on the proposed weeks in src/lib/weeks.ts. One row per person per week,
-- so a change of mind updates rather than stacks.
create table if not exists date_votes (
  id          serial primary key,
  attendee_id integer     not null references attendees(id) on delete cascade,
  week_key    text        not null,
  vote        text        not null,
  created_at  timestamptz not null default now(),
  unique (attendee_id, week_key)
);

create index if not exists date_votes_week_idx on date_votes (week_key);
