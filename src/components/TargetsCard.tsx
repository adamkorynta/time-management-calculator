import type { PlanInputs, RemainingResult, StatusInputs } from '../lib/calc'
import { fmtHours, fmtPct } from '../lib/format'
import NumField from './NumField'

interface Props {
  plan: PlanInputs
  status: StatusInputs
  result: RemainingResult
  onChange: (patch: Partial<StatusInputs>) => void
}

export default function TargetsCard({ plan, status, result, onChange }: Props) {
  const r = result
  const infeasible = r.revisedBillablePct === null || r.revisedBillablePct > 1
  const headline =
    r.revisedBillablePct === null
      ? 'No workable hours remain'
      : r.revisedBillablePct > 1
        ? `${fmtPct(r.revisedBillablePct)} — exceeds 100%`
        : fmtPct(r.revisedBillablePct)

  return (
    <div className="card">
      <div className="card-header fw-semibold">3 · Revised targets for the remainder of the year</div>
      <div className="card-body">
        <div className="row g-3 mb-3 text-center">
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 h-100">
              <div className="text-body-secondary small">Total hours remaining</div>
              <div className="fs-4">{fmtHours(r.hoursRemaining)}</div>
              <div className="small text-body-secondary">{fmtHours(r.workableHoursRemaining)} after PPL &amp; holiday</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 h-100">
              <div className="text-body-secondary small">Original target billable</div>
              <div className="fs-4">{fmtPct(r.originalBillablePct)}</div>
              <div className="small text-body-secondary">{fmtHours(r.originalBillableHours)} h</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 h-100">
              <div className="text-body-secondary small">Billable hours still needed</div>
              <div className="fs-4">{fmtHours(r.billableHoursStillNeeded)}</div>
              <div className="small text-body-secondary">{fmtHours(r.ytdBillableHours)} h billed YTD</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className={`border rounded p-2 h-100 ${infeasible ? 'border-danger' : 'border-primary'}`}>
              <div className="text-body-secondary small">Revised target billable %</div>
              <div className={`fs-4 fw-bold ${infeasible ? 'text-danger' : 'text-primary'}`}>{headline}</div>
              <div className="small text-body-secondary">{fmtHours(r.revisedBillableHoursPerWeek)} h/week</div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th />
                <th className="text-end">To hit original target</th>
                <th className="text-end" style={{ minWidth: 180 }}>
                  Adjusted (what-if)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Revised target billable %</th>
                <td className="text-end fw-semibold">{fmtPct(r.revisedBillablePct, 2)}</td>
                <td>
                  <NumField label="Billable %" unit="pct" max={100} highlight value={status.adjustedBillablePct} onChange={(v) => onChange({ adjustedBillablePct: v })} />
                </td>
              </tr>
              <tr>
                <th scope="row">Revised target billable hours per week</th>
                <td className="text-end">{fmtHours(r.revisedBillableHoursPerWeek)}</td>
                <td className="text-end">{fmtHours(r.adjustedBillableHoursPerWeek)}</td>
              </tr>
              <tr>
                <th scope="row">Revised target non-billable %</th>
                <td className="text-end">{fmtPct(r.revisedNonBillablePct, 2)}</td>
                <td className="text-end">{fmtPct(r.adjustedNonBillablePct, 2)}</td>
              </tr>
              <tr>
                <th scope="row">Revised target non-billable hours per week</th>
                <td className="text-end">{fmtHours(r.revisedNonBillableHoursPerWeek)}</td>
                <td className="text-end">{fmtHours(r.adjustedNonBillableHoursPerWeek)}</td>
              </tr>
              <tr className="table-light">
                <th scope="row">Revised year-end billable %</th>
                <td className="text-end">{fmtPct(plan.billablePct, 2)}</td>
                <td className="text-end fw-semibold">{fmtPct(r.yearEndBillablePct, 2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="form-text mb-0">
          Revised % = (original billable hours − YTD billable hours) ÷ (hours remaining − est. PPL − est. holiday). Weekly hours use your {plan.hoursPerWeek}-hour schedule.
        </p>
      </div>
    </div>
  )
}
