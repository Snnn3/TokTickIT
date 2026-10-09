# Lab 4 - Peer Review Record

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Chanon Lhumsa-ard | 67070501059 | [@Snnn3](https://github.com/Snnn3) |
| Peer reviewer | Worawut Sereethai | 67070501040 | [@YummieGG](https://github.com/YummieGG) |

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| https://github.com/Snnn3/TokTickIT/pull/63 | feature/lab4-1-contract | Approved - merged into `lab4-staging` on 2026-09-30 |
| https://github.com/Snnn3/TokTickIT/pull/64 | feature/lab4-2-actions-foundation | Approved - merged into `lab4-staging` on 2026-10-01 |
| https://github.com/Snnn3/TokTickIT/pull/65 | feature/lab4-3-actions-api | Changes requested, then approved - merged into `lab4-staging` on 2026-10-05 |
| https://github.com/Snnn3/TokTickIT/pull/66 | feature/lab4-4-ticket-workflow | Approved - merged into `lab4-staging` on 2026-10-07 |
| https://github.com/Snnn3/TokTickIT/pull/67 | feature/lab4-5-actions-ui | Approved - merged into `lab4-staging` on 2026-10-08 |

### Reviewer comments I received and how I responded

**PR #63 - feature/lab4-1-contract** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-09-30):** Reviewed the six Lab 4 companion documents against Issue #54 and the Lab 4 handout. The contract, agreed design decisions, authorization matrix, lifecycle rules, and bidirectional mapping of 23 acceptance criteria to 89 planned test pairs were accepted. The reviewer noted that commit `0158b6b` added `CONTEXT.md` and `skills-lock.json`, so the PR description needed that minor correction.
- **My comment (2026-09-30):** Thanked the reviewer, acknowledged the documentation note, and recorded that PR #63 had merged into `lab4-staging`, completing the contract phase and unblocking implementation.
- **Merge:** Merged into `lab4-staging` at `2026-09-30 12:23 UTC`.

**PR #64 - feature/lab4-2-actions-foundation** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-10-01):** Approved the schema constraints, legacy-data preservation, idempotent seed fixtures, migration evidence, and regression suite for Issue #55. The review verified 190 server tests, 135 client tests, and 13 Playwright tests at that time.
- **Merge:** Merged into `lab4-staging` at `2026-10-01 16:16 UTC`.

**PR #65 - feature/lab4-3-actions-api** (MERGED)
- **Reviewer review (YummieGG, CHANGES_REQUESTED, 2026-10-04):** Accepted the Actions Taken API design, authorization/body precedence, optimistic concurrency, and audit logging. Requested a missing `prisma.actionTaken.findMany` mock in the Lab 3 admin deactivation/demotion regression fixture, which otherwise tried to reach PostgreSQL in isolated tests, plus documentation updates.
- **Response (2026-10-05):** Added the Action query stub to the existing regression test and recorded the review response here. The targeted deactivation/demotion cases passed (2/2) without a database connection. The PR comment at the time reported 244/245 server tests passing; the remaining Lab 1 seeded-category test required PostgreSQL.
- **Final GitHub state:** PR #65 is approved and merged into `lab4-staging` at `2026-10-05 09:11 UTC`. Its final approval review text refers to PR #64 and Issue #55, so that text is not treated here as additional PR #65-specific review evidence.

**PR #66 - feature/lab4-4-ticket-workflow** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-10-07):** Approved the Issue #57 workflow and resolution gate. The review verified the complete transition matrix and terminal protection, resolution prerequisites, requester advisory/reopen behavior, optimistic concurrency and conflict recovery, and the related API/client/E2E tests.
- **My comment (2026-10-07):** Thanked the reviewer for the detailed review and help getting PR #66 merged.
- **Merge:** Merged into `lab4-staging` at `2026-10-07 09:15 UTC`.

**PR #67 - feature/lab4-5-actions-ui** (MERGED)
- **Implementation:** Adds the Issue #58 Actions Taken panel to requester and staff Ticket details, with read-only requester history, role-aware writes, validation, and conflict recovery. No server or schema changes.
- **Peer review (YummieGG, APPROVED, 2026-10-08):** Accepted action cardinality, transitions, immutable performer identity, follow-up validation, requester read-only behavior, conflict recovery and idempotency. The peer verified 17 Actions Taken component tests and 158 client tests at that implementation head, and requested the C4-01 test-plan status update.
- **Merge:** Merged into `lab4-staging` at `2026-10-08 04:10 UTC`.
- **Verification:** Results for the implementation head are recorded below. The PR description also discloses the repository-wide `npm run check` failure.

## Verification for Issue #58

The following results were run on implementation head `fea80f0` on 2026-10-08, before this reviewer-record update:

- Server: `npm test --prefix server` - 18 files, 332 tests passed.
- Client: `npm test --prefix client -- --maxWorkers=1` - 19 files, 158 tests passed.
- Playwright: `npm run test:e2e` - 13 tests passed.
- Client lint, server build, client build, and Prisma Client generation passed.
- `npm run check` failed with 74 repository-wide formatter diagnostics across 121 checked files. The output includes line-ending normalization differences; the check did not modify files, and this repo-wide formatting issue is not resolved by the Issue #58 change.

---

## Verification for Issue #59 review fixes

On 2026-10-08, the Staff Dashboard branch addressed the local review
`review-feature-lab4-6-staff-dashboard.md`:

- Added authoritative all-Ticket status grouping in the dashboard snapshot,
  zero-filled all eight statuses, rendered status links to the filtered queue,
  and aligned the API/UI specification and focused tests.
- Added eight isolated browser journeys for Staff/Admin authorization,
  Requester denial, populated/empty states, performer isolation, drill-downs,
  reload/browser-back, detail/action focus, loading/stale/retry, Bangkok time
  and desktop/tablet/mobile evidence.
- Added the real PostgreSQL 10,000-Ticket/30,000-action performance smoke,
  independent SQL count comparisons, constant query-count/response-size checks,
  and recorded EXPLAIN plans. The measured Staff p95 was 90.48 ms,
  with 15 queries at both fixture sizes and 3,840-byte responses.
- Added fixed-clock real-database coverage of both inclusive seven-day
  boundaries, one-millisecond exclusions and matching drill-down totals.
- Extracted the four reported duplications: open-status predicates, public
  user projection, paired UTC date-range validation, and recent-link bounds.
- Self-review found and fixed four further acceptance gaps: deep-link focus
  stealing editor focus on reload, incomplete queue URL persistence, undersized
  mobile controls, and missing exact-window real-database coverage. Focused
  regressions were reproduced before the fixes. A follow-up Standards/Spec
  review found no remaining actionable findings in this scope. Shared action
  summary selection/serialization and active-action predicates were also
  extracted following the Standards suggestions.
- A final URL-state review identified a response-order race after clearing
  search on a later page. Request-generation guards now ignore stale success,
  forbidden, failure and loading updates; four reproduced regressions pass.
  The follow-up Standards check confirmed the race fix.

Verification: server 348/348, client 174/174, dashboard Playwright 8/8,
real-database integration 2/2 (boundary and performance); both builds and client lint passed. Test commands
and limitations are recorded in `tests.md`; measured SQL/runtime evidence is
in `artifacts/lab-04/staff-dashboard-performance.json`.

Changed-branch formatting and whitespace checks pass. Repository-wide
`npm run check` still reports 60 existing formatter diagnostics outside the
changed files. Existing Lab 2/3 browser tests were retained but not rerun as
part of this dashboard-specific verification.

No Issue #59 PR or peer approval is claimed. Requester dashboard tests remain
Issue #60 work; the combined E4-03/P4-01 rows stay partially complete.

### Subsequent Issue #59 review — 2026-10-09

A later Spec pass reported five remaining P2 gaps after the earlier follow-up
verification. The branch now invalidates local auth on `AUTH_REQUIRED` and
returns through login to the full requested URL; ignores obsolete action-list
success/error/loading responses; explains and locks date-filtered queue ordering;
wraps long unbroken action titles; and provides 44px mobile targets on the action
list. Tests cover each behavior, including a real-browser 120-character title at
375px and an expired-session destination with query and fragment.

The independent Standards review found no actionable issues. The Spec re-review
confirmed the five P2 fixes and identified one P3 test gap around fragment
preservation; that case was added and verified. My final diff review checked the
auth continuation, request-generation guards across all response branches,
date-sort request parameters and mobile sizing rules. No remaining actionable
finding was identified in this scope.

Final verification after the test-harness typing fix:

- Client: 22 files, 182/182 tests passed.
- Staff/Admin dashboard Playwright: 9/9 passed; the E2E TypeScript check passed.
- Client production build passed.
- `npm run lint --prefix client -- src` passed, as did changed-path formatting
  and `git diff --check`.
- The unscoped `npm run lint --prefix client` exited nonzero after reporting
  third-party diagnostics from `client/node_modules`; source-scoped lint is
  clean. No dependency or lint-configuration changes were made.

No server code changed, and no Issue #59 PR, peer approval or merge is claimed.
Requester Dashboard coverage remains Issue #60 work.

### Subsequent Issue #59 review — actionable recent Tickets (2026-10-09)

The remaining P2 Spec finding is fixed: the dashboard's recent-ticket query now
uses the same actionable/open Ticket statuses as the queue's `statusGroup=open`
filter. The recent-list "View all" link carries that status group together with
the original updated-date snapshot bounds. The Staff/Admin dashboard API test
asserts the status predicate, and the component test verifies the matching
drill-down URL. A disposable-PostgreSQL regression test also creates older
actionable Tickets behind five newer terminal Tickets and compares the dashboard
list with its queue drill-down.

Verification on this working tree:

- Staff dashboard API tests: 7/7 passed; dashboard component tests: 6/6 passed.
- Client suite: 22 files, 182/182 passed; server and client builds passed.
- The full server Vitest run completed 19/20 files and 347/348 tests. Its only
  failure was the existing Lab 1 categories test, which returned 500 because
  the local database was not provisioned with the seeded categories.
- Client source lint and changed-path formatting/whitespace checks passed.
- Docker Desktop's engine did not respond (`docker info` could not connect to
  `dockerDesktopLinuxEngine`). Therefore the disposable-PostgreSQL regression,
  isolated server suite, and updated dashboard Playwright suite were not run;
  the database/E2E verification remains pending.

The Standards review still has no actionable findings. This resolves the
actionable-recent-Ticket Spec finding; Requester Dashboard work remains Issue
#60 scope. No PR, peer approval, or merge is claimed.

---

## Pull Requests I reviewed for my partner

No Lab 4 partner PRs have been recorded yet.

### My comments and partner's responses

No Lab 4 partner review comments or responses have been recorded yet.
