# End-to-end specs

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
