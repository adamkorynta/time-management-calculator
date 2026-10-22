import { useMemo, useState } from 'react'
import AllocationDonut from './components/AllocationDonut'
import BillableGauge from './components/BillableGauge'
import PaceBadge from './components/PaceBadge'
import PlanCard from './components/PlanCard'
import StatusCard from './components/StatusCard'
import TargetsCard from './components/TargetsCard'
import { computePlan, computeRemaining, DEFAULT_PLAN, DEFAULT_STATUS, resolveStatus } from './lib/calc'
import type { PlanInputs, StatusInputs } from './lib/calc'
import { PPL_TABLE } from './lib/pplTable'
import { decodeShare, shareUrl } from './lib/share'
import { normalizePlan, readLegacyPlan } from './lib/plan'
import { usePersistentState } from './lib/usePersistentState'
import { validateInputs } from './lib/validate'
import { buildXlsx, downloadBlob } from './lib/xlsx'

// Read a shared link once at startup, then clean the hash so reloads use saved state.
const shared = decodeShare(window.location.hash)
if (shared) window.history.replaceState(null, '', window.location.pathname + window.location.search)

export default function App() {
  const [plan, setPlan] = usePersistentState<PlanInputs>('tmc.plan.v2', DEFAULT_PLAN, shared?.plan, { normalize: normalizePlan, legacy: readLegacyPlan('tmc.plan.v1') })
  const [status, setStatus] = usePersistentState<StatusInputs>('tmc.status.v1', DEFAULT_STATUS, shared?.status)
  const [{ tierIdx }, setUi] = usePersistentState('tmc.ui.v1', { tierIdx: 3 }, shared ? { tierIdx: shared.tierIdx } : null)
  const [notice, setNotice] = useState<string | null>(shared ? 'Loaded inputs from a shared link. They are now saved in this browser.' : null)

  const effective = useMemo(() => resolveStatus(plan, status), [plan, status])
  const asOf = effective.asOf
  const planResult = useMemo(() => computePlan(plan), [plan])
  const remaining = useMemo(() => computeRemaining(plan, effective), [plan, effective])
  const errors = useMemo(() => validateInputs(plan, effective), [plan, effective])

  const flash = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 4000)
  }

  const copyLink = async () => {
    const url = shareUrl({ plan, status: effective, tierIdx })
    try {
      await navigator.clipboard.writeText(url)
      flash('Share link copied to the clipboard.')
    } catch {
      window.prompt('Copy this share link:', url)
    }
  }

  const exportXlsx = async () => {
    downloadBlob(await buildXlsx(plan, effective, planResult, remaining), `time-management-calculator-${asOf}.xlsx`)
  }

  return (
    <>
      <nav className="navbar navbar-dark bg-primary mb-4">
        <div className="container-xl">
          <span className="navbar-brand mb-0 h1">Annual Plan Time Management Calculator</span>
          <div className="d-flex gap-2 flex-wrap no-print">
            <button className="btn btn-sm btn-outline-light" onClick={copyLink} title="Copy a link that contains all of your inputs">
              Copy share link
            </button>
            <button className="btn btn-sm btn-outline-light" onClick={() => window.print()} title="Opens the print dialog; choose 'Save as PDF'">
              Print / PDF
            </button>
            <button className="btn btn-sm btn-outline-light" onClick={exportXlsx} title="Download an Excel workbook with your inputs and live formulas">
              Download .xlsx
            </button>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => {
                if (confirm('Reset all inputs to the workbook defaults?')) {
                  setPlan(DEFAULT_PLAN)
                  setStatus(DEFAULT_STATUS)
                  setUi({ tierIdx: 3 })
                }
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </nav>

      <main className="container-xl pb-5">
        {notice && (
          <div className="alert alert-info py-2 no-print" role="status">
            {notice}
          </div>
        )}
        <p className="text-body-secondary no-print">
          Set your weekly schedule and PPL, allocate your time, then enter year-to-date numbers from your utilization report to see the billable target you need for the rest of the year. Inputs are saved in this browser only.{' '}
          <span className="text-nowrap">
            <span className="legend-swatch" style={{ background: 'var(--input-bg)' }} /> green = you enter it
          </span>
          {' · '}
          <span className="text-nowrap">
            <span className="legend-swatch" style={{ background: '#e9ecef' }} /> gray = calculated
          </span>
        </p>
        <p className="print-only">
          Status as of {asOf} · {plan.hoursPerWeek} h/week
        </p>
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <PlanCard plan={plan} result={planResult} errors={errors} tierIdx={tierIdx} onTierChange={(i) => setUi({ tierIdx: i })} onChange={(p) => setPlan((s) => ({ ...s, ...p }))} />
          </div>
          <div className="col-lg-6">
            <StatusCard status={status} effective={effective} hoursPerWeek={plan.hoursPerWeek} result={remaining} errors={errors} onChange={(p) => setStatus((s) => ({ ...s, ...p }))} />
          </div>
        </div>

        <div className="row g-4 mb-4 avoid-break">
          <div className="col-lg-7">
            <div className="card h-100">
              <div className="card-header fw-semibold">Annual time allocation</div>
              <div className="card-body">
                <AllocationDonut plan={planResult} />
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card h-100">
              <div className="card-header fw-semibold">YTD billable vs. target</div>
              <div className="card-body text-center">
                <BillableGauge actual={status.ytdBillablePct} target={plan.billablePct} pace={remaining.pace} />
                <div className="mt-2">
                  <PaceBadge result={remaining} />
                </div>
                <div className="small text-body-secondary mt-2">Gold tick = original target ({(plan.billablePct * 100).toFixed(0)}%)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 avoid-break">
          <TargetsCard plan={plan} status={effective} result={remaining} errors={errors} onChange={(p) => setStatus((s) => ({ ...s, ...p }))} />
        </div>

        <details className="card no-print">
          <summary className="card-header fw-semibold">PPL accrual table (reference)</summary>
          <div className="card-body table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th rowSpan={2}>Years at GEI + prior work credit</th>
                  <th colSpan={3} className="text-center">
                    40 hr/week staff
                  </th>
                  <th colSpan={2} className="text-center">
                    30 – 39 hr/week staff
                  </th>
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
