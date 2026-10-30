# Lab 4 — Peer Review Record

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
| https://github.com/Snnn3/TokTickIT/pull/68 | feature/lab4-6-staff-dashboard | Approved - merged into `lab4-staging` on 2026-10-10 |
| https://github.com/Snnn3/TokTickIT/pull/69 | feature/lab4-7-requester-dashboard | Approved - merged into `lab4-staging` on 2026-10-13 |
| https://github.com/Snnn3/TokTickIT/pull/70 | feature/lab4-8-e2e-visual | Approved - author plans to merge into `lab4-staging`; PR remains open |

### Reviewer comments I received and how I responded

**PR #63 - feature/lab4-1-contract** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-09-30):** Reviewed the six Lab 4 companion documents against Issue #54 and the Lab 4 handout. The contract, agreed design decisions, authorization matrix, lifecycle rules, and bidirectional mapping of 23 acceptance criteria to 89 planned test pairs were accepted. The reviewer noted that commit `0158b6b` added `CONTEXT.md` and `skills-lock.json`, so the PR description needed that minor correction.
- **My comment (2026-09-30):** Thanked the reviewer, acknowledged the documentation note, and recorded that PR #63 had merged into `lab4-staging`, completing the contract phase and unblocking implementation.
- **Merge:** Merged into `lab4-staging` at `2026-09-30 12:23 UTC`.

