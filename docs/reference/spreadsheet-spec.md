# Spreadsheet spec — Annual Plan Time Management Calculator

Source: [`TimeManagementCalculator_RemainingTime_EnvBranch.xlsx`](TimeManagementCalculator_RemainingTime_EnvBranch.xlsx)
(single sheet `Sheet1`, range A1:K39, no macros, no data validation, no charts, no merged cells).
Reverse-engineered from the raw sheet XML. The TypeScript port is `src/lib/calc.ts`; `src/lib/calc.test.ts`
asserts the workbook's cached values.

## Purpose
Staff plan their year (schedule, leave, time allocation), then mid-year feed in YTD utilization to learn what
**billable % they must hit for the remainder of the year** to still reach the original target.

## Inputs (blue-ish/yellow in the sheet; green = utilization-report inputs)

| Cell | Label | Default | Notes |
|---|---|---|---|
| G2 | Schedule hours/week | 40 | |
| G4 | PPL hours/year | 220 | Chosen manually from the PPL table (F9:K15) |
| B5 | Meetings hours/week | 1 | Only allocation entered as hours, not % |
| D6 | Project Billable % | 80% | Agreed with supervisor |
| D7 | Business Development % | 0% | |
| D8 | Professional Development/Training % | 3% | |
| D9 | Practice Development/Leadership % | 1% | |
| B19 | Status update as of | 2026-03-09 (serial 46090) | Date only; never used in a formula |
| B20 | YTD PPL % | 12.3% | **Not used by any formula** |
| B21 | YTD Admin % | 17.8% | **Not used** |
| B22 | YTD BD % | 12.7% | **Not used** |
| B23 | YTD Non-billable Total % | 42.8% | **Not used** (B24 is derived instead) |
| B25 | YTD Billable Total % | 50.3% | Drives B26 |
| B27 | YTD Total Hours | 360 | |
| B33 | Est. PPL hours remaining | 80 | |
| B34 | Est. holiday hours remaining | 40 | |
| C36 | Adjusted billable % (what-if) | 80% | |

## Formulas

Annual plan block (rows 3–10):

| Cell | Formula | Meaning |
|---|---|---|
| G3 | `=G2*52` | Annual hours |
| D3 / C3 / B3 | `=(7*8)/G3` / `=D3*G3` / `=C3/52` | Holiday: fixed 56 h (7 days × 8 h) |
| C4, D4, B4 | `=G4`, `=G4/G3`, `=C4/52` | PPL |
| B5, C5, D5 | input, `=B5*52`, `=C5/G3` | Meetings (hours-driven) |
| D6..D9 → C → B | `C=D*G3`, `B=C/52` | Billable, BD, ProfDev, Practice (percent-driven) |
| row 10 | `SUM` of rows 3–9 | Totals (default 99.77% / 2075.2 h; **not forced to 100%**) |

YTD / remaining block:

| Cell | Formula |
|---|---|
| B26 | `=B25*B27` YTD billable hours |
| B24 | `=B27-B26` YTD non-billable hours |
| B30 | `=G3-B27` Total hours remaining |
| B31 | `=D6` Original billable % |
| B32 | `=B31*G3` Original billable hours |
| **B36** | `=(B32-B26)/(B30-B33-B34)` **Revised target billable %** |
| B37 | `=B36*G2` Revised billable h/week |
| B38 | `=100%-B36` Revised non-billable % |
| B39 | `=B38*G2` Revised non-billable h/week |
| C36 | input (80%) — adjusted what-if |
| C37–C39 | same as B37–B39 using C36 |
| D36 | `=(B26+(B30-B33-B34)*C36)/G3` Revised year-end billable % |

Worked example (defaults): B36 = (1664 − 181.08) / (1720 − 80 − 40) = **92.6825%** → 37.07 h/week;
D36 = 70.24%.

## PPL table (F9:K15)

| Years at GEI + prior credit | 40 h/wk days | 40 h/wk hrs/yr | hrs/day* | 30–39 h/wk hrs/yr | hrs/day* |
|---|---|---|---|---|---|
| 0 – 4 | 18 | 144 | 0.554 | 108 | 0.296 |
| 5 – 9 | 23 | 184 | 0.708 | 138 | 0.379 |
| 10 – 14 | 25 | 200 | 0.769 | 150 | 0.412 |
| 15 – 20 | 27.5 | 220 | 0.846 | 165 | 0.453 |
| Over 20 | 30 | 240 | 0.923 | 180 | 0.494 |

\* 40 h column: `(hrs/yr / 52) / 5`. The 30–39 h "hrs/day" values are hard-coded in the sheet.

## Deliberate deviation from the workbook
- **D36 (Revised year-end billable %)** is `(B26 + (B30 − B33 − B34) × C36) / G3` in the workbook, i.e. the what-if % applies to
  the workable hours only. The app (and its .xlsx export) uses `(B26 + B30 × C36) / G3`: the what-if % applies to **all** remaining
  hours, ignoring planned PPL/holidays, and shows a warning with the hours of planned time off it would consume when it exceeds
  `workable ÷ remaining`. With the workbook defaults this gives 74.86% instead of 70.24%. The revised-target formula (B36) is unchanged.

## Workbook quirks (preserved or fixed in the app)
- Instruction #4 mentions D5–D8, but the editable percentages are actually D6–D9 (D5 is derived from B5). App labels fields by name.
- B20–B23 (YTD PPL/Admin/BD/Non-billable) are inputs that feed nothing. App keeps them as reference and warns if they don't reconcile.
- No guard against division by zero or revised % > 100%. App shows "—"/an over-100% warning instead of `#DIV/0!`.
- Total allocation is allowed to be ≠ 100%; the app surfaces the unallocated/over-allocated hours.
- Weekly revised hours use G2 (schedule hours/week), not hours remaining ÷ weeks remaining.
- Holiday (56 h) is a constant; "Estimated holiday hours remaining" (B34) is entered separately.
- The file was authored in SharePoint (`…/Practice/Utilization/`) and carries a Microsoft sensitivity label (`docMetadata/LabelInfo.xml`).
