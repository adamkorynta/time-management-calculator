import { WEEKS_PER_YEAR } from './calc'
import type { PlanInputs, StatusInputs } from './calc'

export type FieldErrors = Partial<Record<Exclude<keyof PlanInputs, 'overhead'> | keyof StatusInputs, string>> & {
  /** Per overhead row id */
  rows?: Record<string, string>
}

const pctOk = (v: number) => v >= 0 && v <= 1

/** Inline range checks for every numeric input. Messages are shown under the field. */
export function validateInputs(p: PlanInputs, s: StatusInputs): FieldErrors {
  const e: FieldErrors = {}
  const annual = p.hoursPerWeek * WEEKS_PER_YEAR

  if (p.hoursPerWeek <= 0 || p.hoursPerWeek > 80) e.hoursPerWeek = 'Enter a weekly schedule between 1 and 80 hours.'
  if (p.pplHoursPerYear < 0 || p.pplHoursPerYear > annual) e.pplHoursPerYear = `PPL must be between 0 and ${annual} hours/year.`

  const pctMsg = 'Enter a percentage between 0 and 100.'
  if (!pctOk(p.billablePct)) e.billablePct = pctMsg

  const rows: Record<string, string> = {}
  for (const r of p.overhead) {
    const hours = r.basis === 'week' ? r.value * WEEKS_PER_YEAR : r.basis === 'pct' ? r.value * annual : r.value
    if (!r.label.trim()) rows[r.id] = 'Give this category a name.'
    else if (r.value < 0) rows[r.id] = `${r.label}: cannot be negative.`
    else if (hours > annual) rows[r.id] = `${r.label}: exceeds the ${annual} annual hours.`
  }
  if (Object.keys(rows).length) e.rows = rows

  if (s.ytdTotalHours < 0 || s.ytdTotalHours > annual) e.ytdTotalHours = `YTD hours must be between 0 and the annual ${annual} hours.`
  if (!pctOk(s.ytdBillablePct)) e.ytdBillablePct = pctMsg
  if (!pctOk(s.ytdPplPct)) e.ytdPplPct = pctMsg
  if (!pctOk(s.ytdAdminPct)) e.ytdAdminPct = pctMsg
  if (!pctOk(s.ytdBdPct)) e.ytdBdPct = pctMsg
  if (!pctOk(s.adjustedBillablePct)) e.adjustedBillablePct = pctMsg

  if (s.plannedPplRemaining < 0) e.plannedPplRemaining = 'Cannot be negative.'
  if (s.plannedHolidayRemaining < 0) e.plannedHolidayRemaining = 'Cannot be negative.'
  const remaining = annual - s.ytdTotalHours
  if (!e.plannedPplRemaining && !e.plannedHolidayRemaining && s.plannedPplRemaining + s.plannedHolidayRemaining > remaining) {
    e.plannedHolidayRemaining = `PPL + holiday (${s.plannedPplRemaining + s.plannedHolidayRemaining} h) exceed the ${Math.max(remaining, 0)} hours remaining.`
  }
  return e
}
