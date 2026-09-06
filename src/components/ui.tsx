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
      {lede && <p className="text-muted max-w-2xl mb-10">{lede}</p>}
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
      {sub && <p className="text-xs text-muted mt-1.5">{sub}</p>}
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
    <div className={'card p-6 border-l-2 ' + (tone === 'warn' ? 'border-l-rose' : 'border-l-olive')}>
      <p className="font-semibold mb-1.5">{title}</p>
      {children && <div className="text-sm text-muted space-y-2">{children}</div>}
    </div>
  )
}

/**
 * Stands in for a detail nobody has decided yet. Guests see a plain, honest
 * "not settled" rather than a lorem-ipsum venue name; whoever is editing the
 * site sees exactly which key in config.ts to fill in.
 */
export function Todo({ what, path }: { what: string; path?: string }) {
  return (
    <span className="text-muted italic">
      {what}
      {path && <span className="mono not-italic text-[0.7rem] ml-1.5 opacity-60">{path}</span>}
    </span>
  )
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto card">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            {head.map((h) => (
              <th key={h} className="th text-left px-4 py-3 mb-0">
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

export function Pill({
  children,
  tone = 'quiet',
}: {
  children: ReactNode
  tone?: 'solid' | 'quiet' | 'warn'
}) {
  const styles = {
    solid: 'bg-ink text-paper',
    quiet: 'border border-hairline text-muted',
    warn: 'border border-rose text-rose',
  }[tone]
  return (
    <span
      className={`mono text-[0.65rem] uppercase tracking-widest px-2 py-1 shrink-0 ${styles}`}
    >
      {children}
    </span>
  )
}
