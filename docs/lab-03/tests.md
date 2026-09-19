# Lab 3 Test Plan and Results

Version: 2.6 | Date: 2026-09-19 | Companion to `specification.md` (AC refs) and `api-spec.md`.

## 1. Test Strategy

TDD-first: this plan is authored together with the specification and **before** implementation. Each issue starts with failing tests, then the minimal implementation to green, then refactor.

### Test seams

Lab 3 reuses the seams already established in Lab 2 rather than introducing new ones. There are three, and no test reaches below them into internal functions:

| Seam | Prior art in this repo | Used for |
|---|---|---|
| Supertest against the exported Express `app`, with the Prisma client stubbed via `vi.spyOn` | `server/tests/lab-02/create-ticket.api.test.ts`, `my-tickets.api.test.ts` | every Lab 2 and Lab 3 API, authorization and regression test — no live database required, so these run anywhere. **One exception, inherited:** `server/tests/lab-01/API-02.categories.test.ts` calls `GET /api/categories` without a stub and therefore needs the seeded database; `BR-28` classifies every Lab 1 test as unchanged, so it is left exactly as Lab 1 wrote it rather than retro-fitted with a stub |
| React Testing Library rendering a component with `fetch` mocked | `client/src/__tests__/lab-02/MyTickets.test.tsx`, `CreateTicket.test.tsx` | every UI component and style test |
| Playwright driving the real stack against a seeded database | `e2e/lab-02/requester-ticket-flow.spec.ts` (retired by BR-28 — the pattern is carried forward, the file is not) | the three end-to-end specs and responsive assertions |

Tests assert externally observable behaviour — status codes, response bodies, cookies, rendered text and roles — never internal call shapes. Two helpers are pure enough to test directly as units: the password policy validator and the status-transition matrix.

**Migration evidence is deliberately not a mocked test.** Asserting a migration against a stubbed Prisma client would prove nothing, so `migration.api.test.ts` covers the *behavioural* consequences of migration (a migrated requester can log in, is gated, and still owns their tickets), while **M-01** captures the preservation evidence by running the migration against the real development database and recording before/after row counts, ticket-number equality and attachment byte checksums in §6, alongside a re-run of the Lab 2 suite as regression. The split is deliberate: no mocked test may claim to prove preservation, and AC-17 traces to M-01 rather than to a stubbed row.

### Levels covered

Unit, API/integration, UI component, UI style, responsive, security/authorization, migration/regression, and end-to-end. The plan covers valid and invalid login, inactive accounts, throttling, password boundaries and complexity, logout and session invalidation, role navigation, direct API authorization, Requester regression, queue queries, ownership and claim behaviour, IT Priority, the status matrix, resolution summary, self-service prevention, comments and notes visibility, administrator safety guards, and safe failures.

## 2. Planned Tests

| ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| U-01 | Unit | BR-07, AC-19 | Password policy: trim, 8/72 boundaries, each complexity rule | 7 chars, 73 bytes, and each missing character class rejected with the rule named; compliant accepted | server/tests/lab-03/auth.api.test.ts (helper) | PASS |
| U-02 | Unit | BR-13, AC-11 | Transition matrix helper incl. terminal states | Legal targets pass; illegal and any transition out of Closed/Cancelled rejected | server/tests/lab-03/staff-ticket-detail.api.test.ts (helper) | PASS |
| API-01 | API | AC-01 | Valid login | 200 user + httpOnly cookie set | server/tests/lab-03/auth.api.test.ts | PASS |
| API-02 | API | AC-02 | Invalid credentials | 401 INVALID_CREDENTIALS generic | server/tests/lab-03/auth.api.test.ts | PASS |
| API-03 | API | AC-02 | Inactive account login | 401 identical to API-02, no enumeration | server/tests/lab-03/auth.api.test.ts | PASS |
| API-04 | API | AC-03 | Change-required gate | Normal APIs 403 PASSWORD_CHANGE_REQUIRED; me/change-password/logout allowed | server/tests/lab-03/auth.api.test.ts | PASS |
| API-05 | API | AC-03, AC-19 | Password change boundaries and complexity | Short, mismatched, or missing a character class → 400 with details; valid clears the flag | server/tests/lab-03/auth.api.test.ts | PASS |
| API-06 | API | AC-06, AC-28, FR-30 | Session invalidation | Logout 204; `me` 401 after; the pre-logout cookie replayed is also 401 (tokenVersion). **Logout with no cookie at all also returns 204**, never 401, so a client with an expired session can still reach a clean signed-out state. A password change invalidates a second outstanding session for that user while the changing session stays valid | server/tests/lab-03/auth.api.test.ts | PASS |
| API-07 | API | AC-04 | Authenticated identity beats client-supplied id | Body/query requesterId ignored; own data only | server/tests/lab-03/authorization.api.test.ts | PASS |
| API-08 | API | AC-04, AC-05 | Requester blocked from notes, staff and admin routes | 403 with no content leak; notes response reveals nothing about existence | server/tests/lab-03/authorization.api.test.ts | PASS |
| API-09 | API | AC-05 | Staff and Admin note access | 200 with content for both roles (D2) | server/tests/lab-03/comments-notes.api.test.ts | PASS |
| API-10 | API | AC-08 | Queue search, filter, sort, page | Correct slice + metadata; unfiltered default includes unassigned | server/tests/lab-03/staff-queue.api.test.ts | PASS |
| API-11 | API | AC-08 | Queue invalid params | 400 INVALID_QUERY with per-param details | server/tests/lab-03/staff-queue.api.test.ts | PASS |
| API-12 | API | AC-09 | Claim, assign, reassign owner | Assignee list returns only active staff and admins and is reachable by IT Staff; valid assignment persists; inactive or wrong-role target 422 INVALID_OWNER | server/tests/lab-03/staff-ticket-detail.api.test.ts | PASS |
| API-13 | API | AC-09, BR-23 | Claim of an unowned New ticket | Status also becomes Open; claim from other statuses leaves status unchanged | server/tests/lab-03/staff-ticket-detail.api.test.ts | PASS |
| API-14 | API | AC-10 | IT Priority update | Staff persists; Requester 403; Requested Priority never writable | server/tests/lab-03/staff-ticket-detail.api.test.ts | PASS |
| API-15 | API | AC-11 | Status transitions | Legal 200; illegal 422; out of Closed/Cancelled 422; Requester Resolved/Closed 403 | server/tests/lab-03/staff-ticket-detail.api.test.ts | PASS |
| API-16 | API | AC-07 | Appears-resolved signal | Sets appearsResolvedAt; repeat 409; cleared by the next staff transition | server/tests/lab-03/comments-notes.api.test.ts | PASS |
| API-17 | API | AC-12 | Comment and note validation | Empty, whitespace-only and over-limit 400; author and time server-set | server/tests/lab-03/comments-notes.api.test.ts | PASS |
| API-18 | API | AC-13, AC-14 | Admin list, search, filter, create | Correct subset; duplicate email 409; email differing only in case also 409; invalid role 400; **a successfully created user comes back with `mustChangePassword` true and no password echoed** | server/tests/lab-03/users-admin.api.test.ts | PASS |
| API-19 | API | AC-15, AC-16 | Admin guards and reset | Self-deactivation checked before last-admin, both 409; reset sets the flag **and the reset user's next login is then refused entry to any normal endpoint until a new password is saved**, proving the gate actually engages rather than just the flag being written | server/tests/lab-03/users-admin.api.test.ts | PASS |
| API-20 | API | AC-20, BR-21 | Login throttling | 6th failure inside the window → 429 with wording identical to 401; success resets the counter. Uses the throttle's test-only reset in `beforeEach` so it cannot pollute API-02, API-03 and API-05, which share this file and also drive failed logins | server/tests/lab-03/auth.api.test.ts | PASS |
| API-21 | API | AC-21, BR-24 | Deactivation and demotion cascade | Deactivated user's next request 401; their non-terminal tickets become unassigned; count reported. **The same assertions run for a role change out of a staff role**, which BR-24 treats identically and which would otherwise strand tickets on an owner absent from the assignee list | server/tests/lab-03/users-admin.api.test.ts | PASS |
| API-22 | API | AC-22, BR-13 | Requester reopen | Own Resolved → Reopened 200; another user's → 403; from Closed → 422 | server/tests/lab-03/authorization.api.test.ts | PASS |
| API-23 | API | AC-23, BR-26 | Resolution Summary required | Resolve without a summary → 400 RESOLUTION_SUMMARY_REQUIRED; with one it persists and is visible to the requester | server/tests/lab-03/staff-ticket-detail.api.test.ts | PASS |
| API-24 | API | AC-24, BR-25 | Self-service prevention | Staff acting on a ticket they filed → 403 SELF_SERVICE_FORBIDDEN for claim, priority, status and notes; their own comment and appears-resolved still succeed | server/tests/lab-03/authorization.api.test.ts | PASS |
| API-25 | API | AC-25, FR-27 | Any role may file a ticket | IT Staff and Admin create succeeds and appears in their own list | server/tests/lab-03/authorization.api.test.ts | PASS |
| API-26 | API | AC-26, BR-27 | Migrated requester behaviour (post-migration only) | Migrated user logs in with the documented initial password, is gated, and still owns their Lab 2 tickets. Scoped deliberately to behaviour **after** migration, because a stubbed Prisma client cannot prove anything about what the migration did to real rows | server/tests/lab-03/migration.api.test.ts | PASS |
| M-01 | Migration | AC-17 | Real-database preservation evidence | Run against the development database, not a stub. Capture row counts for User, Ticket and Attachment before and after; assert every ticket number is byte-identical to its pre-migration value; assert every attachment's `sizeBytes` and a checksum of its `data` column round-trip unchanged; assert every ticket's requester still resolves to the same person. Procedure and captured output recorded in §6 | server/prisma/migration-evidence (script + recorded output) | PASS |
| API-27 | API | AC-17 | Lab 2 regression under auth | Per BR-28: retired tests are gone, adapted tests pass after their mechanical identity swap, unchanged tests pass untouched | server/tests/lab-02/* + client/src/\_\_tests\_\_/lab-02/* (re-run) | PASS |
| C-01 | UI | AC-01, AC-02 | Login form | Inline errors; no submit when invalid; one identical safe banner for 401 and 429 | client/src/\_\_tests\_\_/lab-03/Login.test.tsx | PASS |
| C-02 | UI | AC-03, AC-19 | Change-password gate | Gate renders; live checklist ticks per rule; Save disabled until all rules and confirm pass | client/src/\_\_tests\_\_/lab-03/ChangePassword.test.tsx | PASS |
| C-03 | UI | AC-08 | Queue wiring | Debounced search, filters, pagination rendered; owner filter defaults to All | client/src/\_\_tests\_\_/lab-03/StaffTicketQueue.test.tsx | PASS |
| C-04 | UI | AC-09, AC-10, AC-11, AC-23 | Detail operations | Owner, priority and status controls issue PATCH; illegal targets absent; Resolved requires a summary | client/src/\_\_tests\_\_/lab-03/StaffTicketDetail.test.tsx | PASS |
| C-05 | UI | AC-05, AC-12, AC-24 | Comments versus notes | Distinct surfaces; notes hidden for a Requester and for the ticket's own filer; operational card replaced by the explanatory panel | client/src/\_\_tests\_\_/lab-03/StaffTicketDetail.test.tsx | PASS |
| C-06 | UI | AC-13, AC-14, AC-15 | User Management | Search, filter, create, edit, reset plus guard messages and the deactivation count confirmation | client/src/\_\_tests\_\_/lab-03/UserManagement.test.tsx | PASS |
| C-07 | UI | AC-22, FR-21 | Requester detail additions | Reopen shown only on Resolved; appears-resolved confirmation; resolution summary read-only when present; notes section never rendered | client/src/\_\_tests\_\_/lab-03/RequesterTicketDetail.test.tsx | PASS |
| C-08 | UI | AC-27, FR-19, FR-27 | Shell navigation and route guards | Each role sees only its permitted destinations; Create Ticket present for every role; a guarded route renders forbidden rather than the screen | client/src/\_\_tests\_\_/lab-03/AppShell.test.tsx | PASS |
| S-01 | Style | AC-18 (ui-spec §1) | Zen Green tokens and badges | Tokens, focus rings and badge labels present; terminal statuses render neutral | client/src/\_\_tests\_\_/lab-03/\*.test.tsx | PASS |
| S-02 | UI | AC-18 | Distinct screen states | For the queue, the staff detail and the users screen: loading, empty, no-results, forbidden and failure each render distinguishable content, and empty is never confused with no-results — the state coverage AC-18 requires, which tokens and scroll-width assertions do not reach | client/src/\_\_tests\_\_/lab-03/\*.test.tsx | PASS |
| R-01 | Responsive | AC-18 | No horizontal scroll | scrollWidth ≤ innerWidth at 1366, 768 and 375 for all five screens | e2e/lab-03/\*.spec.ts | PASS |
| E-01 | E2E | AC-01, AC-03, AC-06, AC-26 | Auth, first login, logout | Gate enforced; logout blocks direct navigation and cookie replay | e2e/lab-03/authentication.spec.ts | PASS |
| E-02 | E2E | AC-07, AC-08..AC-12, AC-22, AC-23 | Staff flow end to end | Queue → detail → claim → prioritise → advance → resolve with summary → comment and note → requester reopens | e2e/lab-03/staff-ticket-flow.spec.ts | PASS |
| E-03 | E2E | AC-13..AC-16, AC-21 | Admin flow end to end | Search, filter, create, edit, reset, guards, deactivation cascade, forbidden for other roles | e2e/lab-03/user-administration.spec.ts | PASS |

Server tests live in `server/tests/lab-03/`. Client tests live in `client/src/__tests__/lab-03/` (normalised per Lab 2 A9). E2E specs live in `e2e/lab-03/`. All file names in the handout §12 tree are present; `RequesterTicketDetail.test.tsx` and `AppShell.test.tsx` are additions, which §12 permits since it specifies a *minimum* structure.

### Lab 2 test disposition (BR-28)

Every Lab 2 test falls into one of three groups. Nothing is skipped or disabled — that would violate the Definition of Done — so a test whose subject is gone is deleted outright, and a test whose subject survives is edited only where the identity mechanism beneath it changed.

**Retired (deleted).** The behaviour under test no longer exists:

| File | Why it cannot survive |
|---|---|
| `server/tests/lab-02/requesters.api.test.ts` | Asserts `GET /api/requesters` returns 200 and stubs `prisma.requesterUser`; the endpoint is removed and the model dropped, so the stub target does not exist and the file cannot load |
| `client/src/__tests__/lab-02/RequesterSelection.test.tsx` | Imports the Requester Selection component and its context, both deleted |
| `e2e/lab-02/requester-ticket-flow.spec.ts` | Selector-driven throughout; this empties `e2e/lab-02/`, and E2E regression is carried entirely by `e2e/lab-03/` from here on |

**Adapted (mechanically edited, assertions unchanged).** The subject survives; only how identity reaches it changes:

| File(s) | Edit |
|---|---|
| `server/tests/lab-02/{attachments,create-ticket,my-tickets,ticket-detail}.api.test.ts` | Two mechanical edits, not one. First, 30 `X-Requester-Id` header calls become authenticated session cookies. Second, **14 `prisma.requesterUser` stubs become `prisma.user` stubs** — the dropped model would otherwise be `undefined` and `vi.spyOn` would throw at module load, which is the same failure that retires `requesters.api.test.ts`. The difference is that these four files still have a surviving subject, so they are repaired rather than deleted. The `AUTH_REQUIRED` assertion in `my-tickets` stays valid because `api-spec.md` §1 pins that code |
| `client/src/__tests__/lab-02/{CreateTicket,MyTickets}.test.tsx` | The `RequesterProvider` test wrapper becomes the auth provider; the component assertions are untouched |
| `client/src/__tests__/lab-02/{AttachmentSection,RequesterTicketDetail}.test.tsx` | Both render their component with a `requesterId` prop, and both components use it to build `X-Requester-Id` headers on four fetch calls. FR-20 deletes that header, so the prop disappears and these tests must drop it and rely on the session instead |
| `client/src/__tests__/lab-02/{App,AppHeader}.test.tsx` | Shell assertions move from selector and Change Requester to authenticated identity and Logout — the heaviest of the adaptations, since the shell's whole premise changes |

**Unchanged.** Everything else, including all Lab 1 tests and `ticket-number.unit.test.ts`. Note that **every** Lab 2 file touching identity is now accounted for above; a file silently left in this bucket while depending on the selector or the identity header is the failure mode that broke earlier drafts of this plan twice.

The disposition list, with before/after counts per group, is recorded in §6 as part of the regression evidence. Retiring the Lab 2 browser spec also invalidates the `npx playwright test e2e/lab-02` command in the README and the evidence paths cited in `docs/lab-02/tests.md`; both must be annotated as superseded by `e2e/lab-03`, so the final `main` does not read as though graded Lab 2 evidence went missing.

### Disposition as executed (auth foundation slice, #37)

The table above was a hypothesis written before implementation; this records what the slice
actually did, and where the two differ. The disposition ran in the auth-foundation slice rather
than the requester-regression slice that follows it, because #37's own acceptance criteria
cannot be satisfied while a header is still able to identify a caller: the change-password gate
and the `AUTH_REQUIRED` criterion both require that the session cookie is the only identity,
so the header had to go together with the cookie that replaces it.

| Group | Predicted | Executed |
|---|---|---|
| Retired | `requesters.api.test.ts`, `RequesterSelection.test.tsx`, `e2e/lab-02/requester-ticket-flow.spec.ts` | All three, plus the three `e2e/evidence/` capture specs |
| Adapted, server | 30 header calls, 14 `requesterUser` stubs | 29 header calls, 14 stub references |
| Adapted, client | Provider swap on two files, prop removal on two, shell rewrite on two | The same six, plus five list assertions in `MyTickets.test.tsx` |
| Unchanged | Everything else, Lab 1 included | Held: all Lab 1 tests and `ticket-number.unit.test.ts` untouched |

Four corrections to the predicted table:

* **The header count was 29, not 30.** One of the thirty was a test *title* naming the header
  rather than a call sending it. The title was reworded; only 29 calls existed to change.
* **Five assertions needed a change the "provider swap" line did not cover.** The Lab 2 list
  tests asserted `toHaveBeenCalledWith(url, expect.anything())`, where the second argument
  existed only to hold the identity header. With identity in the cookie the call takes a URL and
  nothing else, so each of those five assertions had to drop its second argument. This is the
  third time a round of review has found the disposition table incomplete, and the cause is the
  same each time: the table tracks which files change and not which assertions do.
* **`e2e/evidence/` had to retire with `e2e/lab-02/`.** The table named only the Lab 2 flow spec,
  but all three evidence-capture specs drive the selector and the identity header end to end -- 21
  references across the four files. A spec that throws on every run is neither passing nor
  skipped, and the Definition of Done permits no skipped test, so they are deleted under the same
  rule. The figures they produced are unaffected and stay committed under `artifacts/lab-02/`.
  This leaves no browser suite until #42 writes `e2e/lab-03/`; `e2e/README.md` records that.
* **`App.test.tsx` and `AppHeader.test.tsx` were adapted, not retired.** Their subject is the
  application shell, which survives; only the identity beneath it changed. They now ask the same
  questions of the session that they asked of the selector. `AppShell.test.tsx` under `lab-03/`
  carries C-08's role-filtering and guard assertions, which have no Lab 2 equivalent.

Counts after the slice: **78 server tests across 10 files** and **73 client tests across 13
files**, all passing, none skipped. Lab 2 server tests went from 34 in 9 files to 26 in 8 files,
the difference being the eight retired tests in `requesters.api.test.ts`.

The Issue #37 review fixes added 22 tests on top of those counts (+11 server / +11 client = 22 total: 78->89 server, 73->84 client): **89 server tests across
10 files** (the logout-500 replay extension to the existing revocation-failure test, plus eleven
new tests in `auth.api.test.ts`: the logout config-fault 500 test, the parallel-admission
throttle test, one multipart-allowlist test, four unknown-API-route tests, two
`GET /api/health` liveness-exception tests and two `GET /api/categories` BR-29-exception
tests) and **84 client
tests across 14 files** (new `AuthContext.test.tsx` with four sign-out contract tests, three
`AppHeader` sign-out navigation tests proving a failed sign-out stays put, and four
`ChangePassword` additions — the trailing-space special-character case, the 72-byte ceiling
case, the gate sign-out-failure message and the trailing-space-confirmation match case). The BR-29 exception they pin
is the approved carve-out from BR-02's change-password gate: `GET /api/categories` stays public
for anonymous callers and gated users alike, while the authenticated reference endpoints stay
gated.

## 3. Acceptance-Criterion Traceability

| AC | Tests |
|---|---|
| AC-01 | API-01, C-01, E-01 |
| AC-02 | API-02, API-03, C-01 |
| AC-03 | API-04, API-05, C-02, E-01 |
| AC-04 | API-07, API-08 |
| AC-05 | API-08, API-09, C-05 |
| AC-06 | API-06, E-01 |
| AC-07 | API-16, E-02 |
| AC-08 | API-10, API-11, C-03, E-02 |
| AC-09 | API-12, API-13, C-04, E-02 |
| AC-10 | API-14, C-04, E-02 |
| AC-11 | U-02, API-15, C-04, E-02 |
| AC-12 | API-17, C-05, E-02 |
| AC-13 | API-18, C-06, E-03 |
| AC-14 | API-18, C-06 |
| AC-15 | API-19, C-06, E-03 |
| AC-16 | API-19, E-03 |
| AC-17 | M-01, API-27 |
| AC-18 | S-01, S-02, R-01, E-01, E-02, E-03 |
| AC-19 | U-01, API-05, C-02 |
| AC-20 | API-20, C-01 |
| AC-21 | API-21, E-03 |
| AC-22 | API-22, C-07, E-02 |
| AC-23 | API-23, C-04, E-02 |
| AC-24 | API-24, C-05 |
| AC-25 | API-25, C-08 |
| AC-26 | API-26, E-01 |
| AC-27 | C-08, E-01 |
| AC-28 | API-06 |

Every AC maps to at least one test, and every test names at least one AC.

## 4. Responsive and Visual Checklist

Per screen (Login, Change Password, Staff Queue, Staff Detail, Users) at 1366×768, 768×1024 and 375×667: tokens match; editable versus read-only distinct; public versus internal unmistakable; validation placement correct; button and busy states correct; badges consistent; no clipping, overlap or horizontal scroll; empty versus no-results versus forbidden distinct; keyboard-only pass. Evidence lands in `artifacts/lab-03/screenshots/*`.

## 5. Test Commands

```bash
cd server && npm test                    # full server suite (Prisma stubbed, except the Lab 1 API-02 categories test, which needs the seeded DB)
cd server && npx vitest run tests/lab-03 # Lab 3 server tests only
cd server && npx vitest run tests/lab-02 # Lab 2 regression
cd client && npm test                    # client suite
npx playwright test e2e/lab-03           # E2E (requires a running, seeded stack)
```

E2E and migration-evidence precondition: `docker compose up -d db`, then from `server/`: `npx prisma migrate deploy` (or `migrate reset --force` for a clean run) followed by `npm run db:seed`. Seeded credentials are documented in the README and are local-development only.

## 6. Final Results

### Auth-foundation slice evidence (#37, `feature/lab3-3-auth-foundation`)

This is the historical auth-foundation slice record. The release-slice results
below are the final measured results for this branch; none were skipped or disabled:

* Server: **89 tests across 10 files** — 88 passing with the Prisma client stubbed and no
  database; the single failure is the inherited Lab 1 `API-02.categories`, which calls
  `GET /api/categories` without a stub and therefore needs the seeded database (`docker compose
  up -d db` + `prisma:migrate` + `db:seed`, per the §5 precondition). With the seeded DB it
  passes, giving 89/89.
* Client: **84 tests across 14 files, all passing** (`fetch` mocked, no backend needed).
* Lab 2 disposition as executed (§2): retired suites gone, adapted suites green under the
  session cookie, unchanged suites (Lab 1 modulo the DB precondition above, plus
  `ticket-number.unit.test.ts`) untouched.

### Release-slice evidence (#42, `feature/lab3-8-e2e-visual`)

Run date: **2026-09-19**. The branch is based on `origin/lab3-staging` at
`0a36448`. No tests were skipped, disabled, focused or marked as expected.

| Suite | Command | Result |
|---|---|---|
| Server | `npm test --prefix server` | **185/185 passed**, 15 files |
| Client | `npm test --prefix client -- --maxWorkers=1` | **135/135 passed**, 18 files |
| Browser regression | `npx playwright test e2e/lab-03 --project=chromium` | **6/6 passed**, 3 specs; E-01, E-02 and E-03 journeys plus visual captures |
| Formatting (touched scope) | `npm run check -- e2e/lab-03 client/src/components/StaffTicketQueue.tsx client/src/index.css` | **Pass**, 6 files |

The browser run writes 3 viewport captures for authentication, staff queue,
staff ticket detail and user management under
`artifacts/lab-03/screenshots/`. Authentication also includes the three
forced-change-password captures. The direct API authorization evidence is
`artifacts/lab-03/authorization.json`: requester notes 403, cross-owner
ticket access 403, and staff self-filed owner/note operations 403.

### Lab 2 disposition and migration evidence

The Lab 2 disposition is complete under BR-28: the selector-driven requester
browser suite and evidence-capture specs were retired; surviving server/client
tests were mechanically adapted to session-cookie identity; unchanged Lab 1
and non-identity tests were left untouched. The Lab 2 server/client regression
is included in the green counts above, and the retired command is annotated in
`docs/lab-02/tests.md` and `e2e/README.md`.

M-01 is recorded in
`server/prisma/migration-evidence/README.md` from the real database:

| Check | Before | After | Result |
|---|---:|---:|---|
| Account rows (RequesterUser then User) | 5 | 11 | PASS |
| Ticket rows | 92 | 92 | PASS |
| Attachment rows | 72 | 72 | PASS |
| Tickets missing after migration | 0 | 0 | PASS |
| Ticket numbers changed | 0 | 0 | PASS |
| Ticket requesters changed | 0 | 0 | PASS |
| Attachment bytes changed (md5 and sizeBytes) | 0 | 0 | PASS |

The remaining release integration acceptance is deliberately pending: per the
request for this implementation, no pull request was opened and no
`lab3-staging`-to-`main` merge was performed. The local branch and commit
contain all browser, visual, authorization, disposition and migration
evidence that can be completed without that release PR.

## 7. Known Limitations

No manual-only captures were required; the release evidence is fully represented by the
automated server, client, browser, screenshot and authorization results above.
