import type { RemainingResult, StatusInputs } from '../lib/calc'
import { fmtHours, fmtPct } from '../lib/format'
import NumField from './NumField'

interface Props {
  status: StatusInputs
  result: RemainingResult
  onChange: (patch: Partial<StatusInputs>) => void
}

export default function StatusCard({ status, result, onChange }: Props) {
  const breakdownOff = Math.abs(result.ytdBreakdownPct - status.ytdNonBillablePct) > 0.0051
  const totalOff = Math.abs(status.ytdNonBillablePct + status.ytdBillablePct - 1) > 0.0051

  return (
    <div className="card h-100">
      <div className="card-header fw-semibold">2 · Status update (from your utilization report)</div>
      <div className="card-body">
        <div className="mb-3">
          <label htmlFor="asof" className="form-label mb-1">
            Status update as of
          </label>
          <input id="asof" type="date" className="form-control" value={status.asOf} onChange={(e) => onChange({ asOf: e.target.value })} />
        </div>
        <div className="row">
          <div className="col-sm-6">
            <NumField label="YTD Total Hours" unit="h" highlight value={status.ytdTotalHours} onChange={(v) => onChange({ ytdTotalHours: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="YTD Billable Total" unit="pct" max={100} highlight value={status.ytdBillablePct} onChange={(v) => onChange({ ytdBillablePct: v })} help={`${fmtHours(result.ytdBillableHours)} billable hours`} />
          </div>
          <div className="col-sm-6">
            <NumField label="YTD Non-billable Total" unit="pct" max={100} highlight value={status.ytdNonBillablePct} onChange={(v) => onChange({ ytdNonBillablePct: v })} help={`${fmtHours(result.ytdNonBillableHours)} non-billable hours (total − billable)`} />
          </div>
          <div className="col-sm-6">
            <NumField label="YTD PPL" unit="pct" max={100} highlight value={status.ytdPplPct} onChange={(v) => onChange({ ytdPplPct: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="YTD Admin" unit="pct" max={100} highlight value={status.ytdAdminPct} onChange={(v) => onChange({ ytdAdminPct: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="YTD BD" unit="pct" max={100} highlight value={status.ytdBdPct} onChange={(v) => onChange({ ytdBdPct: v })} />
          </div>
        </div>
        <p className="form-text mb-2">
          As in the original workbook, only YTD Total Hours and YTD Billable % drive the calculation; the other YTD fields are for reference.
        </p>
        {totalOff && (
          <div className="alert alert-warning py-2" role="status">
            Billable ({fmtPct(status.ytdBillablePct)}) + non-billable ({fmtPct(status.ytdNonBillablePct)}) ≠ 100%.
          </div>
        )}
        {breakdownOff && (
          <div className="alert alert-warning py-2" role="status">
            PPL + Admin + BD = {fmtPct(result.ytdBreakdownPct)}, which differs from the non-billable total of {fmtPct(status.ytdNonBillablePct)}.
          </div>
        )}

        <h6 className="mt-3">Remainder of the year</h6>
        <div className="row">
          <div className="col-sm-6">
            <NumField label="Est. PPL hours remaining" unit="h" value={status.plannedPplRemaining} onChange={(v) => onChange({ plannedPplRemaining: v })} />
          </div>
          <div className="col-sm-6">
            <NumField label="Est. holiday hours remaining" unit="h" value={status.plannedHolidayRemaining} onChange={(v) => onChange({ plannedHolidayRemaining: v })} />
          </div>
        </div>
      </div>
    </div>
  )
}
