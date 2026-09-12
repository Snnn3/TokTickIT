# End-to-end specs

Playwright specs live here, one directory per lab. `playwright.config.ts` points
at this directory and starts both dev servers itself.

## Current state

`e2e/lab-03/` is not written yet. It arrives with the E2E and visual-evidence
slice (#42) and will carry three specs plus the responsive assertions:

| Spec | Covers |
|---|---|
| `authentication.spec.ts` | E-01: sign in, the first-login gate, logout and cookie replay |
| `staff-ticket-flow.spec.ts` | E-02: queue, claim, prioritise, advance, resolve, comment, note, reopen |
| `user-administration.spec.ts` | E-03: admin search, create, edit, reset, guards, deactivation cascade |

Until then there is no browser suite, and `npx playwright test` has nothing to
run. Server and client suites cover the behaviour in the meantime:

```bash
npm test --prefix server   # API, authorization and migration behaviour
npm test --prefix client   # screens, guards and shell navigation
```

## Why `e2e/lab-02/` is gone

The Lab 2 suite and its three evidence-capture specs were driven end to end by
the development requester selector and the `X-Requester-Id` header, both of
which the auth foundation removes. BR-28 retires a test whose subject no longer
exists rather than skipping it, because the Definition of Done permits no skipped
or disabled tests, and a spec that throws on every run is neither passing nor
skipped — it is broken evidence that looks live.

The Lab 2 figures those specs produced are unaffected and remain committed under
`artifacts/lab-02/`. They were captured against the pre-auth application, which
is still reachable in git history, and they stay the evidence for the Lab 2
submission. `docs/lab-02/tests.md` and the README are annotated to say so.
