import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { computePlan, computeRemaining, DEFAULT_PLAN, DEFAULT_STATUS } from './calc'
import { buildXlsx } from './xlsx'

describe('buildXlsx', () => {
  it('produces a workbook with the original formulas and filled inputs', async () => {
    const plan = computePlan(DEFAULT_PLAN)
    const rem = computeRemaining(DEFAULT_PLAN, DEFAULT_STATUS)
    const blob = await buildXlsx(DEFAULT_PLAN, DEFAULT_STATUS, plan, rem)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    expect(sheet).toContain('<f>(B32-B26)/(B30-B33-B34)</f>')
    expect(sheet).toContain('<c r="G2" s="5"><v>40</v></c>')
    expect(sheet).toContain('<c r="B19" s="6"><v>46090</v></c>')
    expect(sheet).toContain('<f>1-B25</f>')
    const wb = await zip.file('xl/workbook.xml')!.async('string')
    expect(wb).toContain('fullCalcOnLoad="1"')
    if (process.env.XLSX_OUT) {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(process.env.XLSX_OUT, Buffer.from(await blob.arrayBuffer()))
    }
  })
})
