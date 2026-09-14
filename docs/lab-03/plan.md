# Lab 3 Execution Plan — TokTickIT Auth, Staff Workflow, Admin

Version: 2.1 | Date: 2026-09-13 | Owner: student (Snnn3), drafted with AI agent
Versioning: this plan previously ran an independent 3.x sequence; from this revision every document in `docs/lab-03/` carries the same version number and bumps together, so a reader can tell at a glance whether the set is coherent.
Source: `material/Lab_3_sheet.pdf` (CPE 334, Lab 3) + student-approved decisions + `docs/lab-03/specification.md` **v2.0**.
Tracker: GitHub issues #35–#42 on Kanban project 1 (see `.agents/AGENTS.md` + `.agents/agents/issue-tracker.md`).
Tracked plan document: versioned with the `docs/lab-03/` set and reviewed in its PRs. The bare `plan.md` gitignore pattern predates this slice and does not untrack this already-tracked path, so the "local-only, never in a PR" note it once carried no longer holds; local-only scratch stays out via `.reviews/` and `migration-evidence/snapshot.before.json` instead.

## 1. Sprint Goal

Replace the dev selector with JWT-cookie auth + 3 roles, ship the staff queue/detail workflow and minimalist admin user management, keep Lab 2 green as regression.

## 2. Contract status

| Revision | What it did | State |
|---|---|---|
| v1.0 | First contract draft | Superseded; PR #43 closed unmerged by author |
| v1.1 | Resolved the handout's internal contradictions after a grilling pass | Committed `415da52` |
| v1.2 | Fixed 11 findings from the first review | Committed `415da52` |
| v1.3 | Fixed 13 findings from the second review, two of them defects introduced by v1.2 | Committed `eed4759` |
| v1.4 | Fixed 12 findings from the third review plus one unverified requirement clause; again two were defects introduced by the previous round | Committed `2b052ea` |
| v1.5 | **Peer review by @YummieGG on PR #44** (CHANGES_REQUESTED): DoD still gated on AC-27 after AC-28 existed, the assignees endpoint had no authorization-matrix row, the terminal-owner exception had no decision, and four ACs were mapped to tests that did not actually assert them | Committed, awaiting re-review |
| v1.6 | **Second peer review by @YummieGG** (CHANGES_REQUESTED again): bootstrap docs claimed `.env.example` and README content that did not exist; v1.5 had put byte-preservation assertions on a *mocked* test; PR metadata stale at v1.3 | Committed, awaiting re-review |
| v1.7 | **Internal-consistency audit**: ten cross-document contradictions, two of them half-applied fixes from earlier rounds (BR-22 vs the CSRF exemption; staff reopen not clearing the Resolution Summary) | Committed, awaiting re-review |
| v1.8 | **Third peer review by @YummieGG** (CHANGES_REQUESTED): the contract called itself Approved with no approval recorded; reference endpoints missing from the authorization matrix; logout contract self-contradictory; PR description stale. `My Reflection` written | Committed `e105a48` |
| v1.9 | **Fourth round: APPROVED** at head `d09355b`; status Draft to Approved, approval recorded in `reviewer.md` | Merged in PR #44 |
| v2.0 | Records the PR #45 review (one CHANGES_REQUESTED round on a flaky evidence capture, then APPROVED at `757038c`) and the #36 merge that unblocked #37. Phase marker: 1.x was contract authoring and repair, 2.x records what implementation did | On `feature/lab3-3-auth-foundation` |

**PR #44** (`feature/lab3-1-contract` → `lab3-staging`) was approved at head `d09355b` on 2026-09-10 16:01 after three CHANGES_REQUESTED rounds and a self-initiated consistency audit, and merged at 16:04, closing #35. **PR #45** (`feature/lab3-2-refactor`) was approved at head `757038c` on 2026-09-12 12:07 and merged, closing #36. Both ordering preconditions are therefore satisfied: the contract and the repository-wide format pass are on `lab3-staging` before any implementation branch forks, which is the handout Part 2 evidence that the specification predated the implementation PRs.

