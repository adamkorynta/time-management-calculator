/** PPL (paid personal leave) accrual table, transcribed from the spreadsheet's "PPL Table" (F9:K15). */
export interface PplTier {
  label: string
  /** 40 hr/week staff */
  daysPerYear: number
  hoursPerYear: number
  /** 30–39 hr/week staff */
  hoursPerYearPartTime: number
}

export const PPL_TABLE: readonly PplTier[] = [
  { label: '0 – 4 years', daysPerYear: 18, hoursPerYear: 144, hoursPerYearPartTime: 108 },
  { label: '5 – 9 years', daysPerYear: 23, hoursPerYear: 184, hoursPerYearPartTime: 138 },
  { label: '10 – 14 years', daysPerYear: 25, hoursPerYear: 200, hoursPerYearPartTime: 150 },
  { label: '15 – 20 years', daysPerYear: 27.5, hoursPerYear: 220, hoursPerYearPartTime: 165 },
  { label: 'Over 20 years', daysPerYear: 30, hoursPerYear: 240, hoursPerYearPartTime: 180 },
]

/** Suggested PPL hours/year for a tier, or null when the weekly schedule has no table column (< 30 h). */
export function pplForTier(tier: PplTier, hoursPerWeek: number): number | null {
  if (hoursPerWeek >= 40) return tier.hoursPerYear
  if (hoursPerWeek >= 30) return tier.hoursPerYearPartTime
  return null
}
