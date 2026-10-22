/**
 * Pure calculation model reverse-engineered from
 * docs/reference/TimeManagementCalculator_RemainingTime_EnvBranch.xlsx (Sheet1).
 * Cell references in comments point at the original workbook.
 */

import { yearTiming } from './dates'

export const WEEKS_PER_YEAR = 52
/** D3: =(7*8)/G3 — 7 holidays of 8 hours, fixed. */
export const HOLIDAY_HOURS_PER_YEAR = 7 * 8

export interface PlanInputs {
  hoursPerWeek: number // G2
  pplHoursPerYear: number // G4
  meetingsHoursPerWeek: number // B5
  billablePct: number // D6 (0–1)
  businessDevPct: number // D7
  profDevPct: number // D8
  practiceDevPct: number // D9
}

export interface StatusInputs {
  asOf: string // B19 (ISO date); ignored while asOfAuto is on
  /** Use today's date as the as-of date (new; the workbook date was typed by hand). */
  asOfAuto: boolean
  ytdTotalHours: number // B27
  ytdBillablePct: number // B25 (0–1)
  ytdPplPct: number // B20 (informational)
  ytdAdminPct: number // B21 (informational)
  ytdBdPct: number // B22 (informational)
  plannedPplRemaining: number // B33
  plannedHolidayRemaining: number // B34
  adjustedBillablePct: number // C36 (what-if, 0–1)
}

export interface AllocationRow {
  key: string
  label: string
  hoursPerWeek: number
  hoursPerYear: number
  pct: number
}

export interface PlanResult {
  hoursPerYear: number // G3
  rows: AllocationRow[]
  total: { hoursPerWeek: number; hoursPerYear: number; pct: number }
  /** Hours the allocation leaves over (+) or overshoots (−) vs. the annual schedule. */
  unallocatedHours: number
}

/** Allocations within ±0.5% of the annual schedule count as balanced (exact 100% is impractical to hit). */
export const ALLOCATION_TOLERANCE = 0.005

export type AllocationStatus = 'balanced' | 'over' | 'under'

export function allocationStatus(plan: PlanResult): AllocationStatus {
  if (plan.hoursPerYear <= 0) return 'balanced'
  const gap = plan.unallocatedHours / plan.hoursPerYear
  return Math.abs(gap) <= ALLOCATION_TOLERANCE ? 'balanced' : gap < 0 ? 'over' : 'under'
}

/** Divide, returning null instead of Infinity/NaN. */
const div = (a: number, b: number): number | null => (b === 0 || !Number.isFinite(a / b) ? null : a / b)

export function computePlan(p: PlanInputs): PlanResult {
  const g3 = p.hoursPerWeek * WEEKS_PER_YEAR
  const fromYear = (key: string, label: string, hoursPerYear: number): AllocationRow => ({
    key,
    label,
    hoursPerWeek: hoursPerYear / WEEKS_PER_YEAR,
    hoursPerYear,
    pct: div(hoursPerYear, g3) ?? 0,
  })
  const fromPct = (key: string, label: string, share: number): AllocationRow => ({
    key,
    label,
    hoursPerWeek: (share * g3) / WEEKS_PER_YEAR,
    hoursPerYear: share * g3,
    pct: share,
  })

  const rows: AllocationRow[] = [
    fromYear('holiday', 'Holiday (7 days/year)', HOLIDAY_HOURS_PER_YEAR),
    fromYear('ppl', 'PPL', p.pplHoursPerYear),
    fromYear('meetings', 'Company/Office/Group Meetings', p.meetingsHoursPerWeek * WEEKS_PER_YEAR),
    fromPct('billable', 'Project Billable', p.billablePct),
    fromPct('bd', 'Business Development', p.businessDevPct),
    fromPct('profdev', 'Professional Development/Training', p.profDevPct),
    fromPct('practice', 'Practice Development/Leadership', p.practiceDevPct),
  ]
  const total = rows.reduce(
    (t, r) => ({
      hoursPerWeek: t.hoursPerWeek + r.hoursPerWeek,
      hoursPerYear: t.hoursPerYear + r.hoursPerYear,
      pct: t.pct + r.pct,
    }),
    { hoursPerWeek: 0, hoursPerYear: 0, pct: 0 },
  )
  return { hoursPerYear: g3, rows, total, unallocatedHours: g3 - total.hoursPerYear }
}

export type PaceStatus = 'ahead' | 'onPace' | 'atRisk' | 'behind'
export type TargetStatus = 'achievable' | 'met' | 'impossible'

/**
 * Pace bands, in percentage points of YTD billable % vs. the original target:
 * within 5 points either way is fine; 5–10 points under is at risk; more than 10 under is behind.
 */
export const PACE_OK_POINTS = 0.05
export const PACE_BEHIND_POINTS = 0.1

export function paceStatus(deltaPct: number): PaceStatus {
  const d = Math.round(deltaPct * 1e9) / 1e9 // absorb float noise at the band edges
  if (d > PACE_OK_POINTS) return 'ahead'
  if (d >= -PACE_OK_POINTS) return 'onPace'
  if (d >= -PACE_BEHIND_POINTS) return 'atRisk'
  return 'behind'
}