**PR #64 - feature/lab4-2-actions-foundation** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-10-01):** Approved the schema constraints, legacy-data preservation, idempotent seed fixtures, migration evidence, and regression suite for Issue #55. The review verified 190 server tests, 135 client tests, and 13 Playwright tests at that time.
- **My comment (2026-10-03):** Thanked the reviewer for the thorough review and test-assertion feedback. [Response](https://github.com/Snnn3/TokTickIT/pull/64#issuecomment-5969422155).
- **Merge:** Merged into `lab4-staging` at `2026-10-01 16:16 UTC`.

**PR #65 - feature/lab4-3-actions-api** (MERGED)
- **Reviewer review (YummieGG, CHANGES_REQUESTED, 2026-10-04):** Accepted the Actions Taken API design, authorization/body precedence, optimistic concurrency, and audit logging. Requested a missing `prisma.actionTaken.findMany` mock in the Lab 3 admin deactivation/demotion regression fixture, which otherwise tried to reach PostgreSQL in isolated tests, plus documentation updates.
- **Response (2026-10-05):** Added the Action query stub to the existing regression test and recorded the review response here. The targeted deactivation/demotion cases passed (2/2) without a database connection. The PR comment at the time reported 244/245 server tests passing; the remaining Lab 1 seeded-category test required PostgreSQL.
- **My comments (2026-10-05):** Posted the [fix and verification response](https://github.com/Snnn3/TokTickIT/pull/65#issuecomment-5989933680), then [thanked the reviewer](https://github.com/Snnn3/TokTickIT/pull/65#issuecomment-5992683451) for the feedback.
- **Final GitHub state:** PR #65 is approved and merged into `lab4-staging` at `2026-10-05 09:11 UTC`. Its final approval review text refers to PR #64 and Issue #55, so that text is not treated here as additional PR #65-specific review evidence.

**PR #66 - feature/lab4-4-ticket-workflow** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-10-07):** Approved the Issue #57 workflow and resolution gate. The review verified the complete transition matrix and terminal protection, resolution prerequisites, requester advisory/reopen behavior, optimistic concurrency and conflict recovery, and the related API/client/E2E tests.
- **My comment (2026-10-07):** Thanked the reviewer for the detailed review and help getting PR #66 merged.
- **Merge:** Merged into `lab4-staging` at `2026-10-07 09:15 UTC`.

**PR #67 - feature/lab4-5-actions-ui** (MERGED)
- **Implementation:** Adds the Issue #58 Actions Taken panel to requester and staff Ticket details, with read-only requester history, role-aware writes, validation, and conflict recovery. No server or schema changes.
- **Peer review (YummieGG, APPROVED, 2026-10-08):** Accepted action cardinality, transitions, immutable performer identity, follow-up validation, requester read-only behavior, conflict recovery and idempotency. The peer verified 17 Actions Taken component tests and 158 client tests at that implementation head, and requested the C4-01 test-plan status update.
- **Merge:** Merged into `lab4-staging` at `2026-10-08 04:10 UTC`.
- **My comment (2026-10-08):** Thanked the reviewer for the acceptance-criteria, conflict-recovery and test-coverage checks, including the C4-01 reminder. [Response](https://github.com/Snnn3/TokTickIT/pull/67#issuecomment-6053412961).

**PR #68 - feature/lab4-6-staff-dashboard** (MERGED)
- **Peer review (YummieGG, APPROVED, 2026-10-10):** Verified AC-1 through AC-10, authoritative dashboard metrics and status groups, bounded recent lists, Bangkok time, session identity, drill-downs, and stale-response protection. The reviewer reported 17/17 focused client tests, 15/15 dashboard API tests, and passing server/client builds plus the scoped formatting check. A non-blocking recommendation was to wrap one retry-count assertion in `waitFor` to reduce CI timing sensitivity.
- **My comment:** Thanked the reviewer for the detailed review and for merging PR #68; the response is recorded in the PR conversation.
- **Merge:** Merged into `lab4-staging` at `2026-10-10 05:26 UTC`, merge commit `5409b44b366a9cf3ebfb01929d05697abca9c5a7`.

**PR #69 - feature/lab4-7-requester-dashboard** (MERGED)
- **Peer review (YummieGG, APPROVED, 2026-10-13):** Verified AC-1 through AC-9, requester ownership, rejection of query/body identity overrides, UTC window/Bangkok display, stable latest-five lists, and persistence across refresh/Back. The reviewer reported 7/7 Requester Dashboard component tests, 196/196 client tests, 23/23 focused server API tests, and passing production builds/scoped formatting. The review flagged C4-02's documented count of 6 as stale; it should be 7.
- **My comment:** Thanked the reviewer and acknowledged the C4-02 count discrepancy; the comment is recorded in the PR conversation. The test-plan correction is recorded in `tests.md`.
- **Merge:** Merged into `lab4-staging` at `2026-10-13 08:08 UTC`, merge commit `1f558d05a898dd66952bffb652cb829d52b6b6fe`.

**PR #70 - feature/lab4-8-e2e-visual** (OPEN; approved, awaiting merge)
- **Opened (2026-10-29):** Targets `lab4-staging` for Issue #61.
- **Peer review (YummieGG, CHANGES_REQUESTED, 2026-10-30):** Reported TS18046 in `server/tests/lab-04/requester-dashboard.api.test.ts`: `Object.values(response.body.lists)` left each `tickets` value typed as `unknown`. The review requested typing `lists` as a record of arrays before iterating.
- **Fix pushed (2026-10-30):** Commit `3776ebd` types `response.body.lists` as `Record<string, unknown[]>`, resolving TS18046; the server build passed. Commit `ee2697b` added the remaining Lab 3/Lab 4 evidence and action-coverage changes.
- **Peer re-review (YummieGG, APPROVED, 2026-10-30 16:04 UTC):** Confirmed the TypeScript fix and both builds, verified the 7-test `action-domain.unit.test.ts` suite and 31 screenshot artifacts, and reported 371/371 server tests, 197/197 client tests, and a clean check across 163 files. The reviewer marked the Issue #61 acceptance criteria satisfied and the PR ready to merge.
- **Author verification after the latest push (2026-10-30, feature branch):** Commit `56ebb62` stabilized the Lab 2 requester E2E system selection, refreshed Lab 2/3/4 screenshot and performance evidence, and included the visual accessibility checklist updates. Server tests passed 372/372 in both standard and isolated runs; concurrency passed 8/8; dashboard performance passed 6/6; client tests passed 197/197; Lab 2/3 Playwright regression passed 13/13; Lab 4 Playwright passed 21/21. `npm run check` passed for 163 files, and both builds passed. The verification summary was posted in [the PR conversation](https://github.com/Snnn3/TokTickIT/pull/70#issuecomment-6527287472).
- **Current GitHub state (2026-10-30):** PR #70 is open and approved, targets `lab4-staging`, and points to head `1dbcdef`. The author plans to merge it; GitHub does not yet show it as merged. This update is on the feature branch, not `lab4-staging`.

Dates below use UTC. Review bodies and replies are summarized unless quotation marks indicate a short verbatim reply. Test counts describe what the reviewer or author reported at that PR head; current verification belongs in [tests.md](tests.md).

Issue #61 has open, approved PR #70 from `feature/lab4-8-e2e-visual` to `lab4-staging`. The author plans to merge it; GitHub does not yet show a merge. The TS18046 build defect was fixed, the reviewer approved the re-review, and the latest full test/build results are recorded above. Final report preparation and verification after integration remain pending. The visual accessibility checklist still says Narrator's spoken output was not verified; that manual check remains outstanding even though its screen-reader checklist item is checked.

---

## Pull Requests I reviewed for my partner

| PR | Branch | My verdict |
|----|--------|------------|
| https://github.com/YummieGG/toktickit/pull/65 | lab4-1-engineering-contract | Approved — MERGED 2026-10-10 |
| https://github.com/YummieGG/toktickit/pull/66 | lab4-2-actions-foundation | Changes requested → Approved — MERGED 2026-10-13 |
| https://github.com/YummieGG/toktickit/pull/67 | lab4-3-actions-ui | Initial empty approval → Changes requested → Approved — MERGED 2026-10-14 |
| https://github.com/YummieGG/toktickit/pull/68 | lab4-4-ticket-workflow | Changes requested (2 rounds) → Approved — MERGED 2026-10-17 |
| https://github.com/YummieGG/toktickit/pull/69 | lab4-5-role-dashboards | Changes requested → Approved — MERGED 2026-10-19 |
| https://github.com/YummieGG/toktickit/pull/70 | lab4-6-verification-qa | Changes requested → Approved — MERGED 2026-10-19 |
| https://github.com/YummieGG/toktickit/pull/71 | lab4-7-staged-integration | Approved — MERGED 2026-10-20 |

### My comments and partner's responses

**PR #65 — lab4-1-engineering-contract** (MERGED)
- **My review (Snnn3, APPROVED, 2026-10-10):** Accepted the engineering contract against the partner's Issue #56 and handout: Action Taken/event models, role matrices, resolution and child cancellation, version/idempotency rules, dashboards, seven-day Bangkok window and AC traceability. The review covered the four core documents and supporting logs/checklist.
- **Partner's comment (2026-10-13):** "thank you :)" [Response](https://github.com/YummieGG/toktickit/pull/65#issuecomment-6141192305).
- **Merge:** Merged into `lab4-staging` on 2026-10-10.

**PR #66 — lab4-2-actions-foundation** (MERGED, both rounds kept)
- **My review Round 1 (Snnn3, CHANGES_REQUESTED, 2026-10-13):** Requested handling of Prisma `P2002` on concurrent action creation, positive-safe-integer validation of `assigneeId` before database lookup, and health/unexpected-500 error-envelope coverage. These were boundary and concurrency gaps despite passing existing suites.
- **Partner's response (2026-10-13):** Reported the `b7ef1c7` fixes: changed-payload races return `409 IDEMPOTENCY_CONFLICT`, malformed assignees return `400 ASSIGNEE_INELIGIBLE`, and health/500 regression tests were added. [Fix response](https://github.com/YummieGG/toktickit/pull/66#issuecomment-6147860865).
- **My review Round 2 (Snnn3, APPROVED, 2026-10-13):** Re-reviewed `ec62eb7` and `b7ef1c7`; accepted identical-payload replay, payload-conflict handling, assignee validation and API-00 coverage. Reported 326 server and 99 client tests passing.
- **Partner's comment (2026-10-13):** "thanks" [Response](https://github.com/YummieGG/toktickit/pull/66#issuecomment-6154839576).
- **Merge:** Merged into `lab4-staging` on 2026-10-13.

**PR #67 — lab4-3-actions-ui** (MERGED, review sequence retained)
- **Initial review (Snnn3, APPROVED, 2026-10-14 15:36:15 UTC):** Empty review body; recorded as a GitHub event without inferring verification from it.
- **My review Round 1 (Snnn3, CHANGES_REQUESTED, 2026-10-14 15:36:48 UTC):** Requested focus on server-invalid controls, readable role labels in the edit header, contextual accessible names on mobile buttons, and refetch/page navigation after creation to preserve pagination boundaries.
- **Partner's response (2026-10-14):** Reported all four corrections in `747413e`, with focus assertions, role-label mapping, mobile `aria-label` values and bounded action-list pagination. Reported 128 client, 326 server and 4 Playwright tests passing. [Fix response](https://github.com/YummieGG/toktickit/pull/67#issuecomment-6172569080).
- **My review Round 2 (Snnn3, APPROVED, 2026-10-14):** Re-reviewed `747413e`; confirmed the four findings were resolved, with passing tests, lint and client build.
- **Partner's comment (2026-10-14):** "thanks for approve" [Response](https://github.com/YummieGG/toktickit/pull/67#issuecomment-6173276141).
- **Merge:** Merged into `lab4-staging` on 2026-10-14.

**PR #68 — lab4-4-ticket-workflow** (MERGED, all rounds kept)
- **My review Round 1 (Snnn3, CHANGES_REQUESTED, 2026-10-17):** Found that 409 recovery unmounted the form and conflict banner, explicit reconcile controls were missing, field errors suppressed the resolution-gate banner, and the live E2E test omitted the actual browser resolution workflow.
- **Partner's response (2026-10-17):** Reported in-place reload/reconcile, preserved drafts and error banners, accessible inline gate errors, expanded browser-to-database workflow coverage and server test-port isolation. [First fix response](https://github.com/YummieGG/toktickit/pull/68#issuecomment-6232306580).
- **My review Round 2 (Snnn3, CHANGES_REQUESTED, 2026-10-17):** Requested accessible in-DOM confirmation modals with transition explanations, `VALIDATION_ERROR` for malformed versions, and resolution-gate feedback prioritizing active-action blockers.
- **Partner's response (2026-10-17):** Reported extracting `ConfirmationModal` with focus-trap tests, aligning the modal color token, using a status-control ref and associating gate feedback with the control. [Follow-up response](https://github.com/YummieGG/toktickit/pull/68#issuecomment-6235065944).
- **My review Round 3 (Snnn3, APPROVED, 2026-10-17):** Accepted the modal, conflict recovery, validation, gate feedback, atomic child cancellation and timestamp lifecycle. Reported 143 client and 397 server tests passing, plus live E2E/concurrency coverage.
- **Partner's comment (2026-10-17):** "ty" [Response](https://github.com/YummieGG/toktickit/pull/68#issuecomment-6236700681).
- **Merge:** Merged into `lab4-staging` on 2026-10-17.

**PR #69 — lab4-5-role-dashboards** (MERGED, both rounds kept)
- **My review Round 1 (Snnn3, CHANGES_REQUESTED, 2026-10-19):** Requested mobile stacked cards, action-context anchors, matching requester seven-day preview bounds, captured Staff drill-down timestamps, urgent-priority sorting parity, preserved multiline text and canonical design tokens.
- **Partner's response (2026-10-19):** Reported all six fixes plus Bangkok rendering, deterministic queue ordering, date badges, removal of live-E2E skips and traceability updates. [Fix response](https://github.com/YummieGG/toktickit/pull/69#issuecomment-6269544520).
- **My review Round 2 (Snnn3, APPROVED, 2026-10-19):** Accepted requester ownership/window metrics, Staff/Admin status and priority groups, responsive action drill-downs, URL synchronization and filter/sort extensions. Reported 159 client and 430 server tests passing.
- **Partner's comment (2026-10-19):** "thanks youu" [Response](https://github.com/YummieGG/toktickit/pull/69#issuecomment-6270848533).
- **Merge:** Merged into `lab4-staging` on 2026-10-19.

**PR #70 — lab4-6-verification-qa** (MERGED, both relevant rounds kept)
- **My review Round 1 (Snnn3, CHANGES_REQUESTED, 2026-10-19):** Found broken live-E2E selectors and silent conditional skips, missing action reassignment coverage, omitted Login/Change Password/My Tickets screenshots and an incorrect screenshot count.
- **Partner's response (2026-10-19):** Reported corrected selectors, strict mandatory assertions, reassignment coverage, the missing regression captures, 31-artifact checklist alignment, administrator navbar wrapping and exact idempotency status assertions. Reported 159 client, 430 server and 13 Lab 4 Playwright tests passing. [Fix response](https://github.com/YummieGG/toktickit/pull/70#issuecomment-6274212111).
- **My review Round 2 (Snnn3, APPROVED, 2026-10-19):** Accepted corrected browser-to-PostgreSQL action/workflow coverage, responsive and accessibility checks, screenshots and inherited regression integrity.
- **Partner's comment (2026-10-19):** "thanks you very muchh" [Response](https://github.com/YummieGG/toktickit/pull/70#issuecomment-6276489861).
- **Additional GitHub event (2026-10-20):** A later approval posted on PR #70 describes PR #71 staged integration. Its text is not counted as another PR #70-specific verification; PR #71 has its own approval below.
- **Merge:** Merged into `lab4-staging` on 2026-10-19.

**PR #71 — lab4-7-staged-integration** (MERGED)
- **My review (Snnn3, APPROVED, 2026-10-20):** Reviewed staged integration at `dd41704`: merge order for PRs #65–#70, transaction-mock isolation, documentation/traceability and 31 screenshot artifacts. Reported 159 client and 430 server tests passing with clean client build/lint.
- **Partner's response:** No issue comment was present in the fetched PR conversation; no reply is inferred.
- **Merge:** Merged into `lab4-staging` on 2026-10-20. This partner-repository integration does not establish final verification of `Snnn3/TokTickIT`.
