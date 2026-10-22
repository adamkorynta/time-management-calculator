import { PPL_TABLE, pplForTier } from '../lib/pplTable'
import { allocationStatus } from '../lib/calc'
import type { PlanInputs, PlanResult } from '../lib/calc'
import { fmtHours } from '../lib/format'
import type { FieldErrors } from '../lib/validate'
import NumField from './NumField'
import OverheadTable from './OverheadTable'

interface Props {
  plan: PlanInputs
  result: PlanResult
  errors: FieldErrors
  tierIdx: number
  onTierChange: (i: number) => void
  onChange: (patch: Partial<PlanInputs>) => void
}

export default function PlanCard({ plan, result, errors, tierIdx, onTierChange, onChange }: Props) {
  const suggested = pplForTier(PPL_TABLE[tierIdx] ?? PPL_TABLE[0], plan.hoursPerWeek)
  const status = allocationStatus(result)
  const annual = result.hoursPerYear
  const billable = result.rows.find((r) => r.key === 'billable')!

  return (
    <div className="card h-100">
      <div className="card-header fw-semibold">1 · Annual plan</div>
      <div className="card-body">
        <div className="row">
          <div className="col-sm-6">
            <NumField label="Schedule (hours/week)" unit="h" value={plan.hoursPerWeek} error={errors.hoursPerWeek} tip="Your standard weekly schedule. Drives annual hours (× 52) and every percentage below." onChange={(v) => onChange({ hoursPerWeek: v })} help={`= ${fmtHours(annual)} hours/year`} />
          </div>
          <div className="col-sm-6">
            <NumField label="PPL (hours/year)" unit="h" value={plan.pplHoursPerYear} error={errors.pplHoursPerYear} tip="Paid personal leave you accrue per year. Look it up from the accrual table with the selector below." onChange={(v) => onChange({ pplHoursPerYear: v })} />
          </div>
        </div>

        <div className="input-group input-group-sm mb-3">
          <span className="input-group-text">Years at GEI + prior credit</span>
          <select className="form-select" value={tierIdx} onChange={(e) => onTierChange(Number(e.target.value))} aria-label="Years of service tier">
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

        <h6 className="mt-4">Project billable target</h6>
        <div className="row">
          <div className="col-sm-4">
            <NumField label="Billable %" unit="pct" max={100} value={plan.billablePct} error={errors.billablePct} tip="Your target share of the annual schedule spent on billable project work, agreed with your supervisor. You can also enter it as hours." onChange={(v) => onChange({ billablePct: v })} />
          </div>
          <div className="col-sm-4">
            <NumField label="Hours/week" unit="h" value={billable.hoursPerWeek} onChange={(v) => onChange({ billablePct: annual > 0 ? (v * 52) / annual : 0 })} />
          </div>
          <div className="col-sm-4">
            <NumField label="Hours/year" unit="h" value={billable.hoursPerYear} onChange={(v) => onChange({ billablePct: annual > 0 ? v / annual : 0 })} />
          </div>
        </div>

        <h6 className="mt-3">Non-billable time</h6>
        <OverheadTable plan={plan} result={result} errors={errors} onChange={onChange} />

        {status === 'balanced' ? (
          <div className="text-success small" role="status">
            ✓ Fully allocated (within ±0.5% of {fmtHours(annual)} h).
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