## 3. Decisions and where they land

The authoritative list is `specification.md` §11 (D1–D22). The decisions that shape the work:

| ID | Decision | Lands in |
|---|---|---|
| D2 | Administrator is a **superset** of IT Staff; separation is navigational | #40, #41 |
| D3 | `appearsResolvedAt` timestamp replaces the boolean | #37 schema, #38 signal |
| D4 | Requester may reopen their own **Resolved** ticket | #38 |
| D5 | `tokenVersion` for real session invalidation | #37, consumed by #41 |
| D6 | Password complexity per the §8.1 mockup, live checklist | #37 |
| D7 | Format-only pass, merged **before** the feature branches fork | #36 |
| D8 | react-router with route guards | #37 owns the shell so #38/#39/#41 fork in parallel |
| D9 | Migrated users share one documented local-dev password + forced change | #37 |
| D11 | Resolution Summary required to resolve; no Service Actions tab | #40 |
| D12 | Shared queue defaulting to all tickets | #39 |
| D13 | In-memory, self-expiring login throttle with a test reset seam | #37 |
| D16 | Claiming an unowned New ticket sets it Open | #40 |
| D17 | Deactivation unassigns non-terminal tickets and kills the session | #41 |
| D18 | Any role may file tickets; no self-service on own tickets | #38 files, #40 guards |

Added by the review rounds (three agent passes, two peer rounds, one consistency audit):

| Item | Lands in | Why it exists |
|---|---|---|
| `GET /api/staff/assignees` | #40 | The Owner select is used by IT Staff, but the user list is Administrator-only — without this the reassign flow is unimplementable for the role that performs it |
| `AUTH_REQUIRED` pinned as the 401 code | #37 | A surviving Lab 2 test asserts that exact string |
| Email lower-cased on write + migration collision abort | #37 storage, #41 admin writes | A plain unique index on Postgres text is case-sensitive, so BR-09 would not actually hold |
| `ownedOpenTicketCount` on the user list | #41 | The deactivation dialog must name a count *before* the change; nothing supplied it |
| Retired / adapted / unchanged test disposition | #38 does it, #42 records it | "Full Lab 2 suite green" and "no skipped tests" were mutually impossible as written |
| Staff detail readable for a self-filed ticket, notes still refused | #40 | Otherwise the queue's Open action dead-ends on a 403 |
| CSRF content-type check exempts body-less requests | #37 | Otherwise logout returns 415 and is impossible, since a browser sends no content type for a body-less fetch |
| Wrong current password returns 403, not 401 | #37 | A 401 interceptor would read a typo as an expired session and bounce the user out of the form |
| Reopening clears the Resolution Summary | #40 | Otherwise the second resolution cycle reuses the explanation the Requester already rejected |
| Role demotion cascades like deactivation | #41 | A demoted owner breaks BR-10, vanishes from the assignee list, and is refused on the staff routes for their own assigned work |
| BR-15 check order, plus a second seeded Administrator | #37 seed, #41 guards | With one Administrator every last-admin case is also a self-deactivation, so `LAST_ADMIN` was unreachable |
| Users table gains a Reset password row action | #41 | The dialog and its test existed with no control to open them |
| D22: terminal Tickets keep their historical owner | #37 schema, #41 cascade | Peer review flagged the §4.5 departure as undocumented; scrubbing owners off Closed Tickets would destroy the record of who handled them, and blocking deactivation instead is a dead end with bulk operations excluded |
| S-02 screen-state test row | #39, #40, #41 | AC-18 claims distinct empty / no-results / forbidden / failure states, which token and scroll-width assertions never reached |
| README and `docs/lab-02` annotated as superseded | #42 | Retiring the Lab 2 browser spec breaks a documented command and shipped evidence paths |

## 4. Stack

