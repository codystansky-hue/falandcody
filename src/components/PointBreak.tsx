'use client'

import { useEffect, useRef, useState } from 'react'

// The signature. Chicama's whole character is length — a left that peels for
// about 2.5 km through named sections — so the crew is drawn ON the wave,
// spaced in the order they land. It is the roster and the hero at once.

export type Rider = { id: number; initials: string; label: string; tone: 'in' | 'maybe' | 'out' }

// Sections named from the headland down toward town, with their rough distance
// along the point. These are real, which is why they work as section markers.
const SECTIONS = [
  { at: 0.06, name: 'Malpaso', metres: 0 },
  { at: 0.33, name: 'Keys', metres: 700 },
  { at: 0.62, name: 'El Point', metres: 1500 },
  { at: 0.9, name: 'El Hombre', metres: 2200 },
]

const CREST =
  'M 8 54 C 150 34 214 112 336 118 C 458 124 508 72 648 86 C 788 100 838 148 986 146 C 1096 145 1146 126 1198 134'

export default function PointBreak({ riders }: { riders: Rider[] }) {
  const pathRef = useRef<SVGPathElement>(null)
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const [length, setLength] = useState(0)

  // Measure the real curve rather than guessing coordinates, so riders sit on
  // the line exactly and stay there if the path is ever redrawn.
  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const total = path.getTotalLength()
    setLength(total)
    const n = riders.length
    setPoints(
      riders.map((_, i) => {
        // Spread them across the middle 88% so nobody sits on the very tip.
        const t = n === 1 ? 0.5 : 0.06 + (i / (n - 1)) * 0.88
        const p = path.getPointAtLength(total * t)
        return { x: p.x, y: p.y }
      }),
    )
  }, [riders])

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 1206 210"
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={`The Chicama point with ${riders.length} of the crew on it`}
      >
        {/* Already-broken water trailing behind the crest. */}
        <path
          d={CREST}
          transform="translate(0 13)"
          fill="none"
          stroke="var(--sea)"
          strokeOpacity="0.1"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d={CREST}
          transform="translate(0 7)"
          fill="none"
          stroke="var(--sea)"
          strokeOpacity="0.16"
          strokeWidth="5"
          strokeDasharray="2 9"
          strokeLinecap="round"
        />
        {/* The crest, drawn on load. */}
        <path
          ref={pathRef}
          d={CREST}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={
            length
              ? {
                  strokeDasharray: length,
                  strokeDashoffset: length,
                  animation: 'peel 1900ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards',
                }
              : undefined
          }
        />

        {SECTIONS.map((section) => {
          const x = 8 + section.at * 1190
          return (
            <g key={section.name}>
              <line x1={x} y1={162} x2={x} y2={176} stroke="var(--ochre)" strokeWidth="1.5" />
              <text x={x} y={192} textAnchor="middle" className="mono" fontSize="11" fill="var(--ink)">
                {section.name}
              </text>
              <text x={x} y={206} textAnchor="middle" className="mono" fontSize="9.5" fill="var(--slate)">
                {section.metres}m
              </text>
            </g>
          )
        })}

        {points.map((point, i) => {
          const rider = riders[i]
          const dim = rider.tone === 'out'
          return (
            <g
              key={rider.id}
              style={{ opacity: 0, animation: `riderIn 420ms ease-out ${700 + i * 90}ms forwards` }}
            >
              <circle
                cx={point.x}
                cy={point.y - 15}
                r="13"
                fill={dim ? 'var(--bone-2)' : rider.tone === 'maybe' ? 'var(--foam)' : 'var(--ink)'}
                stroke={rider.tone === 'maybe' ? 'var(--ochre)' : 'var(--ink)'}
                strokeWidth={rider.tone === 'maybe' ? 1.5 : 0}
                strokeDasharray={rider.tone === 'maybe' ? '3 3' : undefined}
              />
              <text
                x={point.x}
                y={point.y - 11}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill={rider.tone === 'in' ? 'var(--foam)' : 'var(--ink)'}
              >
                {rider.initials}
              </text>
              <title>{rider.label}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
