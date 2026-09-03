// Three proposed weeks, so nobody has to invent dates from a blank calendar.
//
// Saturday to Saturday, because that is how the hotel sells a week and how the
// flights fall. Every candidate Saturday in the window was scored against the
// same calendar days across 2021–2025 (scripts/season.py), using the same
// scoreSwell() that scores the live forecast. Ranked by share of good days:
//
//   Sat  7 Nov – Sat 14 Nov   83% good, 11% firing   ← most reliable
//   Sat 21 Nov – Sat 28 Nov   77% good, 20% firing   ← best standout odds
//   Sat 28 Nov – Sat  5 Dec   66% good,  6% firing
//   Sat 14 Nov – Sat 21 Nov   63% good, 14% firing   (dropped: weaker than both above)
//   Sat  5 Dec – Sat 12 Dec   63% good, 11% firing   (dropped: runs past the 10 Dec cutoff)

export type ProposedWeek = {
  key: string
  label: string
  start: string
  end: string
  /** % of days good or better, across 2021–2025 on these calendar days */
  good: number
  /** % of days firing */
  firing: number
  swellFt: number
  periodS: number
  /** Why someone would pick this one over the others. */
  pitch: string
}

export const PROPOSED_WEEKS: ProposedWeek[] = [
  {
    key: 'nov07',
    label: 'Sat 7 – Sat 14 Nov',
    start: '2026-11-07',
    end: '2026-11-14',
    good: 83,
    firing: 11,
    swellFt: 4.5,
    periodS: 11.0,
    pitch: 'The safe one. More good days than any other week in the window, five years running.',
  },
  {
    key: 'nov21',
    label: 'Sat 21 – Sat 28 Nov',
    start: '2026-11-21',
    end: '2026-11-28',
    good: 77,
    firing: 20,
    swellFt: 4.9,
    periodS: 11.3,
    pitch:
      'The greedy one. Nearly as reliable, but almost double the odds of a standout day. It also brackets US Thanksgiving (26 Nov 2026), which shows up as roughly $200 a head on every route measured — pay it for the swell, not by accident.',
  },
  {
    key: 'nov28',
    label: 'Sat 28 Nov – Sat 5 Dec',
    start: '2026-11-28',
    end: '2026-12-05',
    good: 66,
    firing: 6,
    swellFt: 4.0,
    periodS: 10.7,
    pitch: 'The late one. Weakest of the three on paper — here because some people cannot do November.',
  },
]

export const VOTES = ['yes', 'maybe', 'no'] as const
export type Vote = (typeof VOTES)[number]

export const weekByKey = (key: string) => PROPOSED_WEEKS.find((w) => w.key === key) ?? null

/** Yes counts a point, maybe counts a half. Highest total wins. */
export function tallyWeeks(votes: { week_key: string; vote: string }[]) {
  return PROPOSED_WEEKS.map((week) => {
    const forThis = votes.filter((v) => v.week_key === week.key)
    const yes = forThis.filter((v) => v.vote === 'yes').length
    const maybe = forThis.filter((v) => v.vote === 'maybe').length
    const no = forThis.filter((v) => v.vote === 'no').length
    return { ...week, yes, maybe, no, points: yes + maybe * 0.5 }
  }).sort((a, b) => b.points - a.points || b.good - a.good)
}
