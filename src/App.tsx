import { useMemo } from 'react'
import PlanCard from './components/PlanCard'
import StatusCard from './components/StatusCard'
import TargetsCard from './components/TargetsCard'
import { computePlan, computeRemaining, DEFAULT_PLAN, DEFAULT_STATUS } from './lib/calc'
import type { PlanInputs, StatusInputs } from './lib/calc'
import { PPL_TABLE } from './lib/pplTable'
import { usePersistentState } from './lib/usePersistentState'

export default function App() {
  const [plan, setPlan] = usePersistentState<PlanInputs>('tmc.plan.v1', DEFAULT_PLAN)
  const [status, setStatus] = usePersistentState<StatusInputs>('tmc.status.v1', DEFAULT_STATUS)

  const planResult = useMemo(() => computePlan(plan), [plan])
  const remaining = useMemo(() => computeRemaining(plan, status), [plan, status])

  return (
    <>
      <nav className="navbar navbar-dark bg-primary mb-4">
        <div className="container-xl">
          <span className="navbar-brand mb-0 h1">Annual Plan Time Management Calculator</span>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={() => {
              if (confirm('Reset all inputs to the workbook defaults?')) {
                setPlan(DEFAULT_PLAN)
                setStatus(DEFAULT_STATUS)
              }
            }}
          >
            Reset
          </button>
        </div>
      </nav>

      <main className="container-xl pb-5">
        <p className="text-body-secondary">
          Set your weekly schedule and PPL, allocate your time, then enter year-to-date numbers from your utilization report (green boxes) to see the billable target you need for the rest of the year. Inputs are saved in this browser only.
        </p>
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <PlanCard plan={plan} result={planResult} onChange={(p) => setPlan((s) => ({ ...s, ...p }))} />
          </div>
          <div className="col-lg-6">
            <StatusCard status={status} result={remaining} onChange={(p) => setStatus((s) => ({ ...s, ...p }))} />
          </div>
        </div>
        <div className="mb-4">
          <TargetsCard plan={plan} status={status} result={remaining} onChange={(p) => setStatus((s) => ({ ...s, ...p }))} />
        </div>

        <details className="card">
          <summary className="card-header fw-semibold">PPL accrual table (reference)</summary>
          <div className="card-body table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th rowSpan={2}>Years at GEI + prior work credit</th>
                  <th colSpan={3} className="text-center">40 hr/week staff</th>
                  <th colSpan={2} className="text-center">30 – 39 hr/week staff</th>
                </tr>
                <tr>
                  <th className="text-end">Days/yr</th>
                  <th className="text-end">Hrs/yr</th>
                  <th className="text-end">Hrs/day*</th>
                  <th className="text-end">Hrs/yr</th>
                  <th className="text-end">Hrs/day*</th>
                </tr>
              </thead>
              <tbody>
                {PPL_TABLE.map((t) => (
                  <tr key={t.label}>
                    <td>{t.label}</td>
                    <td className="text-end">{t.daysPerYear}</td>
                    <td className="text-end">{t.hoursPerYear}</td>
                    <td className="text-end">{(t.hoursPerYear / 52 / 5).toFixed(2)}</td>
                    <td className="text-end">{t.hoursPerYearPartTime}</td>
                    <td className="text-end">{(t.hoursPerYearPartTime / 52 / 5).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="form-text mb-0">* Hours per day accrued per working day (hrs/yr ÷ 52 ÷ 5).</p>
          </div>
        </details>
      </main>
    </>
  )
}
