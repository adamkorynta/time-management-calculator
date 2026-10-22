import type { RemainingResult } from '../lib/calc'
import { fmtPct } from '../lib/format'

const CX = 100
const CY = 100
const R = 80

/** Point on the semicircle for a 0–1 fraction (0 = left end, 1 = right end). */
const pt = (f: number, r = R) => {
  const t = Math.PI * (1 - f)
  return { x: CX + r * Math.cos(t), y: CY - r * Math.sin(t) }
}
const arc = (from: number, to: number) => {
  const a = pt(from)
  const b = pt(to)
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`
}

const FILL = { ahead: '#007390', onPace: '#003e53', atRisk: '#ecb83c', behind: '#b0122a' } as const

interface Props {
  actual: number
  target: number
  pace: RemainingResult['pace']
}

/** Semicircle gauge of YTD billable % with the original target as a tick. */
export default function BillableGauge({ actual, target, pace }: Props) {
  const f = Math.min(Math.max(actual, 0), 1)
  const t = Math.min(Math.max(target, 0), 1)
  const tickIn = pt(t, R - 20)
  const tickOut = pt(t, R + 10)
  const label = pt(t, R + 20)

  return (
    <svg
      viewBox="0 0 200 135"
      role="img"
      aria-label={`YTD billable ${fmtPct(actual)} against a target of ${fmtPct(target)}`}
      className="gauge"
    >
      <path d={arc(0, 1)} fill="none" stroke="#e3ded3" strokeWidth="18" strokeLinecap="butt" />
      {f > 0 && <path d={arc(0, f)} fill="none" stroke={FILL[pace]} strokeWidth="18" strokeLinecap="butt" />}
      <line x1={tickIn.x} y1={tickIn.y} x2={tickOut.x} y2={tickOut.y} stroke="#ecb83c" strokeWidth="3.5">
        <title>{`Original target ${fmtPct(target)}`}</title>
      </line>
      <text x={label.x} y={label.y} textAnchor="middle" className="gauge-tick">
        {fmtPct(target, 0)}
      </text>
      <text x={CX} y="94" textAnchor="middle" className="donut-big">
        {fmtPct(actual)}
      </text>
      <text x={CX} y="112" textAnchor="middle" className="donut-small">
        YTD billable
      </text>
      <text x={pt(0).x} y="122" textAnchor="middle" className="donut-small">
        0%
      </text>
      <text x={pt(1).x} y="122" textAnchor="middle" className="donut-small">
        100%
      </text>
    </svg>
  )
}
