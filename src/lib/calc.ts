/**
 * Pure calculation model reverse-engineered from
 * docs/reference/TimeManagementCalculator_RemainingTime_EnvBranch.xlsx (Sheet1).
 * Cell references in comments point at the original workbook.
 */

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
  asOf: string // B19 (ISO date)
  ytdTotalHours: number // B27
  ytdBillablePct: number // B25 (0–1)
  ytdPplPct: number // B20 (informational)
  ytdAdminPct: number // B21 (informational)
  ytdBdPct: number // B22 (informational)
  ytdNonBillablePct: number // B23 (informational)
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

export interface RemainingResult {
  ytdBillableHours: number // B26
  ytdNonBillableHours: number // B24
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

  const revised = div(billableHoursStillNeeded, workable)
  const perWeek = (v: number | null) => (v === null ? null : v * p.hoursPerWeek)
  const nonBillable = revised === null ? null : 1 - revised

  return {
    ytdBillableHours,
    ytdNonBillableHours: s.ytdTotalHours - ytdBillableHours,
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
  asOf: '2026-03-09',
  ytdTotalHours: 360,
  ytdBillablePct: 0.503,
  ytdPplPct: 0.123,
  ytdAdminPct: 0.178,
  ytdBdPct: 0.127,
  ytdNonBillablePct: 0.428,
  plannedPplRemaining: 80,
  plannedHolidayRemaining: 40,
  adjustedBillablePct: 0.8,
}
