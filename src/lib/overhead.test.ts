import { describe, expect, it } from 'vitest'
import { computePlan, DEFAULT_PLAN, overheadHoursPerYear, overheadValueFromYear } from './calc'
import type { OverheadRow } from './calc'
import { normalizePlan } from './plan'

describe('overhead rows', () => {
  const row = (basis: OverheadRow['basis'], value: number): OverheadRow => ({ id: 'x', label: 'X', basis, value })

  it('derives the other columns from whichever was entered', () => {
    const g3 = 2080
    for (const r of [row('week', 2), row('year', 104), row('pct', 0.05)]) {
      const plan = computePlan({ ...DEFAULT_PLAN, overhead: [r] })
      const x = plan.rows.find((p) => p.key === 'x')!
      expect(x.hoursPerYear).toBeCloseTo(104, 9)
      expect(x.hoursPerWeek).toBeCloseTo(2, 9)
      expect(x.pct).toBeCloseTo(0.05, 9)
      expect(overheadHoursPerYear(r, g3)).toBeCloseTo(104, 9)
    }
  })

  it('keeps the entered column fixed when the schedule changes', () => {
    const p = { ...DEFAULT_PLAN, hoursPerWeek: 30, overhead: [row('week', 2), row('pct', 0.05)] }
    const rows = computePlan(p).rows
    expect(rows.find((r) => r.key === 'x')!.hoursPerWeek).toBeCloseTo(2, 9) // hours stay
    expect(computePlan({ ...p, overhead: [row('pct', 0.05)] }).rows.find((r) => r.key === 'x')!.hoursPerYear).toBeCloseTo(0.05 * 1560, 9) // % stays
  })

  it('round-trips value conversion', () => {
    expect(overheadValueFromYear('week', 104, 2080)).toBe(2)
    expect(overheadValueFromYear('pct', 104, 2080)).toBeCloseTo(0.05, 12)
    expect(overheadValueFromYear('pct', 104, 0)).toBe(0)
  })

  it('has the requested default categories and keeps workbook totals', () => {
    expect(DEFAULT_PLAN.overhead.map((r) => r.label)).toEqual([
      'Company/Office/Group Meetings',
      'Business Development',
      'Professional Development/Training',
      'Practice Development/Leadership',
      'Administration - Computer',
      'General Administration',
    ])
    expect(computePlan(DEFAULT_PLAN).total.hoursPerYear).toBeCloseTo(2075.2, 6)
  })
})

describe('normalizePlan', () => {
  it('migrates the pre-table shape', () => {
    const p = normalizePlan({ hoursPerWeek: 36, pplHoursPerYear: 200, meetingsHoursPerWeek: 1.5, billablePct: 0.75, businessDevPct: 0.02, profDevPct: 0.03, practiceDevPct: 0.04 })
    expect(p.hoursPerWeek).toBe(36)
    expect(p.overhead.find((r) => r.id === 'meetings')).toMatchObject({ basis: 'week', value: 1.5 })
    expect(p.overhead.find((r) => r.id === 'bd')).toMatchObject({ basis: 'pct', value: 0.02 })
    expect(p.overhead.find((r) => r.id === 'admin-computer')).toMatchObject({ basis: 'pct', value: 0 })
  })
  it('sanitizes bad rows and duplicates', () => {
    const p = normalizePlan({ overhead: [{ id: 'a', label: 'A', basis: 'week', value: 1 }, { id: 'a', label: 'dup', basis: 'week', value: 2 }, { id: 'b', label: 5, value: 1 }, { id: 'c', label: 'C', basis: 'bogus', value: 3 }, null] })
    expect(p.overhead.map((r) => r.id)).toEqual(['a', 'c'])
    expect(p.overhead[1].basis).toBe('pct')
  })
  it('falls back to defaults for junk', () => {
    expect(normalizePlan('nope')).toEqual(DEFAULT_PLAN)
  })
})
