# Time Management Calculator

SPA replacement for `docs/reference/TimeManagementCalculator_RemainingTime_EnvBranch.xlsx`.
Vite + React 19 + TypeScript + Bootstrap 5, deployed to GitHub Pages.

## Read first
- `docs/reference/spreadsheet-spec.md` — every input/formula of the workbook and its quirks (source of truth for behaviour).
- `docs/reference/theme.md` — GEI brand tokens.
- `docs/IMPROVEMENTS.md` — planned visualization follow-ups.

## Commands
- `npm run dev` · `npm test` · `npm run lint` · `npm run build` (tsc + vite; output in `dist/`)

## Architecture
- `src/lib/calc.ts` — pure functions `computePlan` / `computeRemaining` + workbook defaults. No React. Keep cell refs in comments.
- `src/lib/calc.test.ts` — asserts the workbook's cached results; change calc logic only with matching test updates.
- `src/lib/pplTable.ts` — PPL accrual table.
- Non-billable categories are `PlanInputs.overhead: OverheadRow[]` (`basis` = the column the user last typed: week/year/pct, so that column stays fixed when the schedule changes). Billable is separate (`billablePct`). `src/lib/plan.ts` normalizes stored/shared data and migrates the old fixed-field shape.
- `src/lib/xlsx.ts` builds the export from scratch (no template); its sheet layout shifts with the number of overhead rows (`sheetLayout`).
- `src/components/` — `PlanCard`, `StatusCard`, `TargetsCard`, `NumField` (percent fields store 0–1, display 0–100).
- State persists to localStorage (`tmc.plan.v2` — migrates from `v1` —, `tmc.status.v1`, `tmc.ui.v1`); bump the key suffix on breaking shape changes.

## Conventions
- Vite `base: './'` so the build works under any Pages path; no client router (keep it that way or switch to HashRouter).
- Division by zero returns `null` and renders "—"; never show NaN/Infinity.
- Deploy: `.github/workflows/deploy.yml` on push to `main`; PR checks in `ci.yml`. Repo Pages source must be set to "GitHub Actions".
