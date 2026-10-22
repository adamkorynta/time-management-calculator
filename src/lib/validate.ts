import { WEEKS_PER_YEAR } from './calc'
import type { PlanInputs, StatusInputs } from './calc'

export type FieldErrors = Partial<Record<keyof PlanInputs | keyof StatusInputs, string>>

const pctOk = (v: number) => v >= 0 && v <= 1

/** Inline range checks for every numeric input. Messages are shown under the field. */
export function validateInputs(p: PlanInputs, s: StatusInputs): FieldErrors {
  const e: FieldErrors = {}
  const annual = p.hoursPerWeek * WEEKS_PER_YEAR

  if (p.hoursPerWeek <= 0 || p.hoursPerWeek > 80) e.hoursPerWeek = 'Enter a weekly schedule between 1 and 80 hours.'
  if (p.pplHoursPerYear < 0 || p.pplHoursPerYear > annual) e.pplHoursPerYear = `PPL must be between 0 and ${annual} hours/year.`
  if (p.meetingsHoursPerWeek < 0 || p.meetingsHoursPerWeek > p.hoursPerWeek) e.meetingsHoursPerWeek = 'Meetings must be between 0 and your weekly hours.'

  const pctMsg = 'Enter a percentage between 0 and 100.'
  if (!pctOk(p.billablePct)) e.billablePct = pctMsg
  if (!pctOk(p.businessDevPct)) e.businessDevPct = pctMsg
  if (!pctOk(p.profDevPct)) e.profDevPct = pctMsg
  if (!pctOk(p.practiceDevPct)) e.practiceDevPct = pctMsg

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