export interface RemainingResult {
  ytdBillableHours: number // B26
  ytdNonBillableHours: number // B24
  /** B23, now derived: 100% − YTD billable % */
  ytdNonBillablePct: number
  hoursRemaining: number // B30
  originalBillablePct: number // B31
  originalBillableHours: number // B32
  /** Hours left to work after planned PPL and holidays: B30-B33-B34 */
  workableHoursRemaining: number
  /** Billable hours still needed to hit the original target: B32-B26 */
  billableHoursStillNeeded: number
  revisedBillablePct: number | null // B36
  revisedBillableHoursPerWeek: number | null // B37
  revisedNonBillablePct: number | null // B38
  revisedNonBillableHoursPerWeek: number | null // B39
  adjustedBillableHoursPerWeek: number // C37
  adjustedNonBillablePct: number // C38
  adjustedNonBillableHoursPerWeek: number // C39
  /** D36: full-year billable % if you bill the adjusted % for the remaining workable hours. */
  yearEndBillablePct: number | null
  /** Calendar weeks left in the as-of year (null when the date is invalid). */
  weeksRemaining: number | null
  /** Total hours you'd have worked by the as-of date on a straight 52-week schedule. */
  expectedYtdHours: number | null
  pace: PaceStatus
  /** YTD billable % minus the original target % (percentage points as a 0–1 fraction). */
  paceDeltaPct: number
  /** YTD billable hours minus (target % × YTD total hours). */
  paceDeltaHours: number
  targetStatus: TargetStatus
  /** Billable hours short of the target even at 100% billable for all workable hours (0 if achievable). */
  shortfallHours: number
  /** Best possible year-end billable % (100% billable for the rest of the year). */
  maxYearEndBillablePct: number | null
  /** Sum of the informational YTD PPL + Admin + BD percentages (compare with YTD non-billable total). */
  ytdBreakdownPct: number
}

export function computeRemaining(p: PlanInputs, s: StatusInputs): RemainingResult {
  const g3 = p.hoursPerWeek * WEEKS_PER_YEAR
  const ytdBillableHours = s.ytdBillablePct * s.ytdTotalHours
  const hoursRemaining = g3 - s.ytdTotalHours
  const originalBillableHours = p.billablePct * g3
  const workable = hoursRemaining - s.plannedPplRemaining - s.plannedHolidayRemaining
  const billableHoursStillNeeded = originalBillableHours - ytdBillableHours

  const revised = workable > 0 ? div(billableHoursStillNeeded, workable) : null
  const perWeek = (v: number | null) => (v === null ? null : v * p.hoursPerWeek)
  const nonBillable = revised === null ? null : 1 - revised
  const timing = yearTiming(s.asOf)
  const paceDeltaPct = s.ytdBillablePct - p.billablePct
  const targetStatus: TargetStatus =
    billableHoursStillNeeded <= 0 ? 'met' : revised === null || revised > 1 ? 'impossible' : 'achievable'

  return {
    ytdBillableHours,
    ytdNonBillableHours: s.ytdTotalHours - ytdBillableHours,
    ytdNonBillablePct: 1 - s.ytdBillablePct,
    hoursRemaining,
    originalBillablePct: p.billablePct,
    originalBillableHours,
    workableHoursRemaining: workable,
    billableHoursStillNeeded,
    revisedBillablePct: revised,
    revisedBillableHoursPerWeek: perWeek(revised),
    revisedNonBillablePct: nonBillable,
    revisedNonBillableHoursPerWeek: perWeek(nonBillable),
    adjustedBillableHoursPerWeek: s.adjustedBillablePct * p.hoursPerWeek,
    adjustedNonBillablePct: 1 - s.adjustedBillablePct,
    adjustedNonBillableHoursPerWeek: (1 - s.adjustedBillablePct) * p.hoursPerWeek,
    yearEndBillablePct: div(ytdBillableHours + workable * s.adjustedBillablePct, g3),
    weeksRemaining: timing?.weeksRemaining ?? null,
    expectedYtdHours: timing ? g3 * timing.fractionElapsed : null,
    pace: paceStatus(paceDeltaPct),
    paceDeltaPct,
    paceDeltaHours: ytdBillableHours - p.billablePct * s.ytdTotalHours,
    targetStatus,
    shortfallHours: targetStatus === 'impossible' ? billableHoursStillNeeded - Math.max(workable, 0) : 0,
    maxYearEndBillablePct: div(ytdBillableHours + Math.max(workable, 0), g3),
    ytdBreakdownPct: s.ytdPplPct + s.ytdAdminPct + s.ytdBdPct,
  }
}

/** Spreadsheet defaults (the values saved in the workbook). */
export const DEFAULT_PLAN: PlanInputs = {
  hoursPerWeek: 40,
  pplHoursPerYear: 220,
  meetingsHoursPerWeek: 1,
  billablePct: 0.8,
  businessDevPct: 0,
  profDevPct: 0.03,
  practiceDevPct: 0.01,
}

export const DEFAULT_STATUS: StatusInputs = {
  asOf: '2026-03-09', // workbook value; only used when asOfAuto is off
  asOfAuto: true,
  ytdTotalHours: 360,
  ytdBillablePct: 0.503,
  ytdPplPct: 0.123,
  ytdAdminPct: 0.178,
  ytdBdPct: 0.127,
  plannedPplRemaining: 80,
  plannedHolidayRemaining: 40,
  adjustedBillablePct: 0.8,
}
