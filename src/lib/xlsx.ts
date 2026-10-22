import JSZip from 'jszip'
import { HOLIDAY_HOURS_PER_YEAR } from './calc'
import type { PlanInputs, PlanResult, RemainingResult, StatusInputs } from './calc'
import { excelSerial } from './dates'

/**
 * Builds a fresh .xlsx that mirrors the layout and formulas of the original calculator
 * (same cell addresses), pre-filled with the user's inputs. Formulas stay live in Excel.
 * Cached values are included so previewers that don't recalculate still show numbers.
 */

// Style indexes into the cellXfs below.
const S = { text: 0, bold: 1, num: 2, pct: 3, inPct: 4, inNum: 5, inDate: 6, title: 7, boldPct: 8 } as const

interface Cell {
  v?: number | string | null
  f?: string
  s?: number
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const colNum = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0)

function cellXml(ref: string, c: Cell): string {
  const s = c.s ? ` s="${c.s}"` : ''
  const f = c.f ? `<f>${esc(c.f)}</f>` : ''
  if (typeof c.v === 'string') return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`
  if (typeof c.v === 'number' && Number.isFinite(c.v)) return `<c r="${ref}"${s}>${f}<v>${c.v}</v></c>`
  return f ? `<c r="${ref}"${s}>${f}</c>` : `<c r="${ref}"${s}/>`
}

function sheetXml(cells: Record<string, Cell>): string {
  const rows = new Map<number, [string, Cell][]>()
  for (const [ref, c] of Object.entries(cells)) {
    const r = Number(ref.replace(/\D/g, ''))
    rows.set(r, [...(rows.get(r) ?? []), [ref, c]])
  }
  const body = [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([r, cs]) => `<row r="${r}">${cs.sort((a, b) => colNum(a[0]) - colNum(b[0])).map(([ref, c]) => cellXml(ref, c)).join('')}</row>`)
    .join('')
  const widths = [48, 22, 14, 22, 3, 28, 12]
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF003E53"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/>
<xf numFmtId="2" fontId="0" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/>
<xf numFmtId="14" fontId="0" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

/** Row numbers of the generated sheet, derived from the number of overhead rows. */
export function sheetLayout(overheadCount: number) {
  const billable = 5
  const firstOverhead = 6
  const total = firstOverhead + overheadCount
  const asOf = total + 3
  return { billable, firstOverhead, total, asOf }
}

export function buildCells(p: PlanInputs, s: StatusInputs, plan: PlanResult, r: RemainingResult): Record<string, Cell> {
  const L = sheetLayout(p.overhead.length)
  const a = L.asOf
  const row = (k: string) => plan.rows.find((x) => x.key === k)!
  const t = (v: string, style: number = S.text): Cell => ({ v, s: style })
  const R = {
    ppl: a + 1, admin: a + 2, bd: a + 3, nbPct: a + 4, nbHrs: a + 5, bPct: a + 6, bHrs: a + 7, tot: a + 8,
    title: a + 10, rem: a + 11, origPct: a + 12, origHrs: a + 13, pplRem: a + 14, holRem: a + 15,
    hdr: a + 16, rev: a + 17, wk: a + 18, nbRevPct: a + 19, nbWk: a + 20,
  }
  const B = L.billable
  const c: Record<string, Cell> = {
    A1: t('Annual Plan Time Management Calculator', S.title),
    F1: t('Schedule', S.bold),
    F2: t('Hours/week'), G2: { v: p.hoursPerWeek, s: S.inNum },
    F3: t('Hours/year'), G3: { f: 'G2*52', v: plan.hoursPerYear },
    F4: t('PPL Hours/year'), G4: { v: p.pplHoursPerYear, s: S.inNum },
    B2: t('Hours/Week', S.bold), C2: t('Hours/Year', S.bold), D2: t('Time Allocation (%)', S.bold),
    A3: t('Holiday (7 days/year)'),
    B3: { f: 'C3/52', v: row('holiday').hoursPerWeek, s: S.num },
    C3: { f: 'D3*$G$3', v: HOLIDAY_HOURS_PER_YEAR, s: S.num },
    D3: { f: '(7*8)/G3', v: row('holiday').pct, s: S.pct },
    A4: t('PPL'),
    B4: { f: 'C4/52', v: row('ppl').hoursPerWeek, s: S.num },
    C4: { f: 'G4', v: p.pplHoursPerYear, s: S.num },
    D4: { f: 'G4/G3', v: row('ppl').pct, s: S.pct },
    [`A${B}`]: t('Project Billable'),
    [`B${B}`]: { f: `C${B}/52`, v: row('billable').hoursPerWeek, s: S.num },
    [`C${B}`]: { f: `D${B}*$G$3`, v: row('billable').hoursPerYear, s: S.num },
    [`D${B}`]: { v: p.billablePct, s: S.inPct },
    [`A${L.total}`]: t('Total', S.bold),
    [`B${L.total}`]: { f: `SUM(B3:B${L.total - 1})`, v: plan.total.hoursPerWeek, s: S.num },
    [`C${L.total}`]: { f: `SUM(C3:C${L.total - 1})`, v: plan.total.hoursPerYear, s: S.num },
    [`D${L.total}`]: { f: `SUM(D3:D${L.total - 1})`, v: plan.total.pct, s: S.pct },
    [`A${a}`]: t('Status update as of '),
    [`B${a}`]: { v: excelSerial(s.asOf), s: S.inDate },
    [`A${R.ppl}`]: t('YTD PPL'), [`B${R.ppl}`]: { v: s.ytdPplPct, s: S.inPct },
    [`A${R.admin}`]: t('YTD Admin'), [`B${R.admin}`]: { v: s.ytdAdminPct, s: S.inPct },
    [`A${R.bd}`]: t('YTD BD'), [`B${R.bd}`]: { v: s.ytdBdPct, s: S.inPct },
    [`A${R.nbPct}`]: t('YTD Non-billable Total'), [`B${R.nbPct}`]: { f: `1-B${R.bPct}`, v: r.ytdNonBillablePct, s: S.pct },
    [`A${R.nbHrs}`]: t('YTD Non-billable Hours'), [`B${R.nbHrs}`]: { f: `B${R.tot}-B${R.bHrs}`, v: r.ytdNonBillableHours, s: S.num },
    [`A${R.bPct}`]: t('YTD Billable Total'), [`B${R.bPct}`]: { v: s.ytdBillablePct, s: S.inPct },
    [`A${R.bHrs}`]: t('YTD Billable Hours'), [`B${R.bHrs}`]: { f: `B${R.bPct}*B${R.tot}`, v: r.ytdBillableHours, s: S.num },
    [`A${R.tot}`]: t('YTD Total Hours'), [`B${R.tot}`]: { v: s.ytdTotalHours, s: S.inNum },
    [`A${R.title}`]: t('Revised Targets for the Remainder of the Year', S.bold),
    [`A${R.rem}`]: t('Total Hours Remaining'), [`B${R.rem}`]: { f: `G3-B${R.tot}`, v: r.hoursRemaining, s: S.num },
    [`A${R.origPct}`]: t('Original Target Billable %'), [`B${R.origPct}`]: { f: `D${B}`, v: r.originalBillablePct, s: S.pct },
    [`A${R.origHrs}`]: t('Original Target Billable Hours'), [`B${R.origHrs}`]: { f: `B${R.origPct}*G3`, v: r.originalBillableHours, s: S.num },
    [`A${R.pplRem}`]: t('Estimated PPL Hours for Remainder of the Year'), [`B${R.pplRem}`]: { v: s.plannedPplRemaining, s: S.inNum },
    [`A${R.holRem}`]: t('Estimated Holiday Hours for Remainder of the Year'), [`B${R.holRem}`]: { v: s.plannedHolidayRemaining, s: S.inNum },
    [`C${R.hdr}`]: t('Adjusted', S.bold), [`D${R.hdr}`]: t('Revised Year-end Target', S.bold),
    [`A${R.rev}`]: t('Revised Target Billable %'),
    [`B${R.rev}`]: { f: `(B${R.origHrs}-B${R.bHrs})/(B${R.rem}-B${R.pplRem}-B${R.holRem})`, v: r.revisedBillablePct, s: S.boldPct },
    [`C${R.rev}`]: { v: s.adjustedBillablePct, s: S.inPct },
    [`D${R.rev}`]: { f: `((B${R.bHrs}+B${R.rem}*C${R.rev})/G3)`, v: r.yearEndBillablePct, s: S.pct },
    [`A${R.wk}`]: t('Revised Target Billable Hours per Week'),
    [`B${R.wk}`]: { f: `B${R.rev}*$G$2`, v: r.revisedBillableHoursPerWeek, s: S.num },
    [`C${R.wk}`]: { f: `C${R.rev}*$G$2`, v: r.adjustedBillableHoursPerWeek, s: S.num },
    [`A${R.nbRevPct}`]: t('Revised Target Non-billable %'),
    [`B${R.nbRevPct}`]: { f: `100%-B${R.rev}`, v: r.revisedNonBillablePct, s: S.pct },
    [`C${R.nbRevPct}`]: { f: `100%-C${R.rev}`, v: r.adjustedNonBillablePct, s: S.pct },
    [`A${R.nbWk}`]: t('Revised Target Non-billable Hours per Week'),
    [`B${R.nbWk}`]: { f: `B${R.nbRevPct}*$G$2`, v: r.revisedNonBillableHoursPerWeek, s: S.num },
    [`C${R.nbWk}`]: { f: `C${R.nbRevPct}*$G$2`, v: r.adjustedNonBillableHoursPerWeek, s: S.num },
    [`A${R.nbWk + 2}`]: t(`Exported from the web calculator on ${new Date().toLocaleDateString('en-CA')}. Green cells are inputs.`),
  }

  // Overhead rows: whichever column the user entered is the input; the other two are formulas.
  p.overhead.forEach((o, i) => {
    const n = L.firstOverhead + i
    const pr = row(o.id)
    c[`A${n}`] = t(o.label)
    c[`B${n}`] = o.basis === 'week' ? { v: o.value, s: S.inNum } : { f: `C${n}/52`, v: pr.hoursPerWeek, s: S.num }
    c[`C${n}`] = o.basis === 'year' ? { v: o.value, s: S.inNum } : { f: o.basis === 'week' ? `B${n}*52` : `D${n}*$G$3`, v: pr.hoursPerYear, s: S.num }
    c[`D${n}`] = o.basis === 'pct' ? { v: o.value, s: S.inPct } : { f: `C${n}/$G$3`, v: pr.pct, s: S.pct }
  })
  return c
}

export async function buildXlsx(p: PlanInputs, s: StatusInputs, plan: PlanResult, r: RemainingResult): Promise<Blob> {
  const zip = new JSZip()
  const ns = 'http://schemas.openxmlformats.org/'
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
  )
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}spreadsheetml/2006/main" xmlns:r="${ns}officeDocument/2006/relationships"><sheets><sheet name="Calculator" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
  )
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${ns}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  )
  zip.file('xl/styles.xml', STYLES)
  zip.file('xl/worksheets/sheet1.xml', sheetXml(buildCells(p, s, plan, r)))
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
