import { useState } from 'react'
import type { OverheadBasis, OverheadRow, PlanInputs, PlanResult } from '../lib/calc'
import { fmtHours, fmtPct } from '../lib/format'
import { newRowId } from '../lib/plan'
import type { FieldErrors } from '../lib/validate'

const round = (n: number) => String(Math.round(n * 1e4) / 1e4)

interface CellProps {
  label: string
  value: number
  scale?: number
  suffix?: string
  /** True when this column is the one the user last typed into (kept when the schedule changes). */
  source: boolean
  invalid: boolean
  onCommit: (v: number) => void
}

/** Numeric table cell: shows the derived value, keeps a text draft while the user is typing. */
function Cell({ label, value, scale = 1, suffix, source, invalid, onCommit }: CellProps) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="input-group input-group-sm">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={label}
        className={`form-control text-end ${invalid ? 'is-invalid' : ''} ${source ? 'cell-source' : ''}`}
        title={source ? 'You entered this column; it stays fixed if your schedule changes.' : undefined}
        value={draft ?? round(value * scale)}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = e.target.valueAsNumber
          onCommit(Number.isFinite(n) ? Math.round((n / scale) * 1e9) / 1e9 : 0)
        }}
      />
      {suffix && <span className="input-group-text">{suffix}</span>}
    </div>
  )
}

interface Props {
  plan: PlanInputs
  result: PlanResult
  errors: FieldErrors
  onChange: (patch: Partial<PlanInputs>) => void
}

export default function OverheadTable({ plan, result, errors, onChange }: Props) {
  const byKey = Object.fromEntries(result.rows.map((r) => [r.key, r]))
  const fixed = result.rows.filter((r) => r.group === 'fixed')
  const billable = byKey.billable
  const nonBillable = result.rows.filter((r) => r.group !== 'billable')
  const nbWeek = nonBillable.reduce((t, r) => t + r.hoursPerWeek, 0)
  const nbYear = nonBillable.reduce((t, r) => t + r.hoursPerYear, 0)
  const nbPct = nonBillable.reduce((t, r) => t + r.pct, 0)

  const update = (id: string, patch: Partial<OverheadRow>) => onChange({ overhead: plan.overhead.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const setCell = (id: string, basis: OverheadBasis, value: number) => update(id, { basis, value })

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-2 overhead-table">
        <thead>
          <tr>
            <th>Category</th>
            <th className="text-end">Hours/week</th>
            <th className="text-end">Hours/year</th>
            <th className="text-end">Allocation</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {fixed.map((r) => (
            <tr key={r.key} className="table-light">
              <td>
                {r.label} <span className="text-body-secondary small">(set above)</span>
              </td>
              <td className="text-end">{fmtHours(r.hoursPerWeek)}</td>
              <td className="text-end">{fmtHours(r.hoursPerYear)}</td>
              <td className="text-end">{fmtPct(r.pct, 2)}</td>
              <td />
            </tr>
          ))}
          {plan.overhead.map((o) => {
            const r = byKey[o.id]
            const bad = Boolean(errors.rows?.[o.id])
            return (
              <tr key={o.id}>
                <td>
                  <input
                    className={`form-control form-control-sm ${bad && !o.label.trim() ? 'is-invalid' : ''}`}
                    aria-label="Category name"
                    value={o.label}
                    maxLength={80}
                    onChange={(e) => update(o.id, { label: e.target.value })}
                  />
                </td>
                <td style={{ minWidth: 96 }}>
                  <Cell label={`${o.label} hours per week`} value={r.hoursPerWeek} source={o.basis === 'week'} invalid={bad} onCommit={(v) => setCell(o.id, 'week', v)} />
                </td>
                <td style={{ minWidth: 104 }}>
                  <Cell label={`${o.label} hours per year`} value={r.hoursPerYear} source={o.basis === 'year'} invalid={bad} onCommit={(v) => setCell(o.id, 'year', v)} />
                </td>
                <td style={{ minWidth: 104 }}>
                  <Cell label={`${o.label} percent`} value={r.pct} scale={100} suffix="%" source={o.basis === 'pct'} invalid={bad} onCommit={(v) => setCell(o.id, 'pct', v)} />
                </td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-outline-danger border-0" aria-label={`Remove ${o.label}`} title="Remove this row" onClick={() => onChange({ overhead: plan.overhead.filter((x) => x.id !== o.id) })}>
                    ×
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5}>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onChange({ overhead: [...plan.overhead, { id: newRowId(), label: 'New category', basis: 'pct', value: 0 }] })}>
                + Add category
              </button>
            </td>
          </tr>
          <tr className="fw-semibold">
            <td>Non-billable subtotal</td>
            <td className="text-end">{fmtHours(nbWeek)}</td>
            <td className="text-end">{fmtHours(nbYear)}</td>
            <td className="text-end">{fmtPct(nbPct, 2)}</td>
            <td />
          </tr>
          <tr className="table-primary fw-semibold">
            <td>Project Billable</td>
            <td className="text-end">{fmtHours(billable.hoursPerWeek)}</td>
            <td className="text-end">{fmtHours(billable.hoursPerYear)}</td>
            <td className="text-end">{fmtPct(billable.pct, 2)}</td>
            <td />
          </tr>
          <tr className="fw-bold">
            <td>Total</td>
            <td className="text-end">{fmtHours(result.total.hoursPerWeek)}</td>
            <td className="text-end">{fmtHours(result.total.hoursPerYear)}</td>
            <td className="text-end">{fmtPct(result.total.pct, 2)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      {Object.values(errors.rows ?? {}).map((m) => (
        <div key={m} className="text-danger small">
          {m}
        </div>
      ))}
      <div className="form-text">Type into any column of a row; the other two update. The column you typed in (underlined) stays fixed if your schedule changes.</div>
    </div>
  )
}