Server: Express 5 + Prisma 6 + PostgreSQL (host port 5434) + bcryptjs + jsonwebtoken + cookie-parser.
Client: React 19 + Vite 8 + Bootstrap 5 + **react-router** + Testing Library. E2E: Playwright.
New dependencies: `bcryptjs`, `jsonwebtoken`, `cookie-parser` (+ `@types/*`) server-side; `react-router-dom` client-side.
New env keys in `server/.env.example`: `JWT_SECRET`, `SEED_INITIAL_PASSWORD` (README holds the authoritative seed password value).

## 5. Branch / Workflow Model

```text
main
 └── lab3-staging
      ├── feature/lab3-1-contract          (MERGED — PR #44 approved at v1.8/d09355b, closed #35)
      ├── feature/lab3-2-refactor          (MERGED — PR #45 approved at 757038c, closed #36)
      ├── feature/lab3-3-auth-foundation   (current — forked from the formatted, contract-approved lab3-staging)
      ├── feature/lab3-4-requester-regression
      ├── feature/lab3-5-staff-queue
      ├── feature/lab3-6-staff-operations
      ├── feature/lab3-7-user-management
      └── feature/lab3-8-e2e-visual
 └── release PR: lab3-staging -> main
```

Rules: never commit on `main` or `lab3-staging` directly; every merge is a peer-reviewed PR; Kanban Backlog → Specified → Started → PR Review → Fixing → Done. Commits carry **no AI co-author trailers** — authorship is the student's, and AI use is disclosed in `ai-use.md` instead.

**Ordering constraint:** #35 then #36 must both be merged to `lab3-staging` before #37 forks.

## 6. Issues and Deliverables

| Ticket | Branch | Key deliverables | Blocked by |
|---|---|---|---|
| #35 | lab3-1-contract | Contract v1.7: specification, api-spec, ui-spec, tests, reviewer | none — **in review now** |
| #36 | lab3-2-refactor | Formatter config + one mechanical format pass. No lint-rule fixes, no oxlint removal, zero behaviour change, Lab 1+2 green | #35 |
| #37 | lab3-3-auth-foundation | `User` + `tokenVersion`; migration with email normalisation and collision abort; 8-value status enum; idempotent seed at §5.3 minimums; login/logout/me/change-password; `AUTH_REQUIRED`; throttle with reset seam; password policy; react-router shell, AuthContext, guards, Login and Change Password screens | #36 |
| #38 | lab3-4-requester-regression | Remove selector and all seven `X-Requester-Id` sites; filing opened to every role; Public Comments; appears-resolved; reopen; **Lab 2 test disposition executed** | #37 |
| #39 | lab3-5-staff-queue | Queue API reusing the Lab 2 query contract + responsive queue UI + tests | #37 |
| #40 | lab3-6-staff-operations | Assignees endpoint; claim with auto-Open; IT Priority; status matrix; Resolution Summary; self-service guard (read allowed, notes refused); staff detail UI; comments and notes | #39 |
| #41 | lab3-7-user-management | Admin users API + UI + guards; email normalisation on write; `ownedOpenTicketCount`; deactivation cascade | #37 |
| #42 | lab3-8-e2e-visual | 3 Playwright specs, screenshots at 3 viewports × 4 screens, disposition + migration counts recorded, `tests.md` §6 filled, staging → main release PR | #38, #40, #41 |

Work the frontier. #38, #39 and #41 run in parallel once #37 lands.

## 7. Test-First Discipline

Failing tests first, minimal implementation, refactor green. Seams are fixed and reused from Lab 2 — Supertest against the exported `app` with Prisma stubbed, RTL with `fetch` mocked, Playwright against a seeded stack (`tests.md` §1).

Files: `server/tests/lab-03/`, `client/src/__tests__/lab-03/`, `e2e/lab-03/`, using the handout §12 names plus two additions the §12 *minimum* permits — `RequesterTicketDetail.test.tsx` and `AppShell.test.tsx`.

**Lab 2 disposition (BR-28)** — three groups, nothing skipped:

