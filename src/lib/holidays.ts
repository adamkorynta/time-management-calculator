/**
 * GEI observes seven holidays per calendar year: six fixed-calendar days plus one floating holiday.
 * Dates are derived by rule (verified against the published 2026 list). Assumption: a fixed date that
 * lands on a weekend is observed on the nearest weekday (Saturday -> Friday, Sunday -> Monday), which
 * is how Independence Day 2026 (Saturday July 4) became Friday July 3.
 */
export const HOLIDAY_HOURS = 8

export interface Holiday {
  name: string
  /** YYYY-MM-DD */
  date: string
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** n-th (1-based) weekday of a month; n = -1 means the last one. weekday: 0 = Sunday. */
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  if (n > 0) {
    const first = new Date(year, month - 1, 1).getDay()
    return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7
  }
  const lastDay = new Date(year, month, 0).getDate()
  const last = new Date(year, month - 1, lastDay).getDay()
  return lastDay - ((last - weekday + 7) % 7)
}

/** Move a weekend date to the nearest weekday, staying inside the same month. */
function observed(year: number, month: number, day: number): number {
  const wd = new Date(year, month - 1, day).getDay()
  const lastDay = new Date(year, month, 0).getDate()
  if (wd === 6) return day > 1 ? day - 1 : day + 2
  if (wd === 0) return day < lastDay ? day + 1 : day - 2
  return day
}

export function holidaysForYear(year: number): Holiday[] {
  return [
    { name: "New Year's Day", date: iso(year, 1, observed(year, 1, 1)) },
    { name: 'Memorial Day', date: iso(year, 5, nthWeekday(year, 5, 1, -1)) },
    { name: 'Independence Day', date: iso(year, 7, observed(year, 7, 4)) },
    { name: 'Labor Day', date: iso(year, 9, nthWeekday(year, 9, 1, 1)) },
    { name: 'Thanksgiving Day', date: iso(year, 11, nthWeekday(year, 11, 4, 4)) },
    { name: 'Christmas Day', date: iso(year, 12, observed(year, 12, 25)) },
  ]
}

/** Fixed holidays still ahead after the as-of date (the as-of day itself counts as already passed). */
export function remainingHolidays(asOf: string): Holiday[] {
  const year = Number(asOf.slice(0, 4))
  if (!Number.isInteger(year)) return []
  return holidaysForYear(year).filter((h) => h.date > asOf)
}

/** Estimated holiday hours left: remaining fixed holidays plus the floating holiday if not yet used. */
export function estimateHolidayHours(asOf: string, floatingUsed: boolean): number {
  return (remainingHolidays(asOf).length + (floatingUsed ? 0 : 1)) * HOLIDAY_HOURS
}
