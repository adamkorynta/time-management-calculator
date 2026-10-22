import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { computePlan, computeRemaining, DEFAULT_PLAN, DEFAULT_STATUS } from './calc'
import { buildXlsx, sheetLayout } from './xlsx'

describe('buildXlsx', () => {
  it('produces a workbook with the original formulas and filled inputs', async () => {
    const plan = computePlan(DEFAULT_PLAN)
    const rem = computeRemaining(DEFAULT_PLAN, DEFAULT_STATUS)
    const blob = await buildXlsx(DEFAULT_PLAN, DEFAULT_STATUS, plan, rem)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    const L = sheetLayout(DEFAULT_PLAN.overhead.length)
    expect(L.total).toBe(12)
    expect(sheet).toContain('<f>(B28-B22)/(B26-B29-B30)</f>') // revised billable %, rows shifted by the 2 added overhead rows
    expect(sheet).toContain('<f>1-B21</f>')
    expect(sheet).toContain('<c r="G2" s="5"><v>40</v></c>')
    expect(sheet).toContain(`<c r="B${L.asOf}" s="6"><v>46090</v></c>`)
    expect(sheet).toContain('<c r="B6" s="5"><v>1</v></c>') // meetings entered as hours/week
    expect(sheet).toContain('<c r="D8" s="4"><v>0.03</v></c>') // prof dev entered as %
    expect(sheet).toContain('<f>SUM(D3:D11)</f>')
    const wb = await zip.file('xl/workbook.xml')!.async('string')
    expect(wb).toContain('fullCalcOnLoad="1"')
    if (process.env.XLSX_OUT) {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(process.env.XLSX_OUT, Buffer.from(await blob.arrayBuffer()))
    }
  })
})
