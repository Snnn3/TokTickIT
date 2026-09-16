# Lab 3 — Peer Review Record

Version: 2.5 | Date: 2026-09-15 | Companion to `specification.md`.

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
| https://github.com/Snnn3/TokTickIT/pull/46 | feature/lab3-3-auth-foundation | Commented → Approved |
| https://github.com/Snnn3/TokTickIT/pull/47 | feature/lab3-4-requester-regression | Commented ×3 → Approved (merged 2026-09-15) |
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
- **My comment Round 3 (2026-09-10):** Quoted the review, then replied with fix commit `e105a48` (contract v1.8): status is now Draft pending recorded peer approval (DoD item added); reference endpoints gained a matrix row plus unauthenticated-401 stated for every row; logout pinned to no-cookie-required, always 204 with cleared cookie. Contested one point on the PR thread instead of actioning it: the review called the local execution plan a required contract file, but handout §12 lists six required files (all tracked) and that plan is a deliberately untracked local working document.
- **Reviewer review Round 4 (YummieGG, APPROVED, 2026-09-10 16:01):** "Re-reviewed the latest revision against the Lab 03 handout and Issue #35. All previous findings have been addressed. The contract is complete and ready for implementation. Approved."
- **My comment Round 4 (2026-09-10):** No fix needed; approval landed on unchanged head `d09355b`. Merged into `lab3-staging` at 16:04, closing issue #35 and unblocking #36.

**PR #45 — feature/lab3-2-refactor** (MERGED)
- **Reviewer review Round 1 (YummieGG, CHANGES_REQUESTED, 2026-09-12):** "Overall, the mechanical formatting pass across the 67 files is exceptionally clean: zero behaviour change on product code. Blocking finding — test failure in `e2e/evidence/report-gaps.spec.ts`: `Part 6 gaps` fails at line 120 (`expect(catOptions).toBeGreaterThan(1)`, received 1)."
- **My comment Round 1 (2026-09-12):** Quoted the review, then replied with fix commit `757038c`: the capture counted select options before the reference fetch resolved (fetch-timing race, green locally). It now waits for reference data before counting.
- **Reviewer review Round 2 (YummieGG, APPROVED, 2026-09-12 12:07):** "All checks and test suites are passing green, and the mechanical formatting pass strictly maintains zero behavior change on product code. Documentation and tooling configurations conform to Issue #36 acceptance criteria. Ready to merge into `lab3-staging`. Approved!"
- **My comment Round 2 (2026-09-12):** No fix needed; approved at head `757038c`. Merged into `lab3-staging`, closing issue #36 and unblocking #37.

**PR #46 — feature/lab3-3-auth-foundation** (MERGED)
- **Reviewer review Round 4 (reviewer-tester + external cross-check, CHANGES_REQUESTED, 2026-09-14):** Three blocking rows at head `e82d2ea`: (B-03) stale test counts — `docs/lab-03/tests.md:140` and two PR-body figures say 73 server tests, actual is 75 across 10 files; (B-04) logout answers 204 when `tokenVersion` revocation failed, against AC-06/FR-30, with a failing-loudly fix that costs nothing since the client signs out unconditionally; (B-05) malformed JSON returns an HTML stack trace with absolute paths (no Express error handler in `server/src`), against the response-shape contract. Non-blocking: N-11 migration-script attachment check (closed empirically, AC-17 holds), N-12 global multipart guard (fails safe), N-13 `/api/categories` needs a numbered spec exception beside BR-28. Full detail in `.reviews/review-feature-lab3-3-auth-foundation.md` (local-only).
- **My comment Round 4 (2026-09-14):** Fixed in `add8d4d`/`9a1d95b`: atomic throttle admission, gate exemptions, password-trim mirror, logout UX, oxlint harness exports; logout-500, BR-29 gate exception and test counts aligned between code, `tests.md` and README.
- **Reviewer review Round 5 (reviewer-tester gate, CHANGES_REQUESTED, 2026-09-14):** Stale test counts again (B-01), dead `isThrottled`/`recordFailure` throttle API (N-01), change-password confirmation not comparing trimmed values like the server (N-02).
- **My comment Round 5 (2026-09-14):** Fixed in `3e8c221`: README/`tests.md` counts synced, dead throttle API removed, trimmed-confirm parity plus new trim/ceiling tests, plan untracked with references dropped.
- **Reviewer review Round 6 (merge gate, 2026-09-14):** Two rows at head `3e8c221`: (B-01) README counts still behind the measured 89 server / 84 client; (B-02) PR head not yet pushed, gate reviewed a stale commit.
- **My comment Round 6 (2026-09-14):** Fixed in `2f17550` (docs-only README count sync) and pushed, so PR head == local HEAD; gate re-verified green at `2f17550` (server 89: 88 stubbed-pass + 1 DB-gated `API-02.categories`; client 84/84).
- **Reviewer review Round 7 (YummieGG, APPROVED, 2026-09-14 11:31):** "All Previous Findings Resolved ... Zero blocking findings remain. Excellent engineering and clean documentation! Verdict: APPROVED" at head `2f17550`.
- **My comment Round 7 (2026-09-14):** No fix needed; approved at head `2f17550`. Merged into `lab3-staging` at 11:38. Issue #37 used `refs` rather than `closes`, so it was closed manually with the green evidence, unblocking #38, #39 and #41.

