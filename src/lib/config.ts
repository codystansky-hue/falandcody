// ─────────────────────────────────────────────────────────────────────────────
//  THE ONLY FILE YOU HAVE TO EDIT
//
//  Everything the two of you still have to decide lives here, so it can change
//  in one place without touching a component. Anything still unwritten is a
//  string starting with `TODO:` — the site renders an honest "not decided yet"
//  state for those instead of a lie, and /admin lists every one that is left.
//
//  Delete the TODO prefix when you write the real value. That is the whole
//  workflow.
// ─────────────────────────────────────────────────────────────────────────────

// Deliberately NOT a `v is string` type guard. The config is `as const`, so
// its values have literal types; a guard would narrow the false branch to
// `never` and make every ordinary string operation downstream a type error.
/** A value nobody has filled in yet. */
export const isTodo = (v: unknown): boolean =>
  typeof v === 'string' && v.trimStart().startsWith('TODO:')

/** The value, or null when it is still a placeholder. Use this in components. */
export const real = <T>(v: T): T | null => (isTodo(v) ? null : v)

export const WEDDING = {
  couple: {
    one: { name: 'Cody', full: 'TODO: Cody’s full name as it should read on the site' },
    // Surname taken from the GitHub handle Falynberkowitz-boop — CHECK THE
    // SPELLING before this goes anywhere near an invitation.
    two: { name: 'Falyn', full: 'TODO: Falyn Berkowitz — confirm spelling' },
    /** Shown in the browser tab and on the hero. */
    joined: 'Cody & Falyn',
    hashtag: 'TODO: #something',
  },

  date: {
    /**
     * The wedding day, YYYY-MM-DD. Drives the countdown and every date default.
     *
     * PROVISIONAL. February or March 2027 is the window; this is a working
     * Saturday inside it so the flight search has something to search. While
     * `confirmed` is false the site labels it provisional everywhere it shows,
     * and tells guests not to book anything non-refundable.
     *
     * Saturdays in the window, for when you pick:
     *   Feb 2027 — 6th, 13th, 20th, 27th
     *   Mar 2027 — 6th, 13th, 20th, 27th
     */
    iso: '2027-03-06',
    /** How it reads in prose. */
    label: 'Saturday 6 March 2027',
    /**
     * What to say while `confirmed` is false — the honest version of the date.
     * The hero and the FAQ use this instead of the provisional day, so nobody
     * reads a working Saturday as a decision.
     */
    windowLabel: 'February or March 2027',
    /**
     * Flip to true once the date is booked. Until then the hero says the date
     * is being settled instead of counting down to a date that might move.
     */
    confirmed: false,
    /** Last day to RSVP, YYYY-MM-DD. Guests see this everywhere. */
    rsvpBy: 'TODO: pick one once the date is fixed — six to eight weeks before',
    /** IANA zone of the venue. Every arrival time on the site is pinned to it. */
    tz: 'America/Mazatlan',
    /**
     * The venue's fixed UTC offset in hours, used to pin arrival times typed
     * into the form. Pick the offset in force ON THE WEDDING DATE — if the
     * venue observes DST, that is the summer offset.
     *
     * Baja California Sur runs on Mexican Pacific time, UTC−7. Mexico dropped
     * nationwide daylight saving in 2022 and BCS is not one of the border
     * municipalities that kept it, so this is −7 in February and March alike.
     */
    utcOffsetHours: -7,
  },

  venue: {
    // Not booked. Hotel Todo Bien is the one we are looking at; until it is
    // signed, `name` staying here means the site will happily tell guests it
    // is the venue — change it the moment that stops being true.
    name: 'Hotel Todo Bien',
    town: 'La Ventana, Baja California Sur, Mexico',
    url: 'TODO: https://… (the hotel’s own booking page)',
    address: 'TODO: the address you would put into a maps app',
    /** For the map link and nothing else. Leave null and the map link hides. */
    coords: null as { lat: number; lon: number } | null,
    note: 'A small hotel on the Sea of Cortez, in the wind-and-water town an hour south of La Paz.',
    /**
     * False until it is actually booked. The site says "where we are looking"
     * rather than "where it is" while this is false.
     */
    confirmed: false,
  },

  /**
   * The weekend, in order. Guests RSVP per event, so add or remove rows freely
   * — the form, the schedule page and the admin export all read this list.
   *
   * `key` goes into the database, so once guests have replied, do not rename
   * an existing key. Adding new ones is always safe.
   */
  events: [
    {
      key: 'welcome',
      name: 'Welcome drinks',
      /** Offset in days from the wedding day. -1 is the night before. */
      dayOffset: -1,
      time: 'TODO: 18:00 – late',
      where: 'TODO: where',
      dressCode: 'TODO: e.g. relaxed',
      note: 'TODO: one line — who it is for, whether anyone should eat first',
      /** False for things everyone is expected at, like the ceremony. */
      optional: true,
    },
    {
      key: 'ceremony',
      name: 'Ceremony',
      dayOffset: 0,
      time: 'TODO: 16:00',
      where: 'TODO: where',
      dressCode: 'TODO: e.g. garden formal',
      note: 'TODO: e.g. arrive 30 minutes early; the lawn eats heels',
      optional: false,
    },
    {
      key: 'reception',
      name: 'Dinner and dancing',
      dayOffset: 0,
      time: 'TODO: 18:00 – 01:00',
      where: 'TODO: where',
      dressCode: '',
      note: 'TODO: anything about food, speeches, the last bus home',
      optional: false,
    },
    {
      key: 'brunch',
      name: 'Farewell brunch',
      dayOffset: 1,
      time: 'TODO: 10:00 – 13:00',
      where: 'TODO: where',
      dressCode: '',
      note: 'TODO: drop-in, no need to reply precisely',
      optional: true,
    },
  ],

  /** Where guests sleep. Add as many as you have negotiated. */
  stay: {
    /** Groups are usually booked by email rather than through a booking engine. */
    groupEmail: 'TODO: reservations@…',
    /** Last day the block is held. Guests see it as a deadline. */
    blockReleaseDate: 'TODO: 2027-03-15',
    blocks: [
      {
        key: 'main',
        name: 'Hotel Todo Bien',
        url: 'TODO: https://…',
        /** Nightly rate you negotiated, in the currency below. */
        fromRate: 0,
        rooms: 0,
        walkMinutes: 0,
        driveMinutes: null as number | null,
        note: 'TODO: rate, how many rooms, and what to say when booking. Nothing is agreed yet.',
        /** Booking code the hotel gave you, if any. */
        code: '',
      },
    ],
    /** For guests who would rather not be in the block. */
    alternativesNote:
      'La Ventana and neighbouring El Sargento are mostly casitas and short-term rentals rather than hotels, and February and March are the busiest months of the year there — the wind season is why anyone comes. Whatever you book, book it early.',
  },

  /**
   * Travel. Set `flyIn: false` for a wedding everyone drives to — the flights,
   * journey and arrivals pages then disappear from the navigation.
   */
  travel: {
    flyIn: true,
    /** Where guests actually land. La Paz is the near one. */
    arrival: { iata: 'LAP', icao: 'MMLP', city: 'La Paz' },
    /**
     * Set only when most guests must connect through a hub to reach the
     * arrival airport — a long-haul destination wedding. Null for anywhere
     * with direct service.
     */
    gateway: null as { iata: string; icao: string; city: string } | null,
    /**
     * Airports you KNOW hold a nonstop to the arrival airport. When this list
     * is non-empty it is treated as the whole truth, so anything missing from
     * it is described as connecting — the safe way to be wrong, because
     * telling somebody a direct flight exists when it does not sends them
     * hunting for a ghost.
     *
     * UNVERIFIED for February/March 2027. These are routes La Paz has held
     * recently; schedules move and some are seasonal. Check them against the
     * airlines before the invitations go out, and cut anything you cannot
     * confirm — an over-long estimate annoys nobody.
     */
    nonstopFrom: ['LAX', 'PHX', 'TIJ', 'MEX', 'GDL', 'CUL', 'MTY'] as string[],
    /**
     * Other airports worth a guest's while, shown as a note on /travel. La Paz
     * is much the closest, but Los Cabos carries far more US nonstops and can
     * be cheaper by more than the extra driving costs.
     */
    alsoConsider: [
      {
        iata: 'SJD',
        city: 'San José del Cabo (Los Cabos)',
        note: 'Roughly two to two and a half hours away by road, but many more nonstops from the US and often cheaper. Worth pricing both.',
      },
    ] as { iata: string; city: string; note: string }[],
    /** From the arrival airport to the venue. */
    transferKm: 60,
    transferHours: 1,
    transferNote:
      'La Ventana is about an hour south-east of La Paz airport on paved road. Taxis and pre-booked shuttles both exist; a hire car is worth it if you want to move around the East Cape at all, because the town itself has very little in the way of taxis.',
    /** True if you are running a shuttle and want the arrivals board to group it. */
    runningShuttle: true,
    /**
     * Only for a wedding guests cross a border for. Set to 0 to drop every
     * passport question from the form.
     *
     * Mexico asks that a passport be valid for the length of the stay rather
     * than for six months beyond it, so there is no months-of-validity rule to
     * enforce — but everyone flying in still needs the passport itself, which
     * is what the note below is for.
     */
    passportMonthsRequired: 0,
    visaNote:
      'Everyone flying into Mexico needs a valid passport, and most visitors are issued a tourist permit on arrival. Rules change — check the current requirements for your own nationality well before you book, not the week before you fly.',
  },

  registry: {
    note: 'TODO: the sentence you actually want to say about gifts',
    links: [
      { name: 'TODO: registry name', url: 'TODO: https://…', note: '' },
    ],
  },

  /**
   * Answers to what people will email you about anyway. A question whose
   * answer is still TODO is hidden rather than shown empty, so there is no
   * harm in leaving one here until you have decided.
   */
  faq: [
    {
      q: 'Is the date actually settled?',
      a: 'Not yet. It is February or March 2027, in La Ventana. The date shown on this site is a working Saturday so that flight searches have something to search — please do not book anything non-refundable against it. We will write to everyone the moment it is fixed.',
    },
    {
      q: 'Where is La Ventana?',
      a: 'On the Sea of Cortez in Baja California Sur, Mexico, about an hour south-east of La Paz. It is a small wind-and-water town rather than a resort strip — that is rather the point.',
    },
    {
      q: 'Which airport should I fly into?',
      a: 'La Paz (LAP) is much the closest, about an hour away. Los Cabos (SJD) is two to two and a half hours by road but has far more nonstops from the US and is often cheaper, sometimes by more than the extra drive costs. Price both — the travel page will do the sums for your own airport.',
    },
    {
      q: 'Why February or March?',
      a: 'It is the tail of the windy season on that coast, which is the reason any of us know the place. Warm, dry, and the water is worth getting into.',
    },
    {
      q: 'Do I need a car?',
      a: 'Not to get to the wedding, but La Ventana has very little in the way of taxis, so a hire car makes the rest of the trip much easier. If you would rather not, say so on your RSVP and we will group you with whoever lands near you.',
    },
    { q: 'What should I wear?', a: 'TODO: it is a beach town in March — say what that means for shoes' },
    { q: 'Can I bring someone?', a: 'TODO: say it plainly here and the form will match' },
    { q: 'Are children invited?', a: 'TODO:' },
    { q: 'When should I arrive and leave?', a: 'TODO:' },
    { q: 'Is anything being brought down by road?', a: 'TODO: Cody is driving the van down — say what that means for anyone who wants gear or bulky things carried, and by when you would need it.' },
  ],

  /** Optional. Leave the paragraphs as TODO and /story stays out of the nav. */
  story: {
    headline: 'TODO: how we got here',
    paragraphs: ['TODO: as long or as short as you like'],
  },

  /** Who a guest emails when the site does not answer their question. */
  contact: { name: 'TODO: whoever is fielding questions', email: 'TODO: you@example.com' },

  /**
   * Money on the site — accommodation rates, the guest cost estimate. USD
   * rather than pesos because rentals and hotels in La Ventana routinely quote
   * in dollars and every guest will be thinking in them.
   */
  currency: { code: 'USD', locale: 'en-US' },
} as const

