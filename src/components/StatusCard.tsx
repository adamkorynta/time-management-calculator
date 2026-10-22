import type { RemainingResult, StatusInputs } from '../lib/calc'
import { fmtHours, fmtHours1, fmtPct } from '../lib/format'
import type { FieldErrors } from '../lib/validate'
import { workWeeksElapsed } from '../lib/dates'
import { HOLIDAY_HOURS, remainingHolidays } from '../lib/holidays'
import NumField from './NumField'

interface Props {
  status: StatusInputs
  /** Status with the auto switches applied (as-of date and YTD hours actually used). */
  effective: StatusInputs
  hoursPerWeek: number
  result: RemainingResult
  errors: FieldErrors
  onChange: (patch: Partial<StatusInputs>) => void
}

export default function StatusCard({ status, effective, hoursPerWeek, result, errors, onChange }: Props) {
  const asOf = effective.asOf
  const workWeeks = workWeeksElapsed(asOf)
  const holidaysLeft = remainingHolidays(asOf)
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
            </div>
          )}
        </div>
        <div className="row">
          <div className="col-sm-6">
            <NumField
              label="YTD Total Hours"
              unit="h"
              highlight={!status.ytdHoursAuto}
              disabled={status.ytdHoursAuto}
              error={errors.ytdTotalHours}
              tip="Total regular hours year to date (utilization report 'Reg Hours', YTD row). By default estimated as completed work weeks × your weekly schedule; untick to type the actual number."
              value={effective.ytdTotalHours}
              onChange={(v) => onChange({ ytdTotalHours: v })}
              help={status.ytdHoursAuto && workWeeks !== null ? `${workWeeks} work weeks × ${hoursPerWeek} h` : undefined}
            />
            <div className="form-check mb-3">
              <input
                id="ytd-auto"
                className="form-check-input"
                type="checkbox"
                checked={status.ytdHoursAuto}
                onChange={(e) => onChange({ ytdHoursAuto: e.target.checked, ytdTotalHours: e.target.checked ? status.ytdTotalHours : effective.ytdTotalHours })}
              />
              <label htmlFor="ytd-auto" className="form-check-label small">
                Estimate from date &amp; schedule
              </label>
            </div>
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
            <NumField
              label="Est. holidays remaining"
              unit="days"
              step={1}
              disabled={status.holidayAuto}
              error={errors.plannedHolidayRemaining}
              tip="Whole company holidays left this year (no partial days; each is 8 h). By default taken from GEI's holiday calendar after the as-of date, plus the floating holiday if you have not used it."
              help={`= ${effective.plannedHolidayRemaining} h`}
              value={effective.plannedHolidayRemaining / HOLIDAY_HOURS}
              onChange={(days) => onChange({ plannedHolidayRemaining: Math.max(0, Math.round(days)) * HOLIDAY_HOURS })}
            />
          </div>
        </div>
        <div className="form-text mb-2">
          {result.pplUnusedHours >= 0 ? (
            <>
              PPL: {fmtHours(result.pplUnusedHours + result.pplUsedYtdHours)} h accrued for the year − {fmtHours1(result.pplUsedYtdHours)} h used YTD ({fmtPct(status.ytdPplPct)} of {fmtHours(effective.ytdTotalHours)} h) ={' '}
              <strong>{fmtHours1(result.pplUnusedHours)} h still unused</strong> (excludes any carryover).{' '}
              <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => onChange({ plannedPplRemaining: Math.round(result.pplUnusedHours * 10) / 10 })}>
                Use {fmtHours1(result.pplUnusedHours)} h
              </button>
            </>
          ) : (
            <>
              PPL used YTD ({fmtHours1(result.pplUsedYtdHours)} h) already exceeds the annual accrual by <strong>{fmtHours1(-result.pplUnusedHours)} h</strong> (carryover not included).
            </>
          )}
        </div>
        <div className="form-check">
          <input
            id="holiday-auto"
            className="form-check-input"
            type="checkbox"
            checked={status.holidayAuto}
            onChange={(e) => onChange({ holidayAuto: e.target.checked, plannedHolidayRemaining: e.target.checked ? status.plannedHolidayRemaining : effective.plannedHolidayRemaining })}
          />
          <label htmlFor="holiday-auto" className="form-check-label small">
            Estimate holidays from the GEI calendar
          </label>
        </div>
        {status.holidayAuto && (
          <>
            <div className="form-check">
              <input id="floating-used" className="form-check-input" type="checkbox" checked={status.floatingUsed} onChange={(e) => onChange({ floatingUsed: e.target.checked })} />
              <label htmlFor="floating-used" className="form-check-label small">
                Floating holiday already used this year
              </label>
            </div>
            <div className="form-text">
              Remaining: {holidaysLeft.length ? holidaysLeft.map((h) => `${h.name} (${h.date.slice(5)})`).join(', ') : 'no fixed holidays'}
              {status.floatingUsed ? '' : ' + floating holiday'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
