// Trip constants. Everything Cody still has to decide lives here so it can be
// changed in one place without touching a component.

export const TRIP = {
  name: 'Chicama',
  subtitle: 'the longest left on earth',
  // Set 2026-09-03. See src/lib/season.ts for the reanalysis behind the bounds.
  //
  // October scores best in the record, but October 2026 is four weeks out and
  // that is not enough runway to get a dozen people to Peru — so the window
  // opens 1 November instead. That still captures Nov 1–10, the strongest block
  // for good days in the whole window (84%), about eight weeks out.
  //
  // It closes 10 December because the record says it is over after that: swell
  // under 4 ft and standout days down to 8%.
  window: {
    label: '1 November – 10 December 2026',
    start: '2026-11-01',
    end: '2026-12-10',
    locked: false,
  },
  groom: 'Cody' as string | null,
  venue: {
    name: 'Chicama Boutique Hotel',
    town: 'Puerto Malabrigo, La Libertad, Peru',
    url: 'https://www.chicamaboutiquehotel.com/',
    rooms: [
      { key: 'garden', label: 'Standard Garden View', count: 10, fromUsd: 150 },
      { key: 'ocean', label: 'Standard Ocean View', count: 10, fromUsd: 160 },
      { key: 'premium', label: 'Premium (A/C, bay view)', count: 3, fromUsd: 180 },
    ],
    // Tow-back, from the hotel's own service page. The important line for a
    // foiling trip: the cheap shared boat explicitly excludes foilers — "for
    // safety reasons we will not offer this service for Foilers, this service
    // will only be for surfers". Foilers are on the private boat only, two at
    // a time. November and December are its low season, which is the window.
    towBack: {
      includedInRoomRate: false,
      shared: { lowUsd: 30, highUsd: 35, maxSurfers: 8, foilersAllowed: false },
      private: {
        lowUsd: 200,
        highUsd: 250,
        maxSurfers: 5,
        maxFoilers: 2,
        foilersAllowed: true,
        maxHours: 3,
        noticeHours: 24,
      },
      // Low season for the boat is Jan, Feb, Aug, Nov, Dec.
      lowSeasonMonths: [1, 2, 8, 11, 12],
      hours: 'Shared 8:30–11:30 and 15:30–17:45 · Private 07:00–17:30',
    },
    transferFrom: 'TRU',
    transferKm: 85,
    transferHours: 1.5,
  },
} as const

// Chicama, off Puerto Malabrigo. Open-Meteo snaps to its nearest marine cell.
export const SPOT = { lat: -7.84, lon: -79.44, tz: 'America/Lima' } as const

export const AIRPORTS = {
  // Where everyone actually lands. The hotel shuttle runs from Trujillo.
  arrival: { iata: 'TRU', icao: 'SPRU', city: 'Trujillo' },
  // Almost every international itinerary connects through Lima.
  gateway: { iata: 'LIM', icao: 'SPJC', city: 'Lima' },
} as const

export const ROOM_KEYS = ['any', 'garden', 'ocean', 'premium'] as const
export const FOIL_LEVELS = [
  { key: 'never', label: "Never foiled — I'm here for the beers" },
  { key: 'learning', label: 'Learning — up and riding, sometimes' },
  { key: 'intermediate', label: 'Intermediate — linking turns' },
  { key: 'rips', label: 'Rips — put me on the tow-back' },
] as const
export const GEAR_ITEMS = [
  { key: 'board', label: 'Foil board' },
  { key: 'foil', label: 'Foil + mast' },
  { key: 'wing', label: 'Wing' },
  { key: 'surfboard', label: 'Regular surfboard' },
  { key: 'wetsuit', label: 'Wetsuit' },
] as const
export const STATUS_KEYS = ['in', 'maybe', 'out'] as const
export const PAID_KEYS = ['unpaid', 'deposit', 'paid'] as const

// Peru wants six months of passport validity past entry. This is the single
// most common way somebody loses a trip like this, so the form shouts about it.
export const PASSPORT_MONTHS_REQUIRED = 6
