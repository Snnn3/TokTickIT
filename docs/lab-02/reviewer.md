# Lab 2 — Peer Review Record

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Chanon Lhumsa-ard | 67070501059 | [@Snnn3](https://github.com/Snnn3) |
| Peer reviewer | Worawut Sereethai | 67070501040 | [@YummieGG](https://github.com/YummieGG) |

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| https://github.com/Snnn3/TokTickIT/pull/25 | feature/lab2-1-contract | Approved |
| https://github.com/Snnn3/TokTickIT/pull/26 | feature/lab2-2-data | Approved |
| https://github.com/Snnn3/TokTickIT/pull/27 | feature/lab2-3-requester-context | Approved |
| https://github.com/Snnn3/TokTickIT/pull/28 | feature/lab2-4-create-ticket | Approved |
| https://github.com/Snnn3/TokTickIT/pull/29 | feature/lab2-5-my-tickets | Approved |
| https://github.com/Snnn3/TokTickIT/pull/30 | feature/lab2-6-detail-attachments | Commented → Approved |
| https://github.com/Snnn3/TokTickIT/pull/31 | feature/lab2-7-e2e-visual | Approved |

### Reviewer comments I received and how I responded

**PR #25 — feature/lab2-1-contract** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-08-25):** "Good job. The specifications are extremely clear and detailed, especially the expansion of the Business Rules covering all edge cases. The API and UI specs perfectly align with the Lab 02 requirements. Approved!"
- **My comment (2026-08-25):** Quoted the review, then replied: "Thank you for the review and approval! Glad the expanded business rules and API/UI specs look clear and aligned with the Lab 02 criteria."

**PR #26 — feature/lab2-2-data** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-08-31):** "LGTM! The code perfectly matches the spec and there are no outstanding issues. Passed. I will merge this PR right away."
- **My comment (2026-08-31):** Quoted the review, then replied: "Thank you! Really appreciate the review."

**PR #27 — feature/lab2-3-requester-context** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-09-01):** "The implementation for the Development Requester selection screen and its context looks good! I've reviewed the code and everything meets the specifications. Outstanding job! Approved."
- **My comment (2026-09-01):** Quoted the review, then replied: "Thank you for approved my PR."

**PR #28 — feature/lab2-4-create-ticket** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-09-01):** "Great job! The implementation of ticket_number_seq within a database transaction is a very solid approach. The file upload validation rules (size, count, MIME types) and the UI states align perfectly with our specifications. Test coverage is also spot on. Looks great to me, Approved!"

**PR #29 — feature/lab2-5-my-tickets** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-09-01):** "Great job on this one! The API query validation is solid, and the 300ms debounce on the search input is a great UX touch. I also love how you separated the Empty state from the No-results state perfectly. Approved!"
- **My comment (2026-09-02):** Quoted the review, then replied (verbatim typo kept): "Thank you for aproving and merging my PR."

**PR #30 — feature/lab2-6-detail-attachments** (MERGED, 2 rounds kept)
- **Reviewer review Round 1 (YummieGG, COMMENTED, 2026-09-03):** "Great work! The Ticket Detail and Attachment lifecycle fully match the specs, and all tests pass cleanly. Action required before merge: Please fix the TypeScript build errors (npm --prefix server run build): server/src/utils/attachment.ts: update parsePositiveIntParam parameter to string | string[] | undefined for Express 5. server/src/routes/tickets.ts: resolve type inference for ticket.requester and ticket.attachments from getOwnedTicket. Once resolved, I'll approve right away!"
- **My comment Round 1 (2026-09-03):** Quoted the review, then replied: "Thanks for catching this! I have resolved both TypeScript build issues: (1) server/src/utils/attachment.ts: Updated parsePositiveIntParam parameter signature to string | string[] | undefined to strictly conform with Express 5 routing params. (2) server/src/routes/tickets.ts: Updated getOwnedTicket to properly infer and return Prisma.TicketGetPayload<T>, ensuring ticket.requester and ticket.attachments are fully typed without inference errors. Verified with npm --prefix server run build (tsc) and npm test — both pass with zero errors. Ready for your re-review and approval!"
- **Reviewer review Round 2 (YummieGG, APPROVED, 2026-09-03):** "Great work on Issue #20! The read-only Ticket Detail layout perfectly adheres to the Zen Green design system and spec. The attachment lifecycle is robust, cleanly handling all 5 row states along with the soft-removal modal dialog. API security scoping, error handling, and status codes (403, 409, 410) are spot on. Verified that the TypeScript build fix (ac06054) resolved all compiler errors, and all 76 test cases (server & client) pass cleanly."
- **My comment Round 2 (2026-09-03):** Quoted the Round 2 approval, then replied: "Thank you for the thorough review and approval! Really appreciate you spotting the TypeScript build issue earlier and verifying the test suite."

**PR #31 — feature/lab2-7-e2e-visual** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-09-04):** "Excellent work! The Playwright E2E suite (E-01, E-02, R-01 & E-03) runs cleanly and covers the happy path, multi-requester isolation, and attachment lifecycles thoroughly. Responsive layouts and visual evidence screenshots are complete across all 3 viewports with zero horizontal scrolling. Great refactoring on server/src/utils/ownership.ts for clean, DRY authorization handling. Verified that TypeScript builds, linter, unit/API tests (76 passed), and E2E tests all pass 100%. Verdict: Approved! LGTM"
- **My comment (2026-09-04):** Quoted the review, then replied: "Thanks for merging and review."
---

## Pull Requests I reviewed for my partner

| PR | Branch | My verdict |
|----|--------|------------|
| https://github.com/YummieGG/toktickit/pull/19 | docs/lab2-specification | Approved |
| https://github.com/YummieGG/toktickit/pull/20 | feature/lab2-database | Approved |
| https://github.com/YummieGG/toktickit/pull/21 | feature/lab2-3-requester-context | Approved |
| https://github.com/YummieGG/toktickit/pull/22 | feature/lab2-4-ticket-creation | Approved (Round 5) — MERGED 2026-09-05 |

### My comments and partner's responses

**PR #19 — docs/lab2-specification** (MERGED)
- **My review 1 (Snnn3, APPROVED, 2026-08-31):** "Great job! The specifications and test plans are complete and fully aligned with the Lab 02 labsheet: Spec & API: Covers all FRs, BRs, data models, and REST contracts. UI Spec: Follows Zen Green tokens and the 19 Appendix C checklist items. Test Plan: 82 planned tests with complete AC traceability."
- **Partner's comment (2026-08-31):** Quoted my review, then replied: "Thanks."

**PR #20 — feature/lab2-database** (MERGED)
- **My review (Snnn3, APPROVED, 2026-09-01):** "The Prisma schema, migrations, and seed script perfectly fulfill: All models, relationships, indexes, and enums match specification.md and Section 5 of the labsheet. Seed data includes 4 categories, 6 systems, 4 active + 1 inactive requesters."
- **Partner's comment (2026-09-01):** Quoted my review, then replied: "Thank you very much"

**PR #21 — feature/lab2-3-requester-context** (MERGED)
- **My review (Snnn3, APPROVED, 2026-09-01):** "Great job! The Development Requester Selection and App Shell: GET /api/requesters returns active requesters sorted alphabetically. Session persists in sessionStorage and clears properly on Change Requester. UI adheres to Zen Green #006B3C styling and includes the mandatory test-mode warning banner. Both server API tests and client component tests pass. LGTM!."
- **Partner's comment (2026-09-02):** Quoted my review, then replied: "Thanks Bro."

**PR #22 — feature/lab2-4-ticket-creation** (MERGED 2026-09-05, all rounds + all partner replies kept)
- **My review Round 1 (Snnn3, CHANGES_REQUESTED, 2026-09-03):** Full blocking review — (1) FK existence & isActive validation (BR-05/BR-24/BR-25) returning 400 not 500; (2) ticket-number race hazard (BR-01), needs atomic sequence/transaction; (3) POST /api/tickets 201 must include expanded category/relatedSystem/requester; (4) hardcoded http://localhost:3000 → relative /api + Vite proxy; plus refinements: { error, details[] } envelope, #0B7A46 focus rings + Zen Green badge tokens, busy Submitting lock, View My Tickets + Create Another actions, selectable -- None -- system, desktop breakpoint. Verdict: Changes requested. (Full text on the PR thread.)
- **Partner's comment Round 1 (2026-09-04):** Quoted my Round 1 review, then replied: addressed FK/isActive 400 checks, advisory-lock transaction, expanded 201 response, standardized error envelope, relative endpoints + proxy, Zen Green focus/badges, busy Submitting state, Create Another action, selectable None, col-lg-6 breakpoint. Server 10/10 + client 7/7 green, ready for re-review.
- **My review Round 2 (Snnn3, CHANGES_REQUESTED, 2026-09-04):** "(1) Advisory Lock Error Swallowing in ticket-number.ts — empty catch around pg_advisory_xact_lock(888334) silently continues unlocked, re-introducing the BR-01 race; remove try/catch, mock $executeRaw in tests, name the constant. (2) Missing Loading State on master-data fetch — empty dropdowns submittable, violates ui-spec 7.2; add isLoading spinner/disabled. (3) Tablet Layout Regression — col-lg-6 collapses to 1 column at 768–991px, ui-spec 8 needs 2-col on tablet; restore col-md-6. Verdict: Changes requested." (Full text on the PR thread.)
- **Partner's comment Round 2 (2026-09-04):** "Thanks again for catching these! @Snnn3 — Resolved all 3: removed the empty try/catch so DB errors bubble up, added TICKET_NUMBER_ADVISORY_LOCK_ID = 888334 constant + $executeRaw mock; added isLoadingData spinner (Loading...) + reference-data error handling + test; restored col-12 col-md-6 on Category/System/Priority. Server 10/10 + client 8/8 green. Ready for another review!"
- **My review Round 3 (Snnn3, CHANGES_REQUESTED, 2026-09-04):** "Critical Spec & Implementation Findings — (1) Contract Over-Exposure in GET /api/related-systems (server/src/routes/related-systems.ts:9-13): api-spec line 56 specifies only { id, name } items, implementation returns extra fields; plus further contract/spec discrepancies — see review thread (body as submitted, 633 chars). Verdict: Changes requested."
- **Partner's comment Round 3 (YummieGG, 2026-09-04):** "Applied the suggested changes. The API now returns only id and name, and all unit tests have been updated accordingly. Thanks!"
- **My review Round 4 (Snnn3, CHANGES_REQUESTED, 2026-09-04):** "Critical — Spec Failure: Ticket Number Generation & Concurrency — (1) Race/Collision Risk: parses lastTicket.ticketNumber from findFirst(orderBy id desc) instead of MAX(ticketNumber), collides on deleted/seeded-out-of-order rows; (2) Unhandled Unique Violation: $transaction lets Prisma P2002 bubble to catch-500, violating BR-01 (must never 500 on valid submit); (3) Unsafe Type Bypassing: dbClient: any hides that $executeRaw + findFirst must exist. Fix: sequence table / SELECT FOR UPDATE / nextval(), or catch P2002 and retry 2–3x; type dbClient as Prisma.TransactionClient. Verdict: Changes requested." (Full text on the PR thread.)
- **Partner's comment follow-up 1 (YummieGG, 2026-09-05):** Shipped the missing attachment feature per Issue #14 (picker with format/size caption, 5 MB + type client checks, multipart submit), forced priority selection, fixed TK-9999 sequencing via length-ordered SQL + regex, added docker/env setup and new tests.
- **Partner's comment follow-up 2 (YummieGG, 2026-09-05):** Resolved 5 spec-audit points with tests: spec badge tokens, green success banner, button busy style, MIME-type validation incl. spoofed files, and fs-writes moved outside the DB transaction plus a safe ticket-number fallback sort.
- **Partner's comment follow-up 3 (YummieGG, 2026-09-05):** Tightened validation (positive-int IDs, `attachments`-only multipart, empty-MIME rejection), store-files-before-metadata with DB-failure cleanup, kept advisory-lock transaction, improved mixed-batch UX and error a11y, plus a how-to-test list.
- **My review Round 5 (Snnn3, APPROVED, 2026-09-05):** "### PR Review: Approved! Great work!! All the critical items from the previous review iterations have been successfully resolved: - **Concurrency & Ticket Generation (BR-01)**: Advisory transaction lock (`pg_advisory_xact_lock`) and the 3-attempt `P2002` retry loop are properly implemented. - **Foreign Key & `isActive` Validation (BR-05, BR-24, BR-25)**: Accurately validates `requesterId`, `categoryId`, and optional `relatedSystemId`, returning client-friendly `400` errors with field details. - **API Contract Alignment**: `POST /api/tickets` 201 response includes expanded `category`, `relatedSystem`, `requester`, and `attachments`. - **Multipart Attachments**: Proper limits (max 5 files, 5MB, allowed formats) and atomic storage handling. - **Zen Green UI**: Reusable components, focus rings, disabled busy state, and responsive layout meet the specification. - **Test Suite**: All 30 server tests and 27 client tests pass without errors. LGTM!"
- **Partner's comment Round 5 (YummieGG, 2026-09-05):** Quoted my Round 5 approval, then replied: "Thanks sososososososo much bros"
- **Status:** PR #22 MERGED 2026-09-05 (verified via `gh pr view --repo YummieGG/toktickit`).