**PR #47 — feature/lab3-4-requester-regression** (OPEN, 3 rounds, fixes pushed)
- **Reviewer review Round 1 (YummieGG, CHANGES_REQUESTED, 2026-09-15):** Three findings at head `8928782`: (P1) appears-resolved and reopen validate with `findUnique` then unconditional `update` by id — a TOCTOU race reproduced as `200, 200` on concurrent requests, risking `ALREADY_SIGNALLED`, terminal-state guard and AC-07/AC-22 violations; make validation and mutation atomic (conditional update, transaction or row lock) with `403`/`409`/`422` on failed conditions; (P2) new confirm dialogs have `role="dialog"` but no focus trap and no Escape handling, against `ui-spec.md` §10 — reuse the attachment-removal modal pattern plus tests; (P2) new action/comment buttons use `btn-sm` below the 44px mobile touch-target requirement — drop `btn-sm` or add a scoped `min-height: 44px` rule, verify at 375px.
- **My comment Round 1 (2026-09-15):** Quoted the review, then replied with fixes: atomic appears-resolved/reopen via conditional `updateMany` (`3e7c32e`), focus trap + Escape for the requester confirm dialogs (`5e444c9`), 44px mobile touch targets for requester actions (`dc8de73`).
- **Reviewer review Round 2 (YummieGG, CHANGES_REQUESTED, 2026-09-15):** Race fixed and all checks green (server 118/118, client 93/93), three findings before approval: (P2) 2,000-char unbroken comment overflows — `white-space: pre-wrap` alone is not enough, add `overflow-wrap: anywhere` + 375px test; (P2) focus trap only cycles first/last control, focus still escapes via click or programmatic focus — contain it + regression test; (P2) 44px rule misses the Back button and Attachment controls — cover all requester-detail controls, verify at 375px. Non-blocking: extract the duplicated focus-trap logic, centralize repeated public-comment query/response shapes.
- **My comment Round 2 (2026-09-15):** Quoted the review, then replied with fixes: round-2 client fixes incl. comment wrap, dialog containment, 44px root scope and shared focus hook (`3307b60`), centralized public-comment select and serializer (`8974171`).
- **Reviewer review Round 3 (YummieGG, CHANGES_REQUESTED, 2026-09-15):** Two Spec/AC issues remain at head `8974171`: (P2) attachment filename download is a `<button>` without `.btn`, outside the 44px rule (`AttachmentSection.tsx`, `index.css`) — violates `ui-spec.md` §10 and AC-18, add a 375px test; (P2) `useConfirmDialogFocus.ts` disables containment when `busy=true`, letting focus escape while the dialog is open — violates §10 and AC-18, add a busy-state test.
- **My comment Round 3 (2026-09-15):** Quoted the review, then replied with fixes: busy focus containment and filename 44px touch target (`00744c9`), resolution summary wrap and 44x44 touch hit area (`d30c9c1`). Awaiting re-review.
- **Merge-gate + round 4 (2026-09-15):** Agent gate found code P2s + Security Guard all passing with one blocking docs row (B-01: `reviewer.md` at 2.4 vs five docs at 2.3). Fixed in `8de9dd8` (five one-line version bumps), PR body figures corrected, server 118/118 + client 102/102 green. Ultracite gate then failed on 2 lines (F-01); fixed formatting-only in `44ea0e9`, check clean. Thanked the reviewer on the PR thread for all three rounds.
- **Reviewer review Round 4 (YummieGG, APPROVED, 2026-09-15 16:29):** "I re-reviewed this PR against the AC, Spec, and Security Guard requirements from Issue #38. The previously identified formatting and mobile filename overflow issues have been addressed. The requester flows, authorization checks, public comments, appears-resolved action, reopen flow, resolution summary, and internal notes protection are working as expected. The test suite and build checks pass. No remaining blocking issues were found."
- **My comment Round 4 (2026-09-15):** No fix needed. Merged by @YummieGG at 16:29 into `lab3-staging`; issue #38 closed, unblocking #39, #40 and #41.
---

## Pull Requests I reviewed for my partner

| PR | Branch | My verdict |
|----|--------|------------|
| https://github.com/YummieGG/toktickit/pull/45 | lab3-1-engineering-contract | Approved |
| https://github.com/YummieGG/toktickit/pull/46 | feat(auth) | Approved — MERGED 2026-09-11 |
| https://github.com/YummieGG/toktickit/pull/47 | feat(authz) | Approved — MERGED 2026-09-12 |
| https://github.com/YummieGG/toktickit/pull/48 | feat(staff) ticket queue and workflow | Approved — MERGED 2026-09-14 |
| https://github.com/YummieGG/toktickit/pull/49 | feat(admin) scoped Administrator user management | Approved — MERGED 2026-09-15 |

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

**PR #48 — feat(staff)** (MERGED 2026-09-14)
- **My review (Snnn3, APPROVED, 2026-09-14 07:04):** "Peer Review: Lab 3-4 IT Staff Queue & Workflow. Approved. Highlights: complete 8-state ticket lifecycle with confirmation prompts and 409 Conflict concurrency protection; multi-criteria staff queue search, filtering and deterministic pagination; independent IT Priority triage and active owner assignment; role-scoped Internal Notes with zero leakage to Requesters and read-only Admin policy; responsive Zen Green UI (desktop table + mobile cards). Verified server 255/255 and client 87/87 green with clean lint and builds. Ready to merge. Outstanding work!"
- **Partner's comment (2026-09-14):** Quoted my review, then replied "thank you" and merged the PR (merged 2026-09-14 07:05).

**PR #49 — feat(admin)** (MERGED 2026-09-15)
- **My review (Snnn3, APPROVED, 2026-09-15 13:07):** "Verdict: Approved with minor suggestions. Great work implementing role authorization, account safety rules (BR-10, BR-11), transactional ticket unassignment, and password/session revocation — solidly handled and well-tested."
- **Partner's comment:** No reply; merged the PR (merged 2026-09-15 13:50).
