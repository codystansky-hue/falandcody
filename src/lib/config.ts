// Trip constants. Everything Cody still has to decide lives here so it can be
// changed in one place without touching a component.

export const TRIP = {
  name: 'Chicama',
  subtitle: 'the longest left on earth',
  // Placeholder until the crew locks a week — /dates collects the overlap that
  // decides it. Season runs Apr–Oct; Apr and Sep carry the best odds.
  window: {
    label: 'April – October 2027',
    start: '2027-04-01',
    end: '2027-10-31',
    locked: false,
  },
  groom: null as string | null,
  venue: {
    name: 'Chicama Boutique Hotel',
    town: 'Puerto Malabrigo, La Libertad, Peru',
    url: 'https://www.chicamaboutiquehotel.com/',
    rooms: [
      { key: 'garden', label: 'Standard Garden View', count: 10, fromUsd: 150 },
      { key: 'ocean', label: 'Standard Ocean View', count: 10, fromUsd: 160 },
      { key: 'premium', label: 'Premium (A/C, bay view)', count: 3, fromUsd: 180 },
    ],
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