/** Everything still unwritten, for the checklist on /admin. */
export function outstanding(): string[] {
  const found: string[] = []
  const walk = (node: unknown, path: string) => {
    if (isTodo(node)) {
      found.push(path)
    } else if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`))
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k)
    }
  }
  walk(WEDDING, '')
  return found
}

export type WeddingEvent = (typeof WEDDING.events)[number]
export const EVENT_KEYS: string[] = WEDDING.events.map((e) => e.key)

/** The wedding day as a Date, or null while the date is still a placeholder. */
export function weddingDate(): Date | null {
  const iso = real(WEDDING.date.iso)
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** The calendar date of one event, derived from the wedding day plus its offset. */
export function eventDate(event: { dayOffset: number }): Date | null {
  const base = weddingDate()
  if (!base) return null
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + event.dayOffset)
  return d
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

/**
 * The trip a guest is actually booking: in the day before the first event, out
 * the day after the last. Every flight search on the site is prefilled with
 * this rather than with a blank calendar, which is the whole reason people put
 * off booking.
 *
 * Null while the wedding date is still a placeholder.
 */
export function defaultStay(): { depart: string; return: string; nights: number } | null {
  const base = weddingDate()
  if (!base) return null
  const offsets = WEDDING.events.map((e) => e.dayOffset)
  const first = Math.min(0, ...offsets)
  const last = Math.max(0, ...offsets)

  const depart = new Date(base)
  depart.setUTCDate(depart.getUTCDate() + first - 1)
  const back = new Date(base)
  back.setUTCDate(back.getUTCDate() + last + 1)

  return { depart: iso(depart), return: iso(back), nights: last - first + 2 }
}

export const formatDate = (d: Date, opts: Intl.DateTimeFormatOptions = {}) =>
  d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    ...opts,
  })

// Airports, in the shape the journey model and flight search want. Derived from
// WEDDING.travel so there is still only one place to edit.
export const AIRPORTS = {
  arrival: WEDDING.travel.arrival,
  gateway: WEDDING.travel.gateway,
} as const

/** How a guest is replying. Organiser-seeded rows use `invited` until they do. */
export const RSVP_STATUS = ['yes', 'maybe', 'no'] as const
export type RsvpStatus = (typeof RSVP_STATUS)[number]

export const GUEST_STATUS = ['yes', 'maybe', 'no', 'invited'] as const
export type GuestStatus = (typeof GUEST_STATUS)[number]

/** Which side of the room, for seating and for the guest-list filter. */
export const SIDES = [
  { key: 'one', label: `${WEDDING.couple.one.name}’s side` },
  { key: 'two', label: `${real(WEDDING.couple.two.name) ?? 'Her'} side` },
  { key: 'both', label: 'Both of us' },
] as const
export const SIDE_KEYS: string[] = SIDES.map((s) => s.key)

/** How a guest is sleeping. Drives the accommodation counts on /admin. */
export const STAY_KEYS = ['block', 'own', 'help', 'local', 'undecided'] as const
export const STAY_OPTIONS = [
  { key: 'block', label: 'Book me into the room block' },
  { key: 'own', label: 'I will sort my own' },
  { key: 'help', label: 'I need a hand working it out' },
  { key: 'local', label: 'I live near enough to go home' },
  { key: 'undecided', label: 'Not decided yet' },
] as const

/** Who has paid, if you are collecting anything (a group villa, say). */
export const PAID_KEYS = ['n/a', 'unpaid', 'deposit', 'paid'] as const

/** How many extra people one invitation may bring. 0 turns plus-ones off. */
export const MAX_PLUS_ONES = 1

/**
 * Where fares are priced to. Guests shopping for a long-haul ticket compare
 * the gateway, not the little airport beyond it — the last hop is bought
 * separately or thrown in. Falls back to the arrival airport when there is no
 * gateway.
 */
export const FARE_DEST = AIRPORTS.gateway?.iata ?? AIRPORTS.arrival.iata
