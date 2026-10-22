import type { RemainingResult } from '../lib/calc'
import { fmtHours1 } from '../lib/format'

const STYLE = { ahead: 'text-bg-success', onPace: 'text-bg-primary', atRisk: 'text-bg-warning', behind: 'text-bg-danger' } as const
const TEXT = { ahead: 'Ahead of pace', onPace: 'On pace', atRisk: 'At risk', behind: 'Behind pace' } as const

export default function PaceBadge({ result }: { result: RemainingResult }) {
  const pts = result.paceDeltaPct * 100
  const sign = pts > 0 ? '+' : ''
  return (
    <span
      className={`badge ${STYLE[result.pace]} fs-6 fw-normal`}
      title="Compares YTD billable % with your original target. Within 5 points is fine, 5–10 points under is at risk, more than 10 under is behind."
    >
      {TEXT[result.pace]} · {sign}
      {pts.toFixed(1)} pts ({result.paceDeltaHours > 0 ? '+' : ''}
      {fmtHours1(result.paceDeltaHours)} h)
    </span>
  )
}
