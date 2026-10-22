import type { RemainingResult, StatusInputs } from '../lib/calc'
import { fmtHours, fmtHours1, fmtPct } from '../lib/format'
import type { FieldErrors } from '../lib/validate'
import NumField from './NumField'

interface Props {
  status: StatusInputs
  /** As-of date actually in effect (today when auto). */
  asOf: string
  result: RemainingResult
  errors: FieldErrors
  onChange: (patch: Partial<StatusInputs>) => void
}

export default function StatusCard({ status, asOf, result, errors, onChange }: Props) {
  const breakdownOff = Math.abs(result.ytdBreakdownPct - result.ytdNonBillablePct) > 0.0051

  return (
    <div className="card h-100">
      <div className="card-header fw-semibold">2 · Status update (from your utilization report)</div>
      <div className="card-body">
        <div className="mb-3">
          <label htmlFor="asof" className="form-label mb-1">
            Status update as of
            <span className="tip ms-1" title="The date your utilization numbers are current through. Defaults to today; turn off to enter a report date." tabIndex={0} role="img" aria-label="Help">
              ⓘ
            </span>
          </label>
          <div className="input-group">
            <input id="asof" type="date" className="form-control" value={asOf} disabled={status.asOfAuto} onChange={(e) => e.target.value && onChange({ asOf: e.target.value })} />
            <div className="input-group-text">
              <input id="asof-auto" className="form-check-input mt-0 me-2" type="checkbox" checked={status.asOfAuto} onChange={(e) => onChange({ asOfAuto: e.target.checked, asOf: e.target.checked ? status.asOf : asOf })} />
              <label htmlFor="asof-auto" className="mb-0">
                Use today
              </label>
            </div>
          </div>
          {result.weeksRemaining !== null && (
            <div className="form-text">
              {fmtHours1(result.weeksRemaining)} calendar weeks left in the year
              {result.expectedYtdHours !== null && <> · a full-time schedule would be ~{fmtHours(result.expectedYtdHours)} h YTD by this date</>}
            </div>
          )}
        </div>
        <div className="row">
          <div className="col-sm-6">
            <NumField label="YTD Total Hours" unit="h" highlight error={errors.ytdTotalHours} tip="Total regular hours recorded year to date (utilization report 'Reg Hours', YTD row)." value={status.ytdTotalHours} onChange={(v) => onChange({ ytdTotalHours: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="YTD Billable Total" unit="pct" max={100} highlight error={errors.ytdBillablePct} tip="Year-to-date billable ('Chargeable') % from your utilization report." value={status.ytdBillablePct} onChange={(v) => onChange({ ytdBillablePct: v })} help={`${fmtHours(result.ytdBillableHours)} billable hours`} />
          </div>
        </div>
        <p className="mb-3">
          <span className="text-body-secondary">YTD Non-billable Total:</span> <strong>{fmtPct(result.ytdNonBillablePct)}</strong>{' '}
          <span className="text-body-secondary">({fmtHours(result.ytdNonBillableHours)} h, calculated as 100% − billable)</span>
        </p>
        <div className="row">
          <div className="col-sm-4">
            <NumField label="YTD PPL" unit="pct" max={100} highlight error={errors.ytdPplPct} tip="Reference only: YTD PPL % from your report." value={status.ytdPplPct} onChange={(v) => onChange({ ytdPplPct: v })} />
          </div>
          <div className="col-sm-4">
            <NumField label="YTD Admin" unit="pct" max={100} highlight error={errors.ytdAdminPct} tip="Reference only: YTD Admin % from your report." value={status.ytdAdminPct} onChange={(v) => onChange({ ytdAdminPct: v })} />
          </div>
          <div className="col-sm-4">
            <NumField label="YTD BD" unit="pct" max={100} highlight error={errors.ytdBdPct} tip="Reference only: YTD business development % from your report." value={status.ytdBdPct} onChange={(v) => onChange({ ytdBdPct: v })} />
          </div>
        </div>
        <p className="form-text mb-2">As in the original workbook, only YTD Total Hours and YTD Billable % drive the calculation; PPL, Admin and BD are for reference.</p>
        {breakdownOff && (
          <div className="alert alert-warning py-2" role="status">
            PPL + Admin + BD = {fmtPct(result.ytdBreakdownPct)}, which differs from the non-billable total of {fmtPct(result.ytdNonBillablePct)}.
          </div>
        )}

        <h6 className="mt-3">Remainder of the year</h6>
        <div className="row">
          <div className="col-sm-6">
            <NumField label="Est. PPL hours remaining" unit="h" error={errors.plannedPplRemaining} tip="PPL hours you expect to take between now and year end. Reduces the hours you can bill." value={status.plannedPplRemaining} onChange={(v) => onChange({ plannedPplRemaining: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="Est. holiday hours remaining" unit="h" error={errors.plannedHolidayRemaining} tip="Company holiday hours left this year (8 h per holiday)." help={`${status.plannedHolidayRemaining / 8} holiday day(s)`} value={status.plannedHolidayRemaining} onChange={(v) => onChange({ plannedHolidayRemaining: v })} />
          </div>
        </div>
      </div>
    </div>
  )
}
