import { DEFAULT_OVERHEAD, DEFAULT_PLAN } from './calc'
import type { OverheadBasis, OverheadRow, PlanInputs } from './calc'

const BASES: OverheadBasis[] = ['week', 'year', 'pct']

let counter = 0
/** A fresh row id that cannot collide with the built-in ids. */
export const newRowId = () => `x${Date.now().toString(36)}${(counter++).toString(36)}`

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function cleanRow(raw: unknown): OverheadRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.label !== 'string' || !isNum(r.value)) return null
  const basis = BASES.includes(r.basis as OverheadBasis) ? (r.basis as OverheadBasis) : 'pct'
  return { id: r.id.slice(0, 40), label: r.label.slice(0, 80), basis, value: r.value }
}

/**
 * Turn arbitrary stored/shared data into valid PlanInputs. Accepts the current shape and the
 * pre-table shape (meetingsHoursPerWeek, businessDevPct, profDevPct, practiceDevPct).
 */
export function normalizePlan(raw: unknown): PlanInputs {
  const out: PlanInputs = { ...DEFAULT_PLAN, overhead: DEFAULT_OVERHEAD.map((r) => ({ ...r })) }
  if (!raw || typeof raw !== 'object') return out
  const r = raw as Record<string, unknown>
  if (isNum(r.hoursPerWeek)) out.hoursPerWeek = r.hoursPerWeek
  if (isNum(r.pplHoursPerYear)) out.pplHoursPerYear = r.pplHoursPerYear
  if (isNum(r.billablePct)) out.billablePct = r.billablePct

  if (Array.isArray(r.overhead)) {
    const seen = new Set<string>()
    out.overhead = r.overhead.slice(0, 40).flatMap((x) => {
      const row = cleanRow(x)
      if (!row || seen.has(row.id)) return []
      seen.add(row.id)
      return [row]
    })
  } else {
    // Legacy: keep the user's old values on the matching built-in rows.
    const set = (id: string, basis: OverheadBasis, value: unknown) => {
      const row = out.overhead.find((o) => o.id === id)
      if (row && isNum(value)) {
        row.basis = basis
        row.value = value
      }
    }
    set('meetings', 'week', r.meetingsHoursPerWeek)
    set('bd', 'pct', r.businessDevPct)
    set('profdev', 'pct', r.profDevPct)
    set('practice', 'pct', r.practiceDevPct)
  }
  return out
}

/** Read a plan saved under an older storage key, if any. */
export function readLegacyPlan(key: string): PlanInputs | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? normalizePlan(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
