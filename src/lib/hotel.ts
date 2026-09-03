// Booking channels for Chicama Boutique Hotel, taken from its own site and
// reservation pages. Groups go through reservas@ rather than the online engine,
// which is the single most important thing on this list.
export const HOTEL = {
  groupEmail: 'reservas@chicamasurf.com',
  whatsapp: 'https://wa.link/hx7h6j',
  bookingEngine: 'https://secuream3.e-gdscloud.com/ChicamaBoutiqueHotel/',
  phones: [
    { label: 'Hotel', number: '+51 986 645 895' },
    { label: 'Reservations', number: '+51 959 792 317' },
    { label: 'Reservations', number: '+51 940 482 207' },
  ],
} as const
