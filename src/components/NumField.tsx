import { useId, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  /** 'pct' displays/edits 0–1 values as 0–100. */
  unit?: 'pct' | 'h' | 'none'
  min?: number
  max?: number
  step?: number
  help?: string
  highlight?: boolean
}

const round = (n: number) => String(Math.round(n * 1e6) / 1e6)

/** Number input that keeps its own text draft so typing "0." or clearing the box doesn't fight the model. */
export default function NumField({ label, value, onChange, unit = 'none', min = 0, max, step, help, highlight }: Props) {
  const id = useId()
  const scale = unit === 'pct' ? 100 : 1
  // Text draft exists only while editing, so typing "0." or clearing the box doesn't fight the model.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? round(value * scale)

  const suffix = unit === 'pct' ? '%' : unit === 'h' ? 'h' : null
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label mb-1">
        {label}
      </label>
      <div className="input-group">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={`form-control ${highlight ? 'bg-success-subtle' : ''}`}
          value={shown}
          onBlur={() => setDraft(null)}
          min={min}
          max={max}
          step={step ?? (unit === 'pct' ? 1 : 'any')}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = e.target.valueAsNumber
            onChange(Number.isFinite(n) ? Math.round((n / scale) * 1e9) / 1e9 : 0)
          }}
        />
        {suffix && <span className="input-group-text">{suffix}</span>}
      </div>
      {help && <div className="form-text">{help}</div>}
    </div>
  )
}
