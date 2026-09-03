import type { ReactNode } from 'react'

export function Page({
  marker,
  title,
  lede,
  children,
}: {
  marker: string
  title: string
  lede?: string
  children: ReactNode
}) {
  return (
    <div className="max-w-page mx-auto px-6 py-12 md:py-16">
      <p className="marker mb-3">{marker}</p>
      <h1 className="display text-4xl md:text-5xl mb-3">{title}</h1>
      {lede && <p className="text-slate2 max-w-2xl mb-10">{lede}</p>}
      {!lede && <div className="mb-10" />}
      {children}
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="label mb-1">{label}</p>
      <p className="mono text-2xl leading-none">{value}</p>
      {sub && <p className="text-xs text-slate2 mt-1.5">{sub}</p>}
    </div>
  )
}

// Empty and unconfigured states get direction, not an apology. Each one says
// what is missing and the single step that fills it.
export function Notice({
  title,
  children,
  tone = 'quiet',
}: {
  title: string
  children?: ReactNode
  tone?: 'quiet' | 'warn'
}) {
  return (
    <div
      className={
        'card p-6 border-l-2 ' + (tone === 'warn' ? 'border-l-rust' : 'border-l-ochre')
      }
    >
      <p className="font-semibold mb-1.5">{title}</p>
      {children && <div className="text-sm text-slate2 space-y-2">{children}</div>}
    </div>
  )
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto card">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            {head.map((h) => (
              <th key={h} className="label text-left px-4 py-3 mb-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
