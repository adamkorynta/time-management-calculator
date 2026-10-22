const num = (digits: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const n1 = num(1)
const n2 = num(2)

export const fmtHours = (v: number | null) => (v === null ? '—' : n2.format(v))
export const fmtHours1 = (v: number | null) => (v === null ? '—' : n1.format(v))
export const fmtPct = (v: number | null, digits = 1) => (v === null ? '—' : `${(v * 100).toFixed(digits)}%`)
