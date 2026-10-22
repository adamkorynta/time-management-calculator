# Suggested follow-ups: visualization & UX

Ordered by value ÷ effort. Charting suggestion: [Recharts](https://recharts.org) (React-native, small) or Chart.js; keep GEI palette from `docs/reference/theme.md`.

## Charts
1. **Annual time-allocation donut / stacked bar** — Holiday, PPL, Meetings, Billable, BD, Prof Dev, Practice as share of the 2,080 h year. Makes over/under-allocation obvious; add an "Unallocated" slice.
2. **Billable progress bullet chart** — YTD billable hours vs. original target (1,664 h) vs. pace line for the as-of date; marker for the revised-target path.
3. **Target-vs-actual gauge** for YTD billable % with the original target as a tick mark.
4. **What-if curve** — year-end billable % (D36) as a line over adjusted billable % 50–100%, with the original target as a horizontal line and the current slider value highlighted. Replace the single what-if input with a slider driving it.
5. **Remaining-year waterfall** — Hours remaining → minus PPL → minus holiday → workable hours → billable needed vs. non-billable available.
6. **Burn-up projection** — cumulative billable hours by week: actual (YTD) + projected at revised % vs. at original %, ending at the annual target.

## Tables
7. **Monthly/quarterly schedule table** — spread revised weekly targets across the remaining weeks (derive weeks remaining from the as-of date), optionally with per-month PPL/holiday entries instead of a single lump-sum estimate.
8. **Scenario comparison table** — save 2–4 named scenarios side by side (e.g. "Current", "Take 2 more PPL weeks", "Raise BD to 5%").
9. **YTD reconciliation table** — PPL + Admin + BD + Billable vs. 100% with a pass/fail marker (currently a text warning).

## Interaction / data
10. **Auto-derive weeks remaining and as-of defaults** from today's date; show "on pace / behind / ahead" badge.
11. **Multiple YTD snapshots** (monthly utilization uploads) with a trend line of revised billable % over time — persist in localStorage, export/import JSON.
12. **Import utilization CSV/Excel** to fill the green boxes (SheetJS in-browser, no server).
13. **Export / print** — PDF summary or "download filled .xlsx" to share with a supervisor; shareable URL (inputs encoded in the hash).
14. **Validation & guidance** — inline range checks, tooltips explaining each field, and a clear "target not achievable" state when revised % > 100%.
15. **Accessibility & theming** — chart text alternatives/data tables, dark mode, GEI logo.
16. **Quality** — Playwright smoke test in CI; component tests for `NumField` draft behaviour.
