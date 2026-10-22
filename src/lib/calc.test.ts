import { describe, expect, it } from 'vitest'
import { allocationStatus, computePlan, computeRemaining, DEFAULT_PLAN, DEFAULT_STATUS, paceStatus } from './calc'

// Expected values are the cached results saved in the original workbook.
describe('computePlan (workbook defaults)', () => {
  const r = computePlan(DEFAULT_PLAN)
  const row = (k: string) => r.rows.find((x) => x.key === k)!

  it('matches annual hours and totals', () => {
    expect(r.hoursPerYear).toBe(2080)
    expect(r.total.hoursPerYear).toBeCloseTo(2075.2, 6)
    expect(r.total.hoursPerWeek).toBeCloseTo(39.907692307692308, 9)
    expect(r.total.pct).toBeCloseTo(0.99769230769230777, 12)
  })

  it('matches individual rows', () => {
    expect(row('holiday').hoursPerWeek).toBeCloseTo(1.0769230769230769, 12)
    expect(row('ppl').pct).toBeCloseTo(0.10576923076923077, 12)
    expect(row('meetings').hoursPerYear).toBe(52)
    expect(row('meetings').pct).toBeCloseTo(0.025, 12)
    expect(row('billable').hoursPerYear).toBe(1664)
    expect(row('profdev').hoursPerWeek).toBeCloseTo(1.2, 12)
    expect(row('practice').hoursPerYear).toBeCloseTo(20.8, 12)
  })
})

describe('computeRemaining (workbook defaults)', () => {
  const r = computeRemaining(DEFAULT_PLAN, DEFAULT_STATUS)

  it('matches YTD derived values', () => {
    expect(r.ytdBillableHours).toBeCloseTo(181.08, 9)
    expect(r.ytdNonBillableHours).toBeCloseTo(178.92, 9)
    expect(r.hoursRemaining).toBe(1720)
    expect(r.originalBillableHours).toBe(1664)
  })

  it('matches revised targets', () => {
    expect(r.revisedBillablePct).toBeCloseTo(0.926825, 9)
    expect(r.revisedBillableHoursPerWeek).toBeCloseTo(37.073, 9)
    expect(r.revisedNonBillablePct).toBeCloseTo(0.073175, 9)
    expect(r.revisedNonBillableHoursPerWeek).toBeCloseTo(2.927, 9)
  })

  it('matches adjusted what-if column', () => {
    expect(r.adjustedBillableHoursPerWeek).toBeCloseTo(32, 9)
    expect(r.adjustedNonBillableHoursPerWeek).toBeCloseTo(8, 9)
    // Deliberately differs from the workbook's D36 (0.70244, workable hours only): what-if applies to all remaining hours.
    expect(r.yearEndBillablePct).toBeCloseTo((181.08 + 0.8 * 1720) / 2080, 12)
  })
})

describe('edge cases', () => {
  it('returns null revised target when no workable hours remain', () => {
    const r = computeRemaining(DEFAULT_PLAN, { ...DEFAULT_STATUS, plannedPplRemaining: 1680, plannedHolidayRemaining: 40 })
    expect(r.revisedBillablePct).toBeNull()
    expect(r.revisedBillableHoursPerWeek).toBeNull()
  })
  it('handles zero schedule without NaN', () => {
    const p = computePlan({ ...DEFAULT_PLAN, hoursPerWeek: 0 })
    expect(Number.isFinite(p.total.pct)).toBe(true)
  })
})

describe('allocationStatus', () => {
  const at = (extraPct: number) => allocationStatus(computePlan({ ...DEFAULT_PLAN, billablePct: 0.8 + 0.0023 + extraPct }))
  it('treats small gaps as balanced', () => {
    expect(at(0.0006)).toBe('balanced') // ~100.06%
    expect(at(-0.004)).toBe('balanced')
  })
  it('flags real gaps', () => {
    expect(at(0.02)).toBe('over')
    expect(at(-0.05)).toBe('under')
  })
})

