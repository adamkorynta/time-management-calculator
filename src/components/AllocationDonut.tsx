import type { PlanResult } from '../lib/calc'
import { allocationStatus } from '../lib/calc'
import { fmtHours, fmtPct } from '../lib/format'

const COLORS: Record<string, string> = {
  holiday: '#899da7',
  ppl: '#54bbff',
  meetings: '#ecb83c',
  billable: '#007390',
  bd: '#b0122a',
  profdev: '#bb9e87',
  practice: '#003e53',
  unallocated: '#e3ded3',
}

const R = 70
const C = 2 * Math.PI * R

export default function AllocationDonut({ plan }: { plan: PlanResult }) {
  const status = allocationStatus(plan)
  const unallocated = Math.max(0, plan.unallocatedHours)
  // If over-allocated, scale to the allocated total so the ring still closes.
  const denom = Math.max(plan.hoursPerYear, plan.total.hoursPerYear) || 1
  const slices = [
    ...plan.rows.map((r) => ({ key: r.key, label: r.label, hours: r.hoursPerYear })),
    { key: 'unallocated', label: 'Unallocated', hours: status === 'balanced' ? 0 : unallocated },
  ].filter((s) => s.hours > 0)

  let offset = 0
  const arcs = slices.map((s) => {
    const len = (s.hours / denom) * C
    const arc = { ...s, len, offset }
    offset += len
    return arc
  })
  const summary = slices.map((s) => `${s.label} ${fmtHours(s.hours)} hours`).join(', ')

  return (
    <div className="row align-items-center g-3">
      <div className="col-sm-5 text-center">
        <svg viewBox="0 0 200 200" role="img" aria-label={`Annual time allocation: ${summary}`} className="donut">
          <g transform="rotate(-90 100 100)">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#f1eee7" strokeWidth="28" />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={COLORS[a.key]}
                strokeWidth="28"
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={-a.offset}
              >
                <title>{`${a.label}: ${fmtHours(a.hours)} h (${fmtPct(a.hours / plan.hoursPerYear)})`}</title>
              </circle>
            ))}
          </g>
          <text x="100" y="96" textAnchor="middle" className="donut-big">
            {fmtPct(plan.total.pct, 1)}
          </text>
          <text x="100" y="116" textAnchor="middle" className="donut-small">
            of {fmtHours(plan.hoursPerYear)} h allocated
          </text>
        </svg>
        {status === 'over' && <div className="badge text-bg-danger mt-1">Over-allocated</div>}
      </div>
      <div className="col-sm-7">
        <ul className="list-unstyled mb-0 legend">
          {[...plan.rows.map((r) => ({ key: r.key, label: r.label, hours: r.hoursPerYear })), { key: 'unallocated', label: 'Unallocated', hours: unallocated }].map((s) => (
            <li key={s.key} className="d-flex align-items-center gap-2">
              <span className="swatch" style={{ background: COLORS[s.key] }} />
              <span className="flex-grow-1">{s.label}</span>
              <span className="text-nowrap">
                {fmtHours(s.hours)} h · {fmtPct(s.hours / plan.hoursPerYear)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
