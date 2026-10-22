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

export function buildCells(p: PlanInputs, s: StatusInputs, plan: PlanResult, r: RemainingResult): Record<string, Cell> {
  const row = (k: string) => plan.rows.find((x) => x.key === k)!
  const t = (v: string, style: number = S.text): Cell => ({ v, s: style })
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
    A5: t('Company/Office/Group Meetings'),
    B5: { v: p.meetingsHoursPerWeek, s: S.inNum },
    C5: { f: 'B5*52', v: row('meetings').hoursPerYear, s: S.num },
    D5: { f: 'C5/G3', v: row('meetings').pct, s: S.pct },
    A10: t('Total', S.bold),
    B10: { f: 'SUM(B3:B9)', v: plan.total.hoursPerWeek, s: S.num },
    C10: { f: 'SUM(C3:C9)', v: plan.total.hoursPerYear, s: S.num },
    D10: { f: 'SUM(D3:D9)', v: plan.total.pct, s: S.pct },
    A19: t('Status update as of '),
    B19: { v: excelSerial(s.asOf), s: S.inDate },
    A20: t('YTD PPL'), B20: { v: s.ytdPplPct, s: S.inPct },
    A21: t('YTD Admin'), B21: { v: s.ytdAdminPct, s: S.inPct },
    A22: t('YTD BD'), B22: { v: s.ytdBdPct, s: S.inPct },
    A23: t('YTD Non-billable Total'), B23: { f: '1-B25', v: r.ytdNonBillablePct, s: S.pct },
    A24: t('YTD Non-billable Hours'), B24: { f: 'B27-B26', v: r.ytdNonBillableHours, s: S.num },
    A25: t('YTD Billable Total'), B25: { v: s.ytdBillablePct, s: S.inPct },
    A26: t('YTD Billable Hours'), B26: { f: 'B25*B27', v: r.ytdBillableHours, s: S.num },
    A27: t('YTD Total Hours'), B27: { v: s.ytdTotalHours, s: S.inNum },
    A29: t('Revised Targets for the Remainder of the Year', S.bold),
    A30: t('Total Hours Remaining'), B30: { f: 'G3-B27', v: r.hoursRemaining, s: S.num },
    A31: t('Original Target Billable %'), B31: { f: 'D6', v: r.originalBillablePct, s: S.pct },
    A32: t('Original Target Billable Hours'), B32: { f: 'B31*G3', v: r.originalBillableHours, s: S.num },
    A33: t('Estimated PPL Hours for Remainder of the Year'), B33: { v: s.plannedPplRemaining, s: S.inNum },
    A34: t('Estimated Holiday Hours for Remainder of the Year'), B34: { v: s.plannedHolidayRemaining, s: S.inNum },
    C35: t('Adjusted', S.bold), D35: t('Revised Year-end Target', S.bold),
    A36: t('Revised Target Billable %'),
    B36: { f: '(B32-B26)/(B30-B33-B34)', v: r.revisedBillablePct, s: S.boldPct },
    C36: { v: s.adjustedBillablePct, s: S.inPct },
    D36: { f: '((B26+(B30-B33-B34)*C36)/G3)', v: r.yearEndBillablePct, s: S.pct },
    A37: t('Revised Target Billable Hours per Week'),
    B37: { f: 'B36*$G$2', v: r.revisedBillableHoursPerWeek, s: S.num },
    C37: { f: 'C36*$G$2', v: r.adjustedBillableHoursPerWeek, s: S.num },
    A38: t('Revised Target Non-billable %'),
    B38: { f: '100%-B36', v: r.revisedNonBillablePct, s: S.pct },
    C38: { f: '100%-C36', v: r.adjustedNonBillablePct, s: S.pct },
    A39: t('Revised Target Non-billable Hours per Week'),
    B39: { f: 'B38*$G$2', v: r.revisedNonBillableHoursPerWeek, s: S.num },
    C39: { f: 'C38*$G$2', v: r.adjustedNonBillableHoursPerWeek, s: S.num },
    A41: t(`Exported from the web calculator on ${new Date().toLocaleDateString('en-CA')}. Green cells are inputs.`),
  }
  const pctRows: [number, string, string, number][] = [
    [6, 'Project Billable', 'billable', p.billablePct],
    [7, 'Business Development', 'bd', p.businessDevPct],
    [8, 'Professional Development/Training', 'profdev', p.profDevPct],
    [9, 'Practice Development/Leadership', 'practice', p.practiceDevPct],
  ]
  for (const [n, label, key, share] of pctRows) {
    c[`A${n}`] = t(label)
    c[`B${n}`] = { f: `C${n}/52`, v: row(key).hoursPerWeek, s: S.num }
    c[`C${n}`] = { f: `D${n}*$G$3`, v: row(key).hoursPerYear, s: S.num }
    c[`D${n}`] = { v: share, s: S.inPct }
  }
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