describe('pace and achievability', () => {
  it('flags behind pace and an infeasible target', () => {
    // User's real YTD: 1,680 h at 71.1% vs 75% goal, 16 holiday hours left.
    const r = computeRemaining({ ...DEFAULT_PLAN, billablePct: 0.75 }, { ...DEFAULT_STATUS, ytdTotalHours: 1680, ytdBillablePct: 0.711, plannedPplRemaining: 0, plannedHolidayRemaining: 16 })
    expect(r.revisedBillablePct).toBeCloseTo(0.951875, 6)
    expect(r.pace).toBe('onPace') // 3.9 points under: within the 5-point band
    expect(r.paceDeltaHours).toBeCloseTo(-65.52, 6)
    expect(r.targetStatus).toBe('achievable')
    expect(r.ytdNonBillablePct).toBeCloseTo(0.289, 9)
  })
  it('reports not achievable when revised % exceeds 100%', () => {
    const r = computeRemaining({ ...DEFAULT_PLAN, billablePct: 0.8 }, { ...DEFAULT_STATUS, ytdTotalHours: 1680, ytdBillablePct: 0.711, plannedPplRemaining: 0, plannedHolidayRemaining: 16 })
    expect(r.targetStatus).toBe('impossible')
    expect(r.shortfallHours).toBeCloseTo(0.8 * 2080 - 0.711 * 1680 - 384, 6)
    expect(r.maxYearEndBillablePct).toBeCloseTo((0.711 * 1680 + 384) / 2080, 9)
  })
  it('reports met when already ahead of target hours', () => {
    const r = computeRemaining(DEFAULT_PLAN, { ...DEFAULT_STATUS, ytdTotalHours: 2000, ytdBillablePct: 0.9 })
    expect(r.targetStatus).toBe('met')
    expect(r.pace).toBe('ahead')
  })
})

describe('paceStatus bands', () => {
  it('uses ±5 / −10 point bands', () => {
    expect(paceStatus(0.06)).toBe('ahead')
    expect(paceStatus(0.05)).toBe('onPace')
    expect(paceStatus(-0.05)).toBe('onPace')
    expect(paceStatus(-0.051)).toBe('atRisk')
    expect(paceStatus(-0.1)).toBe('atRisk')
    expect(paceStatus(-0.101)).toBe('behind')
  })
})

describe('PPL remaining note', () => {
  it('derives unused PPL from accrual and YTD PPL %', () => {
    const r = computeRemaining({ ...DEFAULT_PLAN, pplHoursPerYear: 220 }, { ...DEFAULT_STATUS, ytdTotalHours: 1680, ytdPplPct: 0.08 })
    expect(r.pplUsedYtdHours).toBeCloseTo(134.4, 9)
    expect(r.pplUnusedHours).toBeCloseTo(85.6, 9)
  })
  it('goes negative when more PPL was used than accrued', () => {
    const r = computeRemaining({ ...DEFAULT_PLAN, pplHoursPerYear: 100 }, { ...DEFAULT_STATUS, ytdTotalHours: 1000, ytdPplPct: 0.2 })
    expect(r.pplUnusedHours).toBeCloseTo(-100, 9)
  })
})

describe('what-if ignores planned PPL/holidays but warns when it conflicts', () => {
  const plan = { ...DEFAULT_PLAN, billablePct: 0.75 }
  const status = { ...DEFAULT_STATUS, ytdTotalHours: 1680, ytdBillablePct: 0.711, plannedPplRemaining: 80, plannedHolidayRemaining: 16 }

  it('applies the what-if % to all remaining hours', () => {
    const r = computeRemaining(plan, { ...status, adjustedBillablePct: 1 })
    expect(r.yearEndBillablePct).toBeCloseTo((0.711 * 1680 + 400) / 2080, 12) // 100% of all 400 h, not just the 304 workable
  })
  it('flags the hours of planned time off a high what-if would consume', () => {
    const r = computeRemaining(plan, { ...status, adjustedBillablePct: 0.9 })
    expect(r.whatIfLeaveConflictHours).toBeCloseTo(0.9 * 400 - 304, 9) // 56 h
    expect(r.whatIfMaxPctKeepingLeave).toBeCloseTo(0.76, 12)
  })
  it('does not warn within the leave-respecting limit', () => {
    expect(computeRemaining(plan, { ...status, adjustedBillablePct: 0.76 }).whatIfLeaveConflictHours).toBeCloseTo(0, 9)
    expect(computeRemaining(plan, { ...status, adjustedBillablePct: 0.5 }).whatIfLeaveConflictHours).toBe(0)
  })
})
