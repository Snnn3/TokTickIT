# End-to-end specs

## Lab 4 Staff Dashboard (Issue #59)

Run `npm run test:e2e:staff-dashboard` from the repository root with Docker
running. This runner creates and migrates a new PostgreSQL 17 container on a
random loopback port, seeds only its own fixtures, starts isolated API/Vite
servers on ports 3104/5184, and removes the container afterward. It never
resets the local demo seed. Direct use of `playwright.dashboard.config.ts`
without the runner's disposable-database marker is refused.

`e2e/lab-04/dashboards.spec.ts` covers Staff/Admin/Requester authorization,
zero/populated status counts, latest-five ties, current-performer isolation,
metric/status/recent drill-downs, filters through reload/back/detail,
action focus, pagination, loading/stale/retry, Bangkok time and three viewports.
The eight journeys include preservation of every queue choice through
detail/back/reload and 44-by-44-pixel dashboard controls on mobile.
Screenshots go to `artifacts/lab-04/screenshots/staff-dashboard/`.
Requester dashboard coverage remains Issue #60; these tests do not claim it.

For P4-01 Staff coverage run
`npm run test:dashboard-performance --prefix server`. It also provisions its
own database, loads 10,000 Tickets and 30,000 Actions Taken, compares HTTP
counts to independent SQL, measures 20 warm requests, checks 1,000 ms p95 /
64 KiB budgets and constant query counts, and records EXPLAIN plans in
`artifacts/lab-04/staff-dashboard-performance.json`. The normal server suite
does not include this opt-in Docker suite. A second real-database test freezes
the dashboard clock and verifies inclusive seven-day bounds, adjacent
millisecond exclusions and matching queue/action drill-down totals.
`npm run test:isolated --prefix
server` runs the full server regression suite with a disposable database for
the inherited Lab 1 seeded-category test.

Playwright specs live here, one directory per lab. `playwright.config.ts` points
at this directory and starts both dev servers itself.

## Lab 2 requester regression

`e2e/lab-02/requester-ticket-flow.spec.ts` is restored as a session-adapted
regression. It keeps the Lab 2 requester ticket, ownership isolation,
attachment lifecycle and responsive coverage while using the Lab 3 session
cookie instead of the retired requester selector and `X-Requester-Id` header.

Run it with:

```bash
npx playwright test e2e/lab-02
```

Its current screenshots are written under
`artifacts/lab-03/screenshots/requester-regression/`; the original Lab 2
pre-auth figures remain under `artifacts/lab-02/`.

## Lab 3 browser regression (#42)

`e2e/lab-03/` carries the authenticated browser regression and responsive
evidence. It contains four specs plus a shared seeded-stack helper:

| Spec | Covers |
|---|---|
| `authentication.spec.ts` | E-01: sign in, the first-login gate, logout and cookie replay |
| `staff-ticket-flow.spec.ts` | E-02: queue, claim, prioritise, advance, resolve, comment, note, reopen |
| `user-administration.spec.ts` | E-03: admin search, create, edit, reset, guards, deactivation cascade |
| `zz-release-evidence.spec.ts` | Release visual states: auth failures/busy/logout, queue states and clipping, staff validation/feedback, admin dialogs/guards, and clean seeded users |

The specs clean only their scoped E2E fixtures and reset the documented local
seed before each journey, use real session cookies, and write the required
screenshots and authorization evidence under `artifacts/lab-03/`. The visual
run covers 1366x768, 768x1024 and 375x667 and asserts that the document has no
horizontal overflow.

Run the complete browser suite after starting and seeding PostgreSQL:

```bash
npx playwright test e2e/lab-03
```

Run all Lab 2 and Lab 3 browser suites through the root script:

```bash
npm run test:e2e
```

Server and client suites remain useful regression checks:

```bash
npm test --prefix server   # API, authorization and migration behaviour
npm test --prefix client   # screens, guards and shell navigation
```

Evidence written by the suite:

- `artifacts/lab-03/screenshots/authentication/{desktop,tablet,mobile}.png` plus
  the corresponding change-password captures
- `artifacts/lab-03/screenshots/staff-queue/{desktop,tablet,mobile}.png`
- `artifacts/lab-03/screenshots/staff-ticket-detail/{desktop,tablet,mobile}.png`
- `artifacts/lab-03/screenshots/user-management/{desktop,tablet,mobile}.png`
- `artifacts/lab-03/screenshots/release-evidence/` for invalid, inactive,
  busy-login, logout, queue loading/empty/error/feedback, Updated-column
  clipping, staff post-action/validation, admin create/edit/reset/guard, and
  clean User Management captures
- `artifacts/lab-03/authorization.json`
- `artifacts/lab-03/visual-state-evidence.json` and
  `artifacts/lab-03/clean-user-management.json`
