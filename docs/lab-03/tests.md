# Lab 3 Test Plan and Results

Version: 1.2 | Date: 2026-09-10 | Companion to `specification.md` (AC refs) and `api-spec.md`.

## 1. Test Strategy

TDD-first: this plan is authored together with the specification and **before** implementation. Each issue starts with failing tests, then the minimal implementation to green, then refactor.

### Test seams

Lab 3 reuses the seams already established in Lab 2 rather than introducing new ones. There are three, and no test reaches below them into internal functions:

| Seam | Prior art in this repo | Used for |
|---|---|---|
| Supertest against the exported Express `app`, with the Prisma client stubbed via `vi.spyOn` | `server/tests/lab-02/create-ticket.api.test.ts`, `my-tickets.api.test.ts` | every API, authorization and regression test — no live database required, so the suite runs anywhere |
| React Testing Library rendering a component with `fetch` mocked | `client/src/__tests__/lab-02/MyTickets.test.tsx`, `CreateTicket.test.tsx` | every UI component and style test |
| Playwright driving the real stack against a seeded database | `e2e/lab-02/requester-ticket-flow.spec.ts` | the three end-to-end specs and responsive assertions |

Tests assert externally observable behaviour — status codes, response bodies, cookies, rendered text and roles — never internal call shapes. Two helpers are pure enough to test directly as units: the password policy validator and the status-transition matrix.

**Migration evidence is deliberately not a mocked test.** Asserting a migration against a stubbed Prisma client would prove nothing, so `migration.api.test.ts` covers the *behavioural* consequences of migration (a migrated requester can log in, is gated, and still owns their tickets), while the row-count preservation evidence is captured by running the migration against the real development database and recording before/after counts in §6, alongside a full re-run of the Lab 2 suite as regression.

### Levels covered

Unit, API/integration, UI component, UI style, responsive, security/authorization, migration/regression, and end-to-end. The plan covers valid and invalid login, inactive accounts, throttling, password boundaries and complexity, logout and session invalidation, role navigation, direct API authorization, Requester regression, queue queries, ownership and claim behaviour, IT Priority, the status matrix, resolution summary, self-service prevention, comments and notes visibility, administrator safety guards, and safe failures.

## 2. Planned Tests

| ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| U-01 | Unit | BR-07, AC-19 | Password policy: trim, 8/72 boundaries, each complexity rule | 7 chars, 73 bytes, and each missing character class rejected with the rule named; compliant accepted | server/tests/lab-03/auth.api.test.ts (helper) | TBD |
| U-02 | Unit | BR-13, AC-11 | Transition matrix helper incl. terminal states | Legal targets pass; illegal and any transition out of Closed/Cancelled rejected | server/tests/lab-03/staff-ticket-detail.api.test.ts (helper) | TBD |
| API-01 | API | AC-01 | Valid login | 200 user + httpOnly cookie set | server/tests/lab-03/auth.api.test.ts | TBD |
| API-02 | API | AC-02 | Invalid credentials | 401 INVALID_CREDENTIALS generic | server/tests/lab-03/auth.api.test.ts | TBD |
| API-03 | API | AC-02 | Inactive account login | 401 identical to API-02, no enumeration | server/tests/lab-03/auth.api.test.ts | TBD |
| API-04 | API | AC-03 | Change-required gate | Normal APIs 403 PASSWORD_CHANGE_REQUIRED; me/change-password/logout allowed | server/tests/lab-03/auth.api.test.ts | TBD |
| API-05 | API | AC-03, AC-19 | Password change boundaries and complexity | Short, mismatched, or missing a character class → 400 with details; valid clears the flag | server/tests/lab-03/auth.api.test.ts | TBD |
| API-06 | API | AC-06, FR-30 | Logout, then cookie replay | Logout 204; `me` 401 after; **the pre-logout cookie replayed is also 401** (tokenVersion) | server/tests/lab-03/auth.api.test.ts | TBD |
| API-07 | API | AC-04 | Authenticated identity beats client-supplied id | Body/query requesterId ignored; own data only | server/tests/lab-03/authorization.api.test.ts | TBD |
| API-08 | API | AC-04, AC-05 | Requester blocked from notes, staff and admin routes | 403 with no content leak; notes response reveals nothing about existence | server/tests/lab-03/authorization.api.test.ts | TBD |
| API-09 | API | AC-05 | Staff and Admin note access | 200 with content for both roles (D2) | server/tests/lab-03/comments-notes.api.test.ts | TBD |
| API-10 | API | AC-08 | Queue search, filter, sort, page | Correct slice + metadata; unfiltered default includes unassigned | server/tests/lab-03/staff-queue.api.test.ts | TBD |
| API-11 | API | AC-08 | Queue invalid params | 400 INVALID_QUERY with per-param details | server/tests/lab-03/staff-queue.api.test.ts | TBD |
| API-12 | API | AC-09 | Claim, assign, reassign owner | Valid persists; inactive or wrong-role target 422 INVALID_OWNER | server/tests/lab-03/staff-ticket-detail.api.test.ts | TBD |
| API-13 | API | AC-09, BR-23 | Claim of an unowned New ticket | Status also becomes Open; claim from other statuses leaves status unchanged | server/tests/lab-03/staff-ticket-detail.api.test.ts | TBD |
| API-14 | API | AC-10 | IT Priority update | Staff persists; Requester 403; Requested Priority never writable | server/tests/lab-03/staff-ticket-detail.api.test.ts | TBD |
| API-15 | API | AC-11 | Status transitions | Legal 200; illegal 422; out of Closed/Cancelled 422; Requester Resolved/Closed 403 | server/tests/lab-03/staff-ticket-detail.api.test.ts | TBD |
| API-16 | API | AC-07 | Appears-resolved signal | Sets appearsResolvedAt; repeat 409; cleared by the next staff transition | server/tests/lab-03/comments-notes.api.test.ts | TBD |
| API-17 | API | AC-12 | Comment and note validation | Empty, whitespace-only and over-limit 400; author and time server-set | server/tests/lab-03/comments-notes.api.test.ts | TBD |
| API-18 | API | AC-13, AC-14 | Admin list, search, filter, create | Correct subset; duplicate email 409; invalid role 400 | server/tests/lab-03/users-admin.api.test.ts | TBD |
| API-19 | API | AC-15, AC-16 | Admin guards and reset | Self-deactivation and last-admin 409; reset sets the flag | server/tests/lab-03/users-admin.api.test.ts | TBD |
| API-20 | API | AC-20, BR-21 | Login throttling | 6th failure inside the window → 429 with wording identical to 401; success resets the counter. Uses the throttle's test-only reset in `beforeEach` so it cannot pollute API-02, API-03 and API-05, which share this file and also drive failed logins | server/tests/lab-03/auth.api.test.ts | TBD |
| API-21 | API | AC-21, BR-24 | Deactivation cascade | Deactivated user's next request 401; their non-terminal tickets become unassigned; count reported | server/tests/lab-03/users-admin.api.test.ts | TBD |
| API-22 | API | AC-22, BR-13 | Requester reopen | Own Resolved → Reopened 200; another user's → 403; from Closed → 422 | server/tests/lab-03/authorization.api.test.ts | TBD |
| API-23 | API | AC-23, BR-26 | Resolution Summary required | Resolve without a summary → 400 RESOLUTION_SUMMARY_REQUIRED; with one it persists and is visible to the requester | server/tests/lab-03/staff-ticket-detail.api.test.ts | TBD |
| API-24 | API | AC-24, BR-25 | Self-service prevention | Staff acting on a ticket they filed → 403 SELF_SERVICE_FORBIDDEN for claim, priority, status and notes; their own comment and appears-resolved still succeed | server/tests/lab-03/authorization.api.test.ts | TBD |
| API-25 | API | AC-25, FR-27 | Any role may file a ticket | IT Staff and Admin create succeeds and appears in their own list | server/tests/lab-03/authorization.api.test.ts | TBD |
| API-26 | API | AC-26, BR-27 | Migrated requester behaviour | Migrated user logs in with the documented initial password, is gated, and still owns their Lab 2 tickets | server/tests/lab-03/migration.api.test.ts | TBD |
| API-27 | API | AC-17 | Lab 2 regression under auth | Every Lab 2 test **not retired under BR-28** re-runs green with cookie auth substituted for X-Requester-Id | server/tests/lab-02/* + client/src/\_\_tests\_\_/lab-02/* (re-run) | TBD |
| C-01 | UI | AC-01, AC-02 | Login form | Inline errors; no submit when invalid; one identical safe banner for 401 and 429 | client/src/\_\_tests\_\_/lab-03/Login.test.tsx | TBD |
| C-02 | UI | AC-03, AC-19 | Change-password gate | Gate renders; live checklist ticks per rule; Save disabled until all rules and confirm pass | client/src/\_\_tests\_\_/lab-03/ChangePassword.test.tsx | TBD |
| C-03 | UI | AC-08 | Queue wiring | Debounced search, filters, pagination rendered; owner filter defaults to All | client/src/\_\_tests\_\_/lab-03/StaffTicketQueue.test.tsx | TBD |
| C-04 | UI | AC-09, AC-10, AC-11, AC-23 | Detail operations | Owner, priority and status controls issue PATCH; illegal targets absent; Resolved requires a summary | client/src/\_\_tests\_\_/lab-03/StaffTicketDetail.test.tsx | TBD |
| C-05 | UI | AC-05, AC-12, AC-24 | Comments versus notes | Distinct surfaces; notes hidden for a Requester and for the ticket's own filer; operational card replaced by the explanatory panel | client/src/\_\_tests\_\_/lab-03/StaffTicketDetail.test.tsx | TBD |
| C-06 | UI | AC-13, AC-14, AC-15 | User Management | Search, filter, create, edit, reset plus guard messages and the deactivation count confirmation | client/src/\_\_tests\_\_/lab-03/UserManagement.test.tsx | TBD |
| C-07 | UI | AC-22, FR-21 | Requester detail additions | Reopen shown only on Resolved; appears-resolved confirmation; resolution summary read-only when present; notes section never rendered | client/src/\_\_tests\_\_/lab-03/RequesterTicketDetail.test.tsx | TBD |
| C-08 | UI | AC-27, FR-19, FR-27 | Shell navigation and route guards | Each role sees only its permitted destinations; Create Ticket present for every role; a guarded route renders forbidden rather than the screen | client/src/\_\_tests\_\_/lab-03/AppShell.test.tsx | TBD |
| S-01 | Style | AC-18 (ui-spec §1) | Zen Green tokens and badges | Tokens, focus rings and badge labels present; terminal statuses render neutral | client/src/\_\_tests\_\_/lab-03/\*.test.tsx | TBD |
| R-01 | Responsive | AC-18 | No horizontal scroll | scrollWidth ≤ innerWidth at 1366, 768 and 375 for all five screens | e2e/lab-03/\*.spec.ts | TBD |
| E-01 | E2E | AC-01, AC-03, AC-06, AC-26 | Auth, first login, logout | Gate enforced; logout blocks direct navigation and cookie replay | e2e/lab-03/authentication.spec.ts | TBD |
| E-02 | E2E | AC-07, AC-08..AC-12, AC-22, AC-23 | Staff flow end to end | Queue → detail → claim → prioritise → advance → resolve with summary → comment and note → requester reopens | e2e/lab-03/staff-ticket-flow.spec.ts | TBD |
| E-03 | E2E | AC-13..AC-16, AC-21 | Admin flow end to end | Search, filter, create, edit, reset, guards, deactivation cascade, forbidden for other roles | e2e/lab-03/user-administration.spec.ts | TBD |

Server tests live in `server/tests/lab-03/`. Client tests live in `client/src/__tests__/lab-03/` (normalised per Lab 2 A9). E2E specs live in `e2e/lab-03/`. All file names in the handout §12 tree are present; `RequesterTicketDetail.test.tsx` and `AppShell.test.tsx` are additions, which §12 permits since it specifies a *minimum* structure.

### Retired Lab 2 tests (BR-28)

Three Lab 2 test groups assert behaviour this sprint deliberately removes, so they are **deleted, not skipped** — skipping them would violate the "no skipped or disabled tests" rule in the Definition of Done, and they cannot be repaired because the thing they test is gone:

| Retired | Why it cannot survive |
|---|---|
| `server/tests/lab-02/requesters.api.test.ts` | Asserts `GET /api/requesters` returns 200 and stubs `prisma.requesterUser`; that endpoint is removed and that model is dropped, so the stub target no longer exists and the file cannot even load |
| `client/src/__tests__/lab-02/RequesterSelection.test.tsx` | Imports the Requester Selection component and its context, both deleted; the client suite would fail to compile |
| Selector-driven browser specs in `e2e/lab-02/` and `e2e/evidence/` | Drive the selector UI and the `X-Requester-Id` header; their coverage is replaced by `e2e/lab-03/authentication.spec.ts` |

Every other Lab 2 test must pass unchanged under cookie authentication. The retirement list, with before/after counts, is recorded in §6 as part of the regression evidence.

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
| AC-17 | API-27, API-26 |
| AC-18 | S-01, R-01, E-01, E-02, E-03 |
| AC-19 | U-01, API-05, C-02 |
| AC-20 | API-20, C-01 |
| AC-21 | API-21, E-03 |
| AC-22 | API-22, C-07, E-02 |
| AC-27 | C-08, E-01 |
| AC-23 | API-23, C-04, E-02 |
| AC-24 | API-24, C-05 |
| AC-25 | API-25, C-08 |
| AC-26 | API-26, E-01 |

Every AC maps to at least one test, and every test names at least one AC.

## 4. Responsive and Visual Checklist

Per screen (Login, Change Password, Staff Queue, Staff Detail, Users) at 1366×768, 768×1024 and 375×667: tokens match; editable versus read-only distinct; public versus internal unmistakable; validation placement correct; button and busy states correct; badges consistent; no clipping, overlap or horizontal scroll; empty versus no-results versus forbidden distinct; keyboard-only pass. Evidence lands in `artifacts/lab-03/screenshots/*`.

## 5. Test Commands

```bash
cd server && npm test                    # full server suite (Prisma stubbed, no DB needed)
cd server && npx vitest run tests/lab-03 # Lab 3 server tests only
cd server && npx vitest run tests/lab-02 # Lab 2 regression
cd client && npm test                    # client suite
npx playwright test e2e/lab-03           # E2E (requires a running, seeded stack)
```

E2E and migration-evidence precondition: `docker compose up -d db`, then from `server/`: `npx prisma migrate deploy` (or `migrate reset --force` for a clean run) followed by `npm run db:seed`. Seeded credentials are documented in the README and are local-development only.

## 6. Final Results

TBD — to be filled after implementation from the final `main` branch, including the migration row counts before and after and the full passing output. No skipped or disabled tests are permitted.

## 7. Known Limitations

TBD — record any manual-only captures here (for example a backend-down banner), as in Lab 2 §7.
