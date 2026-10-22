import { usePersistentState } from '../lib/usePersistentState'
import { PPL_TABLE, pplForTier } from '../lib/pplTable'
import { allocationStatus } from '../lib/calc'
import type { PlanInputs, PlanResult } from '../lib/calc'
import { fmtHours, fmtPct } from '../lib/format'
import NumField from './NumField'

interface Props {
  plan: PlanInputs
  result: PlanResult
  onChange: (patch: Partial<PlanInputs>) => void
}

export default function PlanCard({ plan, result, onChange }: Props) {
  const [{ tierIdx }, setUi] = usePersistentState('tmc.ui.v1', { tierIdx: 3 })
  const suggested = pplForTier(PPL_TABLE[tierIdx] ?? PPL_TABLE[0], plan.hoursPerWeek)
  const status = allocationStatus(result)

  return (
    <div className="card h-100">
      <div className="card-header fw-semibold">1 · Annual plan</div>
      <div className="card-body">
        <div className="row">
          <div className="col-sm-6">
            <NumField label="Schedule (hours/week)" unit="h" value={plan.hoursPerWeek} onChange={(v) => onChange({ hoursPerWeek: v })} help={`= ${fmtHours(result.hoursPerYear)} hours/year`} />
          </div>
          <div className="col-sm-6">
            <NumField label="PPL (hours/year)" unit="h" value={plan.pplHoursPerYear} onChange={(v) => onChange({ pplHoursPerYear: v })} help="Pick from the table below" />
          </div>
        </div>

        <div className="input-group input-group-sm mb-3">
          <span className="input-group-text">Years at GEI + prior credit</span>
          <select className="form-select" value={tierIdx} onChange={(e) => setUi({ tierIdx: Number(e.target.value) })} aria-label="Years of service tier">
            {PPL_TABLE.map((t, i) => (
              <option key={t.label} value={i}>
                {t.label}
              </option>
            ))}
          </select>
          <button className="btn btn-outline-primary" disabled={suggested === null} onClick={() => suggested !== null && onChange({ pplHoursPerYear: suggested })}>
            {suggested === null ? 'No table (<30 h/wk)' : `Use ${suggested} h`}
          </button>
        </div>

        <h6 className="mt-4">Time allocation</h6>
        <div className="row">
          <div className="col-sm-6">
            <NumField label="Company/Office/Group Meetings (h/week)" unit="h" value={plan.meetingsHoursPerWeek} onChange={(v) => onChange({ meetingsHoursPerWeek: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="Project Billable" unit="pct" max={100} value={plan.billablePct} onChange={(v) => onChange({ billablePct: v })} help="Set with your supervisor" />
          </div>
          <div className="col-sm-6">
            <NumField label="Business Development" unit="pct" max={100} value={plan.businessDevPct} onChange={(v) => onChange({ businessDevPct: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="Professional Development/Training" unit="pct" max={100} value={plan.profDevPct} onChange={(v) => onChange({ profDevPct: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="Practice Development/Leadership" unit="pct" max={100} value={plan.practiceDevPct} onChange={(v) => onChange({ practiceDevPct: v })} />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle mb-2">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-end">Hours/week</th>
                <th className="text-end">Hours/year</th>
                <th className="text-end">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.key} className={r.key === 'billable' ? 'table-primary fw-semibold' : ''}>
                  <td>{r.label}</td>
                  <td className="text-end">{fmtHours(r.hoursPerWeek)}</td>
                  <td className="text-end">{fmtHours(r.hoursPerYear)}</td>
                  <td className="text-end">{fmtPct(r.pct, 2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fw-bold">
                <td>Total</td>
                <td className="text-end">{fmtHours(result.total.hoursPerWeek)}</td>
                <td className="text-end">{fmtHours(result.total.hoursPerYear)}</td>
                <td className="text-end">{fmtPct(result.total.pct, 2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {status === 'balanced' ? (
          <div className="text-success small" role="status">
            ✓ Fully allocated (within ±0.5% of {fmtHours(result.hoursPerYear)} h).
          </div>
        ) : (
          <div className={`alert ${status === 'over' ? 'alert-danger' : 'alert-warning'} py-2 mb-0`} role="status">
            {status === 'over'
              ? `Over-allocated by ${fmtHours(-result.unallocatedHours)} hours/year.`
              : `${fmtHours(result.unallocatedHours)} hours/year (${fmtHours(result.unallocatedHours / 52)} h/week) are not allocated.`}
          </div>
        )}
      </div>
    </div>
  )
}
