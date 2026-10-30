# End-to-end specs

## Isolated browser regression runners

Use the disposable-database runners for test work. Each creates a fresh
PostgreSQL 17 container on a random loopback port, applies migrations, runs the
suite against isolated API/Vite servers, and removes the container afterward.
They never seed or reset the local demo database. When the disposable database
marker is present, Playwright also refuses to reuse existing local servers.

```bash
npm run test:e2e:regression # Lab 2 + Lab 3 browser regression
npm run test:e2e:lab4       # Lab 4 dashboards, Actions Taken and workflow
npm run test:e2e:staff-dashboard # focused Staff/Admin dashboard suite
```

`playwright.dashboard.config.ts` refuses direct use without the runner's
disposable-database marker. `playwright.config.ts` is used by the Lab 2/3
runner and still excludes Lab 4 specs so they cannot accidentally run against a
shared database.

## Lab 4 browser coverage (Issue #61)

- `e2e/lab-04/dashboards.spec.ts`: Staff/Admin and Requester authorization,
  dashboard metrics and latest-five lists, drill-downs, ownership, state
  persistence, stale responses, responsive layout, focus and touch targets.
- `e2e/lab-04/actions-taken-flow.spec.ts`: Staff validation, assignment,
  editing, completion/cancellation, Admin performer creation, Requester
  read-only history and inactive-assignee rejection.
- `e2e/lab-04/concurrent-edit.spec.ts`: two-Staff stale-write recovery and
  lost-response replay, including the one-Action/one-event persistence check.
- `e2e/lab-04/ticket-resolution.spec.ts`: resolution gating, action completion,
  public-comment/private-note visibility, requester advisory and reopen.

Lab 4 screenshots and JSON evidence records are written under
`artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken,ticket-workflow}/`.
Each sidecar records the role, route, viewport, test and expected result. The
browser suite has desktop, tablet and mobile captures; responsive assertions
also check horizontal overflow.

The latest isolated browser results recorded on 2026-10-29 are 13/13 Lab 2/3
regression journeys and 20/20 Lab 4 journeys. See `docs/lab-04/tests.md` for
the complete verification record and remaining release gates.

## Lab 2 requester regression

`e2e/lab-02/requester-ticket-flow.spec.ts` keeps the requester ticket,
ownership, attachment lifecycle and responsive coverage while using the Lab 3
session cookie. Requesters now land on `/dashboard/requester`; My Tickets
remains at `/tickets`. The retired selector-driven evidence specs remain
retired. Lab 2 captures are under `artifacts/lab-02/` and the session-adapted
regression also refreshes `artifacts/lab-03/screenshots/requester-regression/`.

## Lab 3 browser regression (#42)

`e2e/lab-03/` covers authentication, the Staff ticket workflow, Admin user
management, and release evidence. The disposable runner resets only its own
seed before each journey. Responsive capture viewports are 1366x768, 768x1024
and 375x667; overflow checks use those actual viewport widths.

The role seed has grown with Lab 4 dashboard fixtures. Its clean baseline is
17 users: 8 Requesters, 6 IT Staff and 3 Administrators. The release-evidence
journey checks that count and separately rejects leftover `e2e.` users.

## Other commands

`npm run test:e2e` runs the default Playwright config against its configured
development database and starts/reuses the ordinary local servers. Use it only
when that database is intentionally selected. For isolated runs, use the
disposable runners above.

The server/client unit and API regressions remain:

```bash
npm run test:isolated --prefix server
npm test --prefix client -- --maxWorkers=1
```

Staff dashboard performance measurements use a separate disposable database:
`npm run test:dashboard-performance --prefix server`. Results are recorded in
`artifacts/lab-04/staff-dashboard-performance.json` and
`artifacts/lab-04/requester-dashboard-performance.json`.
