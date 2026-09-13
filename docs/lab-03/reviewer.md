# Lab 3 — Peer Review Record

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Chanon Lhumsa-ard | 67070501059 | [@Snnn3](https://github.com/Snnn3) |
| Peer reviewer | Worawut Sereethai | 67070501040 | [@YummieGG](https://github.com/YummieGG) |

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| https://github.com/Snnn3/TokTickIT/pull/43 | feature/lab3-1-contract | Closed (unmerged) |
| https://github.com/Snnn3/TokTickIT/pull/44 | feature/lab3-1-contract | Commented → Approved |
| https://github.com/Snnn3/TokTickIT/pull/45 | feature/lab3-2-refactor | Commented → Approved |
| https://github.com/Snnn3/TokTickIT/pull/46 | feature/lab3-3-auth-foundation | Open — Commented, fixes pending |
| TBD | feature/lab3-4-requester-regression | TBD |
| TBD | feature/lab3-5-staff-queue | TBD |
| TBD | feature/lab3-6-staff-operations | TBD |
| TBD | feature/lab3-7-user-management | TBD |
| TBD | feature/lab3-8-e2e-visual | TBD |

### Reviewer comments I received and how I responded

**PR #43 — feature/lab3-1-contract** (CLOSED, unmerged — no review)
- **My comment:** Closed by me before review; superseded by #44 on the same branch and base.

**PR #44 — feature/lab3-1-contract** (MERGED)
- **Reviewer review Round 1 (YummieGG, CHANGES_REQUESTED, 2026-09-10):** "I found a few specification and test-traceability issues that should be resolved before implementation begins. The main concerns are an incomplete Definition of Done, an authorization-matrix gap, an undocumented ownership exception, and several acceptance criteria whose planned tests do not yet cover the full behavior." Findings: (1) AC-28 missing from the Definition of Done (specification.md gates AC-01..AC-27 only); (2) `GET /api/staff/assignees` missing from the authorization matrix; (3) terminal-owner exception (inactive owner on Closed/Cancelled) undocumented against §4.5; (4) AC-14/16/17/18 traceability incomplete.
- **My comment Round 1 (2026-09-10):** Quoted the review, then replied with fix commit `5734da0` (contract v1.5): DoD now gates AC-01..AC-28; assignee matrix row added for all roles incl. Requester 403; terminal-owner exception recorded as D22 with rejected alternatives; traceability closed via stronger API-18/API-19/API-26 and new S-02 row.
- **Reviewer review Round 2 (YummieGG, CHANGES_REQUESTED, 2026-09-10):** "Bootstrap documentation does not match the Lab 03 authentication contract; migration preservation evidence is not executable yet (mocked Prisma cannot prove byte preservation); PR metadata is stale relative to the v1.5 contract."
- **My comment Round 2 (2026-09-10):** Quoted the review, then replied with fix commit `98249e6` (contract v1.6): `server/.env.example` gained `JWT_SECRET`/`SEED_INITIAL_PASSWORD` placeholders; README gained a Lab 3 status block; preservation evidence became real-database procedure M-01 with API-26 rescoped; PR metadata updated. Deviation raised: Lab 3 run/test commands not added to README (slices unimplemented; #42 carries the README-current DoD item).
- **My comment (self-initiated audit, 2026-09-10):** Ran a cross-document consistency sweep; found ten contradictions (incl. BR-22 content-type vs body-less exemption, staff-reopen Resolution Summary clearing). Fixed in `b614162` (contract v1.7).
- **Reviewer review Round 3 (YummieGG, CHANGES_REQUESTED, 2026-09-10):** "Contract approval status and required evidence are not complete (header claims Approved with no recorded approval; `My Reflection` TBD); authenticated reference endpoints missing from the matrix; PR description stale at v1.6; logout contract contradictory (requires cookie yet idempotent without one)."
- **My comment Round 3 (2026-09-10):** Quoted the review, then replied with fix commit `e105a48` (contract v1.8): status is now Draft pending recorded peer approval (DoD item added); reference endpoints gained a matrix row plus unauthenticated-401 stated for every row; logout pinned to no-cookie-required, always 204 with cleared cookie. Contested one point on the PR thread instead of actioning it: the review called `docs/lab-03/plan.md` a required contract file, but handout §12 lists six required files (all tracked) and the plan is a deliberately untracked local working document.
- **Reviewer review Round 4 (YummieGG, APPROVED, 2026-09-10 16:01):** "Re-reviewed the latest revision against the Lab 03 handout and Issue #35. All previous findings have been addressed. The contract is complete and ready for implementation. Approved."
- **My comment Round 4 (2026-09-10):** No fix needed; approval landed on unchanged head `d09355b`. Merged into `lab3-staging` at 16:04, closing issue #35 and unblocking #36.

**PR #45 — feature/lab3-2-refactor** (MERGED)
- **Reviewer review Round 1 (YummieGG, CHANGES_REQUESTED, 2026-09-12):** "Overall, the mechanical formatting pass across the 67 files is exceptionally clean: zero behaviour change on product code. Blocking finding — test failure in `e2e/evidence/report-gaps.spec.ts`: `Part 6 gaps` fails at line 120 (`expect(catOptions).toBeGreaterThan(1)`, received 1)."
- **My comment Round 1 (2026-09-12):** Quoted the review, then replied with fix commit `757038c`: the capture counted select options before the reference fetch resolved (fetch-timing race, green locally). It now waits for reference data before counting.
- **Reviewer review Round 2 (YummieGG, APPROVED, 2026-09-12 12:07):** "All checks and test suites are passing green, and the mechanical formatting pass strictly maintains zero behavior change on product code. Documentation and tooling configurations conform to Issue #36 acceptance criteria. Ready to merge into `lab3-staging`. Approved!"
- **My comment Round 2 (2026-09-12):** No fix needed; approved at head `757038c`. Merged into `lab3-staging`, closing issue #36 and unblocking #37.

**PR #46 — feature/lab3-3-auth-foundation** (OPEN, fixes pending)
- **Reviewer review Round 4 (reviewer-tester + external cross-check, CHANGES_REQUESTED, 2026-09-14):** Three blocking rows at head `e82d2ea`: (B-03) stale test counts — `docs/lab-03/tests.md:140` and two PR-body figures say 73 server tests, actual is 75 across 10 files; (B-04) logout answers 204 when `tokenVersion` revocation failed, against AC-06/FR-30, with a failing-loudly fix that costs nothing since the client signs out unconditionally; (B-05) malformed JSON returns an HTML stack trace with absolute paths (no Express error handler in `server/src`), against the response-shape contract. Non-blocking: N-11 migration-script attachment check (closed empirically, AC-17 holds), N-12 global multipart guard (fails safe), N-13 `/api/categories` needs a numbered spec exception beside BR-28. Full detail in `.reviews/review-feature-lab3-3-auth-foundation.md` (local-only).
- **My comment:** Fixes pending — coder task queued for B-03/B-04/B-05 plus N-08/N-11/N-13 doc fixes.
---

## Pull Requests I reviewed for my partner

| PR | Branch | My verdict |
|----|--------|------------|
| https://github.com/YummieGG/toktickit/pull/45 | lab3-1-engineering-contract | Approved |
| https://github.com/YummieGG/toktickit/pull/46 | feat(auth) | Approved — MERGED 2026-09-11 |
| https://github.com/YummieGG/toktickit/pull/47 | feat(authz) | Approved — MERGED 2026-09-12 |

### My comments and partner's responses

**PR #45 — lab3-1-engineering-contract** (MERGED)
- **My review (Snnn3, APPROVED, 2026-09-10 07:02):** "Reviewed against the CPE 334 Lab 3 handout. All four engineering contract documents — specification.md, api-spec.md, ui-spec.md and tests.md — were present, complete and mutually consistent, covering the handout's required sections. The PR also removed unrelated files carried in from PR-24, which keeps the contract PR limited to contract artifacts. Approved with no blocking findings."
- **Partner's comment (2026-09-10):** No blocking items raised; merged by the author at 07:04.

**PR #46 — feat(auth)** (MERGED 2026-09-11)
- **My review (Snnn3, APPROVED, 2026-09-11 10:13):** "Outstanding work on this PR, @YummieGG! The authentication foundation and security hardening are thoroughly designed and meet all requirements from the Lab 3 handout and our engineering contract. Approved!"
- **Partner's comment (2026-09-12):** Quoted my review, then replied and merged the PR (merged 2026-09-11 10:15).

**PR #47 — feat(authz)** (MERGED 2026-09-12)
- **My review (Snnn3, APPROVED, 2026-09-12 17:45):** "Peer Review: Lab 3-3 Authorization, App Shell & Requester Regression. Great job on this PR! The transition from the development requester selector to authentic session-based identity and RBAC is clean, secure, and fully compliant with the Lab 3 handout. Highlights: session identity enforcement with no client requesterId; fail-closed scoping with safe 404s; PublicComment persistence with idempotent appears-resolved timestamps and terminal-status guards; role-scoped attachment policies; code hygiene with clean builds. Verified server 130/130 and client 76/76 green. Ready to merge. Approved!"
- **Partner's comment (2026-09-13):** Quoted my review, then replied and merged the PR (merged 2026-09-12 17:47).
