const DAY_MS = 24 * 60 * 60 * 1000

/** Today as a local YYYY-MM-DD string. */
export const todayISO = () => new Date().toLocaleDateString('en-CA')

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return Number.isNaN(date.getTime()) ? null : date
}

export interface YearTiming {
  daysRemaining: number
  weeksRemaining: number
  weeksElapsed: number
  /** Share of the calendar year elapsed, counting the as-of day (0–1). */
  fractionElapsed: number
}

/** Calendar position of a date within its own year. Returns null for an invalid date. */
export function yearTiming(iso: string): YearTiming | null {
  const d = parse(iso)
  if (!d) return null
  const start = new Date(d.getFullYear(), 0, 1)
  const end = new Date(d.getFullYear(), 11, 31)
  const total = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
  const elapsed = Math.round((d.getTime() - start.getTime()) / DAY_MS) + 1
  const remaining = total - elapsed
  return { daysRemaining: remaining, weeksRemaining: remaining / 7, weeksElapsed: elapsed / 7, fractionElapsed: elapsed / total }
}

/** Excel serial date (1900 system) for a YYYY-MM-DD string. */
export function excelSerial(iso: string): number | null {
  const d = parse(iso)
  if (!d) return null
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / DAY_MS)
}
