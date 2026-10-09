# Lab 4 Test and Evidence Plan

Status: **Draft contract for peer review**<br>
Version: **1.0**<br>
Date: **2026-09-22**<br>
Branch: `feature/lab4-1-contract`<br>
Issue: [#54](https://github.com/Snnn3/TokTickIT/issues/54)

This plan precedes implementation. **Planned** means not implemented/run, not
passing. FR/BR/AC meanings come from specification.md and exact outcomes from
api-spec.md. Implementation replaces Planned with measured results and links.

## 1. Planned inventory

| ID | Layer | AC mapping | Planned test file / evidence path | Scenario | Expected result | Status |
|---|---|---|---|---|---|---|
| U4-01 | Unit | AC-01, AC-04, AC-06, AC-07, AC-13 | `server/tests/lab-04/workflow.unit.test.ts` | All action/Ticket edges, text/follow-up limits and fixed-clock boundaries | Exact valid/invalid matrix; blank completion ACTION_RESULT_REQUIRED | Planned |
| API4-01 | API | AC-02, AC-03, AC-05, AC-06, AC-10, AC-16 | `server/tests/lab-04/actions-taken.api.test.ts` | Staff/Admin create/edit, own-ticket restriction, forged performer, all fields, eligible assignees | 201/200 authorized; 400/403/404/422 per contract; server actor | Planned |
| API4-02 | API | AC-04, AC-07, AC-08, AC-09, AC-10, AC-14, AC-16 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Full Ticket matrix, resolution prerequisites, summary preservation, reopen, advisory; owner/priority/status/reopen/signal versions | Correct state and timestamps; stale writes change nothing | Planned |
| API4-03 | API | AC-10, AC-11, AC-13, AC-16 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Two owners, zero/populated data, recent updated/resolved/attention and drill-down | Own-only metrics/lists; null legacy resolvedAt excluded from recent | Planned |
| API4-04 | API | AC-10, AC-12, AC-13, AC-16 | `server/tests/lab-04/staff-dashboard.api.test.ts`; `staff-actions-list.api.test.ts`; `server/tests/lab-03/staff-queue.api.test.ts` | Staff/Admin metrics, all-status grouping, actionable recent Tickets and current-performer actions; filtered queue/actions | Counts match authoritative fixtures; terminal Tickets cannot displace actionable recent work; Requester403; latest5/ties/bounds | Passed — 32 focused tests, 2026-10-08 |
| API4-05 | Real DB integration | AC-05, AC-14, AC-15, AC-16 | `server/tests/lab-04/concurrency.integration.test.ts` | Two editors, create replay/lost response, same key changed payload, assignment vs deactivation/demotion races | One create/event;409 on stale/key conflict; no partial changes; proper cascade versions | Planned |
| API4-06 | API | AC-10, AC-22 | `server/tests/lab-04/action-history.api.test.ts` | Create/edit/transition/cascade event actors and immutable public history; comments/notes regression | Stable order; no event update/delete; requester sees no internal notes | Planned |
| C4-01 | Component | AC-03, AC-05, AC-06, AC-10, AC-17 | `client/src/__tests__/lab-04/ActionsTaken.test.tsx` | Staff/Admin writes, requester read-only, fields/follow-up, assignee options and feedback states | Correct controls/errors; draft retained; disabled repeated submit | Passed — 18 tests, including deep-link focus recovery, 2026-10-08 |
| C4-02 | Component | AC-11, AC-13, AC-18 | `client/src/__tests__/lab-04/RequesterDashboard.test.tsx` | Cards/lists, own filters, fixed-bound drill-down, loading/empty/failure | Server counts rendered; correct URLs and Bangkok display | Planned |
| C4-03 | Component | AC-12, AC-13, AC-18 | `client/src/__tests__/lab-04/StaffDashboard.test.tsx` | Staff/Admin cards, all-status grouping, actionable recent-ticket drill-down with `statusGroup=open`, current-performer list, empty/loading/forbidden/failure/refresh | Correct destinations; previous snapshot labelled during refresh/failure | Passed — 6 tests, 2026-10-09 |
| C4-04 | Component | AC-07, AC-08, AC-09, AC-14, AC-15, AC-17 | `client/src/__tests__/lab-04/TicketWorkflow.test.tsx` | Resolve/reopen/advisory, versions, stale reload/compare and lost-response replay | State/summary refresh; no silent overwrite or new replay key | Planned |
| V4-01 | Style/responsive/a11y | AC-17, AC-18, AC-23 | `client/src/__tests__/lab-04/Accessibility.test.tsx`; `e2e/lab-04/visual-accessibility.spec.ts` | Zen Green, labels, keyboard/dialog focus, status cues, 3 viewports, console/links | No unexpected errors, clipping/overlap/overflow; readable screenshots | Planned |
| E4-01 | E2E | AC-03, AC-04, AC-05, AC-06, AC-10, AC-17, AC-22 | `e2e/lab-04/actions-taken-flow.spec.ts` | Staff and Admin record different actions under one Ticket; assign/edit/complete/cancel/history | End-to-end fields, performer, follow-up, terminal and authorization evidence | Planned |
| E4-02 | E2E | AC-07, AC-08, AC-09, AC-10, AC-19 | `e2e/lab-04/ticket-resolution.spec.ts` | Real requester/staff resolution gate, reopen and advisory, comments/notes/attachments | Correct lifecycle; requester sees public history only | Planned |
| E4-03 | E2E | AC-10, AC-11, AC-12, AC-13, AC-18 | `e2e/lab-04/dashboards.spec.ts` | Both role dashboards, empty/populated, actionable recent-ticket list, drill-down/browser-back and isolation | Metrics match database queries and detail lists; terminal Tickets do not crowd out actionable work; Bangkok times | Partial — Staff/Admin 9/9 passed before this review fix; updated actionable-ticket expectations await rerun because Docker is unavailable; Requester dashboard pending Issue #60 |
| E4-04 | E2E | AC-14, AC-15, AC-17 | `e2e/lab-04/concurrent-edit.spec.ts` | Two sessions stale parent/action and lost create response | 409 with drafts preserved and explicit reload/review; one created record | Planned |
| M4-01 | Migration real DB | AC-02, AC-13, AC-21 | `server/prisma/migration-evidence/lab4-actions.md` | Legacy backup/apply/compare/restore in isolated databases | All prior data/hash values preserved; versions1; zero actions; recovery readable | Passed — disposable PostgreSQL run |
| M4-02 | Seed real DB | AC-02, AC-05, AC-11, AC-12, AC-21, AC-22 | `server/prisma/migration-evidence/lab4-actions.md`; `server/tests/lab-04/seed-fixtures.test.ts` | Run seed twice; zero/one/many action/status/priority/ownership/time fixtures | Stable counts and events; no unrelated user/data overwrite | Passed — repeat seed and fixture assertions |
| P4-01 | Performance smoke | AC-12, AC-18 | `server/tests/lab-04/dashboard-performance.integration.test.ts`; `artifacts/lab-04/staff-dashboard-performance.json` | 10k Tickets/30k actions; both endpoints and query plans on documented local fixture | 20 warm requests each p95 <=1000ms; <=64KiB responses; no N+1/unbounded collections | Partial — Staff endpoint passed, 2026-10-08; Requester endpoint pending Issue #60 |
| R4-01 | Regression | AC-19 | `server/tests/`; `client/src/__tests__/`; `e2e/lab-02/`; `e2e/lab-03/`; `server/prisma/migration-evidence/lab4-actions.md` | Auth, requester, attachments, comments, private notes, queue/detail, Admin guards and authenticated browser journeys | All existing behavioral assertions pass after documented additive fixture adaptations | Passed — server isolated 348/348 (2026-10-08); client 182/182 (2026-10-09); Lab 2/3 Playwright 13/13 (prior regression run) |
| D4-01 | Contract audit | AC-01, AC-20 | `docs/lab-04/reviewer.md` | PDF/Issue54 six-doc alignment, exact inverse mappings, approval/merge evidence | Draft gaps resolved; peer approval and contract merge recorded before implementation PR completion | Planned |
| REL4-01 | Release/manual | AC-18, AC-19, AC-23 | `docs/lab-04/reviewer.md`; `README.md` | Product DoD, actual main test results, setup/demo/recovery, visual checklist and final report | All evidence linked; no invented approvals/results; report Parts1-9 | Planned |

Manual/document rows use evidence paths instead of claiming an automated test.
Real-DB tests must provision disposable fixtures; mocked Prisma tests alone
cannot prove foreign keys, transaction races, migration preservation or recovery.

## 2. Reverse traceability

| AC | Planned tests |
|---|---|
| AC-01 | U4-01, D4-01 |
| AC-02 | API4-01, M4-01, M4-02 |
| AC-03 | API4-01, C4-01, E4-01 |
| AC-04 | U4-01, API4-02, E4-01 |
| AC-05 | API4-01, API4-05, C4-01, E4-01, M4-02 |
| AC-06 | U4-01, API4-01, C4-01, E4-01 |
| AC-07 | U4-01, API4-02, C4-04, E4-02 |
| AC-08 | API4-02, C4-04, E4-02 |
| AC-09 | API4-02, C4-04, E4-02 |
| AC-10 | API4-01, API4-02, API4-03, API4-04, API4-06, C4-01, E4-01, E4-02, E4-03 |
| AC-11 | API4-03, C4-02, E4-03, M4-02 |
| AC-12 | API4-04, C4-03, E4-03, M4-02, P4-01 |
| AC-13 | U4-01, API4-03, API4-04, C4-02, C4-03, E4-03, M4-01 |
| AC-14 | API4-02, API4-05, C4-04, E4-04 |
| AC-15 | API4-05, C4-04, E4-04 |
| AC-16 | API4-01, API4-02, API4-03, API4-04, API4-05 |
| AC-17 | C4-01, C4-04, V4-01, E4-01, E4-04 |
| AC-18 | C4-02, C4-03, V4-01, E4-03, P4-01, REL4-01 |
| AC-19 | E4-02, R4-01, REL4-01 |
| AC-20 | D4-01 |
| AC-21 | M4-01, M4-02 |
| AC-22 | API4-06, E4-01, M4-02 |
| AC-23 | V4-01, REL4-01 |

Both directions must contain exactly the same pairs, not merely mention every
ID somewhere. D4-01 checks unknown IDs, missing IDs and mismatched pairs.
Review all issue/PDF requirements as well: matching an incomplete AC set is
not proof that the handout is covered.

## 3. Required fixtures and assertions

Use two Requesters, two active Staff, an inactive Staff, and two Administrators.
Include self-requested Staff/Admin Tickets and third-party Tickets. Test
Admin performer success separately from Admin assignee rejection. Show the
Ticket Owner differing from performedBy and assignee.

Actions: all four statuses; zero/one/many per Ticket; followUpRequired true
with valid/blank/missing note; optional attachment notes; boundary-length text;
whitespace result; escaped markup. Exercise every permitted/forbidden matrix edge.
Null assignment is valid. After account demotion/deactivation, active assignments
clear atomically while terminal history retains identity; test races with assignment.

Dashboard clock: freeze asOf, test exactly from=asOf-168h, one millisecond before,
exactly asOf, and future records. Old Tickets updated recently must appear.
Test more than five rows with equal timestamps for id DESC ties. Null legacy
resolvedAt must not invent recent resolution. Test counts independently against
SQL predicates and then verify drill-down totals using the same snapshot bounds.

Concurrency: each versioned Ticket route, action edit, action create, and Admin
cascade must have real concurrent requests. Assert no partial fields/audit writes.
Replay identical create key/payload after a simulated lost response: same response,
one row/event. Changed payload with the same key:409 IDEMPOTENCY_CONFLICT.
Failed creation does not consume the key. UI retains draft on recoverable failure,
reloads current data on conflict and requires explicit review before resubmission.

History: creation and edits by different Staff/Admin leave original performedBy
unchanged but record each event actor. Comments/notes remain append-only.
Requester reads all own public action items/events; private notes remain hidden.

## 4. Regression disposition

No Lab 1-3 feature tests are retired. Adapt:
- Resolution fixtures to include a completed Action Taken with result.
- Workflow request fixtures to supply versions and assert returned versions.
- StaffTicketDetail.test.tsx assertions that previously required Actions Taken
  to be absent: assert the new panel and correct role restrictions instead.
- AppShell/navigation/landing tests to include the appropriate dashboards.
- Account-edit fixtures to include action-release counts/cascade behavior.

Retain all prior assertions on auth/session invalidation, forced password change,
ownership, ticket numbering, attachment bytes/atomicity/removal, comments/notes,
queue filters, priority, and Admin self-deactivation/last-admin guards.
Record file-level adaptation in implementation reviewer evidence; never skip tests
solely to achieve a green run.

## 5. Migration, seed and recovery procedure

1. Create an isolated database from the Lab 3 schema and representative legacy
   users/Tickets/attachments/comments/notes; inventory row values and byte hashes.
2. Back it up and apply the Lab 4 migration with the normal Prisma deploy path.
3. Compare all legacy fields, IDs and hashes; assert version1, no actions/events
   and null unknown resolvedAt. Read legacy Ticket/detail APIs.
4. Create and mutate new actions, exercise FK constraints and atomic versions.
5. Run seed twice and compare counts/event histories and unrelated rows.
6. Restore the pre-migration backup into a second disposable database and compare
   the original inventory and Lab 3 reads. Record tools, commands and output.
7. Keep recovery evidence distinct from rollback after new production writes;
   backup restoration does not promise preservation of writes made after backup.

## 6. Commands and measured evidence

### Issue #59 Staff Dashboard review fixes — 2026-10-08

Branch: `feature/lab4-6-staff-dashboard`, based on `origin/lab4-staging`.
The review-fix run includes the working-tree changes after `6374ea1`.

- `npm run test:isolated --prefix server`: 20 files, 348/348 tests passed.
  A new migrated PostgreSQL container supplies the four categories needed by
  the inherited Lab 1 test; no existing database was seeded or reset.
- `npm test --prefix client -- --maxWorkers=1`: 21 files, 174/174 tests passed.
- `npm run test:e2e:staff-dashboard`: 8/8 Chromium journeys passed, with
  real login/session/database fixtures and screenshots under
  `artifacts/lab-04/screenshots/staff-dashboard/`.
- `npm run test:dashboard-performance --prefix server`: 2/2 real-database
  tests passed. The fixed-clock test includes both inclusive window edges,
  one millisecond before/after, and matching Ticket/action drill-down totals.
  The performance smoke compares Staff snapshot counts to independent SQL on exactly
  10,000 Tickets / 30,000 Actions Taken. Three warmups precede 20 measured
  requests at concurrency 1; p95 was 90.48 ms against the 1,000 ms budget.
  Every response was 3,840 bytes, below 64 KiB; query count is 15 for both small and large
  fixtures, and the two ordered collection reads have database LIMITs.
  Runtime, CPU/RAM, samples, emitted SQL and EXPLAIN ANALYZE/BUFFERS plans are
  recorded in `artifacts/lab-04/staff-dashboard-performance.json`.
- Server build, client build and client lint passed.
- The new Playwright configuration, runner and spec passed TypeScript checking
  using the existing server Node type definitions.
- Regression tests cover all queue choices and pagination through detail/back
  and reload, action deep-link focus without stealing editor focus after a
  conflict reload, and dashboard mobile controls at least 44 by 44 pixels.
- Four additional controlled-response tests reproduce and protect against
  stale queue success, forbidden, failure and loading updates after filters
  are cleared. Only the latest request may update the displayed queue.
- Changed-branch formatting and `git diff --check` passed. Repository-wide
  `npm run check` still fails with 60 formatter diagnostics across 142 checked
  files; those diagnostics are outside this branch's changed files. No
  repository-wide formatting rewrite was performed.

The Staff part of E4-03/P4-01 is evidenced; neither row claims Requester
Dashboard completion. Issue #60 must supply that endpoint's remaining checks.
These are branch results, not final main/release evidence or peer approval.

### Issue #59 follow-up review fixes — 2026-10-09

The follow-up Spec review reproduced five P2 gaps. Client changes now:

- Invalidate local authentication on dashboard/action-list `AUTH_REQUIRED`
  responses and return to the originally requested route after login, including
  query and fragment.
- Guard every action-list response state (success, forbidden, error and loading)
  against obsolete requests after browser Back or query changes.
- Hide incompatible queue sort controls while date filtering enforces newest-first
  order, and explain the fixed sort until the date filters are cleared.
- Wrap valid 120-character unbroken action titles without mobile page overflow.
- Give action-list links, buttons and selects mobile touch targets of at least
  44 by 44 pixels.

Verification on the client changes: 22 test files / 182 tests passed;
Staff/Admin dashboard Playwright 9/9 passed; client build and source-scoped lint
passed. The focused auth-continuation test also covers the fragment-preservation
case raised during self-review. This does not complete the Requester Dashboard
portion of E4-03 or P4-01; that remains Issue #60 work.

Repository-root commands (existing scripts):
~~~text
npm run check
npm test --prefix server
npm test --prefix client
npm run lint --prefix client
npm run build --prefix server
npm run build --prefix client
npm run test:e2e
npm run prisma:generate --prefix server
~~~

In server/ against the explicitly selected disposable test database:
~~~text
npx prisma migrate deploy
npx prisma migrate status
npm run db:seed
npm run db:seed
~~~

The repeated seed calls are part of M4-02, not a request to seed a shared database.
Migration/seed/performance suites above are planned and must be implemented before
running their final commands. Record Node/Postgres versions, fixture size, CPU/RAM,
clock, command, commit, exit code and measured test counts.

Performance acceptance: on the documented local PostgreSQL fixture, warm up each
dashboard, measure 20 requests at concurrency1, p95 <=1000ms and <=64KiB response.
Inspect query count/plans for N+1 or full application-side collection loading.
If the agreed lab environment cannot meet this budget, peer-review a revised
budget with measurements before marking completion; never invent a passing result.

## 7. Visual and release evidence

Capture 1366x900, 768x1024, 375x812 under:
- artifacts/lab-04/screenshots/staff-dashboard/
- artifacts/lab-04/screenshots/requester-dashboard/
- artifacts/lab-04/screenshots/actions-taken/

Include populated/empty/loading/validation/busy/success/forbidden/conflict/not-found/
failure states, Admin action success, inactive-assignee rejection, read-only history,
follow-up errors, Bangkok time, drill-down, keyboard/focus and clipping checks.
Each image/evidence record names role, route, test ID, viewport and expected result.
Remove E2E fixture users only from their isolated test dataset.

Final evidence comes from main after feature -> lab4-staging -> main integration.
README must document setup, seed, migration/recovery, test and demo steps.
reviewer.md records real peer identities, comments/responses, PR links and approvals.
Final report uses Answer Part1-9 headings as spelled in the PDF, including spaces
("Answer Part 1" through "Answer Part 9"), readable figures and working links.
