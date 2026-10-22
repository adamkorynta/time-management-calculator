import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN, DEFAULT_STATUS } from './calc'
import { decodeShare, encodeShare } from './share'
import { validateInputs } from './validate'
import { yearTiming, excelSerial, workWeeksElapsed } from './dates'
import { estimateYtdHours, resolveStatus } from './calc'
import { estimateHolidayHours, holidaysForYear } from './holidays'

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

describe('estimated YTD hours', () => {
  it('counts completed work weeks (Fridays passed)', () => {
    expect(workWeeksElapsed('2026-01-01')).toBe(0)
    expect(workWeeksElapsed('2026-01-02')).toBe(1) // first Friday of 2026
    expect(workWeeksElapsed('2026-10-16')).toBe(42)
    expect(workWeeksElapsed('2026-10-22')).toBe(42) // Thursday: week 43 not finished
    expect(workWeeksElapsed('2026-10-23')).toBe(43)
  })
  it('matches the real 1,680 h report for a 40 h schedule', () => {
    expect(estimateYtdHours(40, '2026-10-22')).toBe(1680)
  })
  it('resolveStatus applies the switches', () => {
    const on = resolveStatus(DEFAULT_PLAN, { ...DEFAULT_STATUS, asOfAuto: true, ytdHoursAuto: true }, '2026-10-22')
    expect(on.asOf).toBe('2026-10-22')
    expect(on.ytdTotalHours).toBe(1680)
    const off = resolveStatus(DEFAULT_PLAN, { ...DEFAULT_STATUS, asOfAuto: false, ytdHoursAuto: false, ytdTotalHours: 1500 }, '2026-10-22')
    expect(off.asOf).toBe(DEFAULT_STATUS.asOf)
    expect(off.ytdTotalHours).toBe(1500)
  })
})

describe('holiday calendar', () => {
  it('reproduces the published 2026 list', () => {
    expect(holidaysForYear(2026).map((h) => h.date)).toEqual(['2026-01-01', '2026-05-25', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25'])
  })
  it('shifts weekend holidays to the nearest weekday', () => {
    const d = holidaysForYear(2027).map((h) => h.date)
    expect(d).toContain('2027-07-05') // Sunday July 4
    expect(d).toContain('2027-12-24') // Saturday Dec 25
  })
  it('estimates remaining holiday hours', () => {
    expect(estimateHolidayHours('2026-10-22', true)).toBe(16) // Thanksgiving + Christmas
    expect(estimateHolidayHours('2026-10-22', false)).toBe(24) // + floating
    expect(estimateHolidayHours('2026-11-26', true)).toBe(8) // Thanksgiving itself already passed
    expect(estimateHolidayHours('2026-12-31', false)).toBe(8) // only the unused floating holiday
  })
})
