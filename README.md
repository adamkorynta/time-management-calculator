# Annual Plan Time Management Calculator

A web version of GEI's "Annual Plan Time Management Calculator" spreadsheet
([original](docs/reference/TimeManagementCalculator_RemainingTime_EnvBranch.xlsx)).
Plan your year (schedule, PPL, time allocation), then enter year-to-date utilization to see the billable
target you need for the remainder of the year. Everything runs in the browser; inputs are saved to local storage only.

## Develop

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # calculation tests (match the workbook's values)
npm run build   # production build in dist/
```

## Deploy (GitHub Pages)

1. Push to a GitHub repo's `main` branch.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. `.github/workflows/deploy.yml` lints, tests, builds and publishes on every push to `main`
   (`ci.yml` runs the same checks on pull requests).

See [`docs/`](docs) for the spreadsheet spec, theme notes and the visualization backlog.
