import { describe, expect, it } from 'vitest'
import { computePlan, computeRemaining, DEFAULT_PLAN, DEFAULT_STATUS } from './calc'

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
    expect(r.yearEndBillablePct).toBeCloseTo(0.70244230769230764, 12)
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