* **Retired:** `requesters.api.test.ts`, `RequesterSelection.test.tsx`, `e2e/lab-02/requester-ticket-flow.spec.ts` (this empties `e2e/lab-02/`).
* **Adapted:** the four Lab 2 server API suites — **two** edits each: 30 header calls → session cookies, and 14 `prisma.requesterUser` stubs → `prisma.user`, without which they fail at module load exactly like the retired file. Client side: `CreateTicket`/`MyTickets` (provider swap), `App`/`AppHeader` (selector assertions → authenticated identity; the heaviest), and `AttachmentSection`/`RequesterTicketDetail` (drop the `requesterId` prop).
* **Unchanged:** everything else, including all Lab 1 tests.

28 acceptance criteria, each mapped to ≥1 test in both directions.

## 8. Submission Evidence Map (60 pts)

The PDF must use the literal headings "Answer Part 1" through "Answer Part 9", in order, with working links.

| Part | Pts | Evidence source |
|---|---|---|
| 1 Git workflow | 10 | Branch/merge history into `lab3-staging` then `main`, Kanban all-Done, rendered `reviewer.md`, README + `.gitignore`, repo tree |
| 2 Spec DD | 5 | `specification.md` v1.7 + proof PR #44 merged before the implementation PRs |
| 3 Test DD | 10 | `tests.md` incl. §3 traceability, real file paths, full green output from `main` |
| 4 AI use | 5 | `ai-use.md` — LLM named, 6–10 key prompts, "My Reflection" |
| 5 Login + password UI | 5 | `artifacts/lab-03/screenshots/authentication/` + E-01 |
| 6 Staff queue UI | 5 | `artifacts/lab-03/screenshots/staff-queue/` + C-03, E-02 |
| 7 Staff detail UI | 10 | `artifacts/lab-03/screenshots/staff-ticket-detail/` + direct-API authorization evidence (API-08, API-22, API-24) |
| 8 Admin UI | 5 | `artifacts/lab-03/screenshots/user-management/` + API-19, API-21, E-03 |
| 9 Zen Green + responsive | 5 | `ui-spec.md` + four screenshot directories at three viewports + the §11 visual checklist |

## 9. Notes / Risks

* **The contract has been through three agent reviews and one human peer review.** The agent rounds found 36 problems; @YummieGG then found four more that all three had missed — including a Definition of Done gating on AC-27 one revision after AC-28 was added. Agent review and human review catch different classes of defect; do not treat either as a substitute for the other. Three agent rounds found 36 problems, and *each* round found defects in the previous round's fixes — twice on the Lab 2 disposition table alone. Findings are narrowing (round 1: an unreachable flow; round 3: a missing button in a column list), so hand it to the human reviewer rather than running a fourth agent pass. The disposition table in particular is a hypothesis until #38 actually runs the suites.
* `TicketStatus` is still a single-value enum, hard-coded in the Prisma schema, the query validator in `server/src/routes/tickets.ts`, and the client union type. #37 must change all three; the Lab 2 `status=NEW` query test is the canary.
* `X-Requester-Id` lives in one server middleware and six client fetch call sites. #38 must clear all seven or Lab 2 regression breaks silently.
* Server tests stub Prisma, so no test needs a database. Keep it that way — only the migration row-count evidence and E2E use the real database.
* `reviewer.md` is complete as of `641ab5f` (both peer rounds quoted with responses, plus the approval given on YummieGG/toktickit#45). `ai-use.md` still has prompts 6–8 and the reflection as TBD; Part 4 is 5 points and cannot be reconstructed convincingly at the end. Capture prompts as they happen.
* Seeds and the shared initial password are local-development only and documented in the README; no secrets, no `JWT_SECRET` value, and no real passwords enter the repository.
* Kanban board updated 2026-09-10: #35 in **PR Review**; #36–#42 moved Backlog to **Specified**, since each now carries full acceptance criteria. They keep the `ready-for-agent` label but remain genuinely blocked until #35 and #36 merge — the label marks readiness, not that the frontier has reached them.
