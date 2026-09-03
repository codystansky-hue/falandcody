'use client'

import { useState } from 'react'
import { SPOT } from '@/lib/config'

// Windy's embed carries the live ECMWF wave model with no key and no account.
// Two views, because they answer different questions:
//   swell  — where the energy is right now
//   corridor — where it comes FROM, which is the thing that explains Chicama
const LAYERS = [
  { key: 'swell1', label: 'Swell', zoom: 4, blurb: 'Primary swell height and direction, live from the ECMWF wave model.' },
  { key: 'waves', label: 'Combined sea', zoom: 4, blurb: 'Total sea state — swell plus local wind chop.' },
  { key: 'wind', label: 'Wind', zoom: 6, blurb: 'Surface wind. Mornings are usually the glassy ones here.' },
] as const

function windyUrl(overlay: string, zoom: number) {
  const params = new URLSearchParams({
    lat: String(SPOT.lat),
    lon: String(SPOT.lon),
    detailLat: String(SPOT.lat),
    detailLon: String(SPOT.lon),
    zoom: String(zoom),
    level: 'surface',
    overlay,
    product: overlay === 'wind' ? 'ecmwf' : 'ecmwfWaves',
    menu: '',
    message: 'true',
    marker: 'true',
    calendar: 'now',
    type: 'map',
    location: 'coordinates',
    metricWind: 'kt',
    metricTemp: '°C',
  })
  return `https://embed.windy.com/embed2.html?${params}`
}

export default function SwellMap() {
  const [layer, setLayer] = useState<(typeof LAYERS)[number]>(LAYERS[0])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex gap-2">
          {LAYERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setLayer(option)}
              aria-pressed={layer.key === option.key}
              className={
                'px-3 py-1.5 text-sm border transition-colors ' +
                (layer.key === option.key
                  ? 'bg-ink text-foam border-ink'
                  : 'bg-foam border-hairline hover:bg-bone2')
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="marker">Live · ECMWF via Windy</p>
      </div>

      {/* Phone: a link, not an embed. An interactive map inside a scrolling
          page is a scroll trap on touch, and a slow iframe leaves half a screen
          of blank. Tablet and up get the real thing. */}
      <a
        href={`https://www.windy.com/-Waves-waves?${layer.key},${SPOT.lat},${SPOT.lon},5`}
        target="_blank"
        rel="noreferrer"
        className="sm:hidden card p-5 flex items-center justify-between gap-4"
      >
        <span>
          <span className="font-semibold block">Open the live {layer.label.toLowerCase()} map</span>
          <span className="text-sm text-slate2">Windy, centred on the point</span>
        </span>
        <span className="mono text-lg shrink-0">↗</span>
      </a>

      <div className="hidden sm:block card overflow-hidden">
        <iframe
          key={layer.key}
          title={`${layer.label} map centred on Chicama`}
          src={windyUrl(layer.key, layer.zoom)}
          className="w-full block"
          style={{ height: 'clamp(320px, 52vh, 560px)', border: 0 }}
          loading="lazy"
        />
      </div>

      <p className="text-sm text-slate2 mt-3">
        {layer.blurb} Chicama needs it arriving from the south-southwest — between about 190° and
        235° — so the headland can bend it into the bay. Anything from the north walks straight past.
      </p>
    </div>
  )
}
