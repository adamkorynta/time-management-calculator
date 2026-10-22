import type { PlanInputs, RemainingResult, StatusInputs } from '../lib/calc'
import { fmtHours, fmtPct } from '../lib/format'
import NumField from './NumField'
import PaceBadge from './PaceBadge'
import type { FieldErrors } from '../lib/validate'

interface Props {
  plan: PlanInputs
  status: StatusInputs
  result: RemainingResult
  errors: FieldErrors
  onChange: (patch: Partial<StatusInputs>) => void
}

export default function TargetsCard({ plan, status, result, errors, onChange }: Props) {
  const r = result
  const infeasible = r.targetStatus === 'impossible'
  const met = r.targetStatus === 'met'
  const headline = infeasible
    ? r.revisedBillablePct === null
      ? 'Not achievable'
      : `${fmtPct(r.revisedBillablePct)} — not achievable`
    : met
      ? 'Target already met'
      : fmtPct(r.revisedBillablePct)

  return (
    <div className="card">
      <div className="card-header fw-semibold">3 · Revised targets for the remainder of the year</div>
      <div className="card-body">
        <div className="mb-3">
          <PaceBadge result={r} />
        </div>
        {infeasible && (
          <div className="alert alert-danger" role="alert">
            <strong>Target not achievable.</strong>{' '}
            {r.workableHoursRemaining <= 0
              ? 'No workable hours remain after planned PPL and holiday.'
              : `You need ${fmtHours(r.billableHoursStillNeeded)} more billable hours but only ${fmtHours(r.workableHoursRemaining)} workable hours remain (${fmtPct(r.revisedBillablePct)} billable required).`}{' '}
            Even at 100% billable for the rest of the year you would finish at {fmtPct(r.maxYearEndBillablePct)} — {fmtHours(r.shortfallHours)} hours short of your {fmtPct(r.originalBillablePct, 0)} target. Consider lowering the original target, or reducing planned PPL.
          </div>
        )}
        {met && (
          <div className="alert alert-success" role="status">
            <strong>You've already met your {fmtPct(r.originalBillablePct, 0)} target</strong> ({fmtHours(-r.billableHoursStillNeeded)} hours ahead); any billable % for the rest of the year keeps you at or above it.
          </div>
        )}
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
            <div className={`border rounded p-2 h-100 ${infeasible ? 'border-danger border-2' : 'border-primary'}`}>
              <div className="text-body-secondary small">Revised target billable %</div>
              <div className={`${infeasible || met ? 'fs-5' : 'fs-4'} fw-bold ${infeasible ? 'text-danger' : 'text-primary'}`}>{headline}</div>
              <div className="small text-body-secondary">{infeasible || met ? '' : `${fmtHours(r.revisedBillableHoursPerWeek)} h/week`}&nbsp;</div>
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
                  <NumField label="What-if billable %" unit="pct" max={100} error={errors.adjustedBillablePct} tip="What-if: the billable % you expect to average for the rest of the year. The year-end result below updates live." value={status.adjustedBillablePct} onChange={(v) => onChange({ adjustedBillablePct: v })} />
                </td>
              </tr>
              <tr>
                <th scope="row">Revised target billable hours per week</th>
                <td className="text-end">{infeasible ? '—' : fmtHours(r.revisedBillableHoursPerWeek)}</td>
                <td className="text-end">{fmtHours(r.adjustedBillableHoursPerWeek)}</td>
              </tr>
              <tr>
                <th scope="row">Revised target non-billable %</th>
                <td className="text-end">{infeasible ? '—' : fmtPct(r.revisedNonBillablePct, 2)}</td>
                <td className="text-end">{fmtPct(r.adjustedNonBillablePct, 2)}</td>
              </tr>
              <tr>
                <th scope="row">Revised target non-billable hours per week</th>
                <td className="text-end">{infeasible ? '—' : fmtHours(r.revisedNonBillableHoursPerWeek)}</td>
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
