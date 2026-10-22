import type { PlanResult } from '../lib/calc'
import { allocationStatus } from '../lib/calc'
import { fmtHours, fmtPct } from '../lib/format'

/** The summary shows the major splits only; the full per-row detail lives in the plan table. */
const GROUPS = [
  { key: 'leave', label: 'PPL + Holiday', color: '#899da7' },
  { key: 'billable', label: 'Billable', color: '#007390' },
  { key: 'bd', label: 'Business Development', color: '#b0122a' },
  { key: 'other', label: 'Other overhead', color: '#ecb83c' },
  { key: 'unallocated', label: 'Unallocated', color: '#e3ded3' },
] as const

const R = 70
const C = 2 * Math.PI * R

export default function AllocationDonut({ plan }: { plan: PlanResult }) {
  const status = allocationStatus(plan)
  const sum = (pred: (r: PlanResult['rows'][number]) => boolean) => plan.rows.filter(pred).reduce((t, r) => t + r.hoursPerYear, 0)
  const hours: Record<(typeof GROUPS)[number]['key'], number> = {
    leave: sum((r) => r.group === 'fixed'),
    billable: sum((r) => r.group === 'billable'),
    bd: sum((r) => r.key === 'bd'),
    other: sum((r) => r.group === 'overhead' && r.key !== 'bd'),
    unallocated: Math.max(0, plan.unallocatedHours),
  }
  // If over-allocated, scale to the allocated total so the ring still closes.
  const denom = Math.max(plan.hoursPerYear, plan.total.hoursPerYear) || 1
  const slices = GROUPS.map((g) => ({ ...g, hours: g.key === 'unallocated' && status === 'balanced' ? 0 : hours[g.key] })).filter((s) => s.hours > 0)

  const arcs = slices.map((s, i) => ({
    ...s,
    len: (s.hours / denom) * C,
    offset: slices.slice(0, i).reduce((t, x) => t + (x.hours / denom) * C, 0),
  }))
  const summary = slices.map((s) => `${s.label} ${fmtHours(s.hours)} hours`).join(', ')

  return (
    <div className="row align-items-center g-3">
      <div className="col-sm-5 text-center">
        <svg viewBox="0 0 200 200" role="img" aria-label={`Annual time allocation: ${summary}`} className="donut">
          <g transform="rotate(-90 100 100)">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#f1eee7" strokeWidth="28" />
            {arcs.map((a) => (
              <circle key={a.key} cx="100" cy="100" r={R} fill="none" stroke={a.color} strokeWidth="28" strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={-a.offset}>
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
          {GROUPS.map((g) => (
            <li key={g.key} className="d-flex align-items-center gap-2">
              <span className="swatch" style={{ background: g.color }} />
              <span className="flex-grow-1">{g.label}</span>
              <span className="text-nowrap">
                {fmtHours(hours[g.key])} h · {fmtPct(hours[g.key] / plan.hoursPerYear)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
