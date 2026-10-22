import { useId, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  /** 'pct' displays/edits 0–1 values as 0–100. */
  unit?: 'pct' | 'h' | 'days' | 'none'
  min?: number
  max?: number
  step?: number
  help?: string
  /** Explanation shown as a tooltip on the ⓘ next to the label. */
  tip?: string
  /** Inline validation message; marks the field invalid. */
  error?: string
  disabled?: boolean
}

const round = (n: number) => String(Math.round(n * 1e6) / 1e6)

export default function NumField({ label, value, onChange, unit = 'none', min = 0, max, step, help, tip, error, disabled }: Props) {
  const id = useId()
  const scale = unit === 'pct' ? 100 : 1
  // Text draft exists only while editing, so typing "0." or clearing the box doesn't fight the model.
  const [draft, setDraft] = useState<string | null>(null)
  // Only show the draft while it still matches the model, so Reset or other edits can't leave stale text.
  const shown = draft !== null && Math.abs(Number(draft) / scale - value) < 1e-9 ? draft : round(value * scale)

  const suffix = unit === 'pct' ? '%' : unit === 'h' ? 'h' : unit === 'days' ? 'days' : null
  return (
    <div className="mb-3 h-100 d-flex flex-column">
      <label htmlFor={id} className="form-label mb-1 flex-grow-1 d-flex align-items-end">
        <span>
        {label}
        {tip && (
          <span className="tip ms-1" title={tip} tabIndex={0} role="img" aria-label={`Help: ${tip}`}>
            ⓘ
          </span>
        )}
        </span>
      </label>
      <div className="input-group">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          value={shown}
          disabled={disabled}
          onBlur={() => setDraft(null)}
          min={min}
          max={max}
          step={step ?? (unit === 'pct' ? 1 : 'any')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = e.target.valueAsNumber
            onChange(Number.isFinite(n) ? Math.round((n / scale) * 1e9) / 1e9 : 0)
          }}
        />
        {suffix && <span className="input-group-text">{suffix}</span>}
      </div>
      {/* Always reserve the help line so neighbouring fields keep their inputs aligned. */}
      {error ? (
        <div id={`${id}-err`} className="invalid-feedback d-block help-slot">
          {error}
        </div>
      ) : (
        <div className="form-text help-slot">{help ?? ' '}</div>
      )}
    </div>
  )
}
