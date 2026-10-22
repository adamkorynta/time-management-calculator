import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN, DEFAULT_STATUS } from './calc'
import { decodeShare, encodeShare } from './share'
import { validateInputs } from './validate'
import { yearTiming, excelSerial } from './dates'

describe('share links', () => {
  it('round-trips state', () => {
    const state = { plan: { ...DEFAULT_PLAN, billablePct: 0.75 }, status: { ...DEFAULT_STATUS, ytdTotalHours: 1680 }, tierIdx: 1 }
    expect(decodeShare('#d=' + encodeShare(state))).toEqual(state)
  })
  it('rejects garbage and drops unknown/mistyped keys', () => {
    expect(decodeShare('#d=!!!')).toBeNull()
    expect(decodeShare('')).toBeNull()
    const raw = btoa(JSON.stringify({ plan: { hoursPerWeek: 'x', evil: 1 } })).replace(/=+$/, '')
    const out = decodeShare('#d=' + raw)!
    expect(out.plan.hoursPerWeek).toBe(DEFAULT_PLAN.hoursPerWeek)
    expect('evil' in out.plan).toBe(false)
  })
})

describe('validation', () => {
  it('passes defaults', () => {
    expect(validateInputs(DEFAULT_PLAN, DEFAULT_STATUS)).toEqual({})
  })
  it('flags out-of-range values', () => {
    const e = validateInputs({ ...DEFAULT_PLAN, billablePct: 1.5, hoursPerWeek: 100 }, { ...DEFAULT_STATUS, ytdTotalHours: 9000, plannedPplRemaining: -1 })
    expect(Object.keys(e)).toEqual(expect.arrayContaining(['billablePct', 'hoursPerWeek', 'ytdTotalHours', 'plannedPplRemaining']))
  })
  it('flags PPL + holiday exceeding hours remaining', () => {
    expect(validateInputs(DEFAULT_PLAN, { ...DEFAULT_STATUS, ytdTotalHours: 2000, plannedPplRemaining: 60, plannedHolidayRemaining: 40 }).plannedHolidayRemaining).toMatch(/exceed/)
  })
})

describe('dates', () => {
  it('computes weeks remaining', () => {
    expect(yearTiming('2026-10-22')!.daysRemaining).toBe(70)
    expect(yearTiming('2026-12-31')!.weeksRemaining).toBe(0)
    expect(yearTiming('nonsense')).toBeNull()
  })
  it('converts to Excel serials', () => {
    expect(excelSerial('2026-03-09')).toBe(46090)
  })
})
