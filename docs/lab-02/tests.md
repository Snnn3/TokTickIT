# Lab 2 Test Plan and Results

Version: 1.0 | Date: 2026-08-24 | Companion to `specification.md` (AC refs) and `api-spec.md`.

## 1. Test Strategy

Test DD first: this plan was authored with the specification BEFORE implementation; failing tests
are written per issue, then minimal implementation makes them green (TDD), refactoring without red.
Levels: Unit, API/integration (Supertest against Express app w/ test database), UI component/style
(Vitest + Testing Library + jsdom), Responsive (Playwright viewport assertions), E2E (Playwright
chromium full user journeys). Coverage targets every BR and AC including happy paths, invalid input,
boundaries, ownership, failures, loading/empty/no-results states, responsive behavior, the full
attachment lifecycle, and multi-requester isolation. Final statuses are filled in during execution.

## 2. Planned Tests

| ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| U-01 | Unit | AC-01, BR-01 | Number generator format/uniqueness | Matches ^TKT-\d{4}-\d{5}$; successive values unique | server/tests/lab-02/ticket-number.unit.test.ts | |
| U-02 | Unit | AC-04, AC-05, BR-07/08 | Shared validators trim + limits | Trimmed lengths enforced; boundary values pass/reject correctly | client/src/__tests__/lab-02/validation.unit.test.ts | |
| A-01 | API | AC-01, BR-01/02/12 | Create valid ticket | 201; unique number returned; status NEW; ticketDate set; row persisted with matching requesterId | server/tests/lab-02/create-ticket.api.test.ts | |
| A-02 | API | AC-04 | Missing summary | 400 VALIDATION_FAILED details[].field=summary; nothing saved | server/tests/lab-02/create-ticket.api.test.ts | |
| A-03 | API | AC-05 | Summary 151 chars / Description 5001 chars | 400 per-field limit issues; 150/5000 boundary accepted | server/tests/lab-02/create-ticket.api.test.ts | |
| A-04 | API | AC-06, BR-09/10/11 | Unknown category/system, bad priority | 400 naming the offending field | server/tests/lab-02/create-ticket.api.test.ts | |
| A-05 | API | AC-07, AC-10, BR-14 | Unsupported file type at create | 415 UNSUPPORTED_TYPE; transaction rolled back (no ticket row) | server/tests/lab-02/create-ticket.api.test.ts | |
| A-06 | API | AC-08/09, BR-13 | >5MB file; >5 files at create | 413 FILE_TOO_LARGE; 400 count violation; nothing saved | server/tests/lab-02/create-ticket.api.test.ts | |
| A-07 | API | AC-19, BR-04 | Reference endpoints active-only | categories/systems/requesters exclude inactive; name-asc order | server/tests/lab-02/create-ticket.api.test.ts | |
| A-08 | API | AC-03/18, BR-06 | List scoped to owner | Only X-Requester-Id owner's tickets returned; B never sees A's | server/tests/lab-02/my-tickets.api.test.ts | |
| A-09 | API | AC-13, BR-19 | Search semantics | Case-insensitive contains on number OR summary only | server/tests/lab-02/my-tickets.api.test.ts | |
| A-10 | API | AC-14, BR-20 | Filters category/priority/status | Result sets match filters exactly | server/tests/lab-02/my-tickets.api.test.ts | |
| A-11 | API | AC-15, BR-20 | Sorting | Default updatedAt desc + number tiebreak; explicit sort/order honored | server/tests/lab-02/my-tickets.api.test.ts | |
| A-12 | API | AC-16, BR-21 | Pagination + invalid params | Correct slice + {page,pageSize,total,totalPages}; page=0/pageSize=999 -> 400 | server/tests/lab-02/my-tickets.api.test.ts | |
| A-13 | API | AC-02, BR-22 | Missing/unknown X-Requester-Id | 401 AUTH_REQUIRED envelope | server/tests/lab-02/my-tickets.api.test.ts | |
| A-14 | API | AC-03, BR-06 | Detail ownership | Owner 200; other requester 403; unknown id 404 | server/tests/lab-02/ticket-detail.api.test.ts | |
| A-15 | API | FR-09 | Detail payload | All read-only fields + attachments metadata array present | server/tests/lab-02/ticket-detail.api.test.ts | |
| A-16 | API | FR-10, BR-15 | Add attachment to owned ticket | 201 metadata; ticket untouched on failure paths | server/tests/lab-02/attachments.api.test.ts | |
| A-17 | API | AC-07/08/09, BR-13 | Add limits | 6th active -> 409 LIMIT_REACHED; wrong type -> 415; oversize -> 413 | server/tests/lab-02/attachments.api.test.ts | |
| A-18 | API | AC-11, BR-16 | Download lifecycle | Active -> 200 exact bytes + headers; removed -> 410 REMOVED | server/tests/lab-02/attachments.api.test.ts | |
| A-19 | API | AC-12, BR-17 | Soft removal rules | No reason -> 400; valid reason -> 200 retained metadata + removedAt; repeat -> 409 ALREADY_REMOVED | server/tests/lab-02/attachments.api.test.ts | |
| A-20 | API | BR-06 | Attachment metadata ownership | Other requester -> 403; unknown -> 404 | server/tests/lab-02/attachments.api.test.ts | |
| C-01 | UI | AC-04 | Summary required UX | Field message shown; fetch not called | client/src/__tests__/lab-02/CreateTicket.test.tsx | |
| C-02 | UI | AC-05 | Limit messages live | Over-limit messages under fields before submit | client/src/__tests__/lab-02/CreateTicket.test.tsx | |
| C-03 | UI | AC-06 | Required selects validated | Messages per missing classification field | client/src/__tests__/lab-02/CreateTicket.test.tsx | |
| C-04 | UI | AC-01, FR-07 | Success panel | Official number rendered from mocked response + view action | client/src/__tests__/lab-02/CreateTicket.test.tsx | |
| C-05 | UI | AC-21, BR-18 | Busy duplicate guard | Second click during flight impossible; button aria-busy | client/src/__tests__/lab-02/CreateTicket.test.tsx | |
| C-06 | UI | AC-20, BR-23 | API failure retention | Banner shown; all entered values still present | client/src/__tests__/lab-02/CreateTicket.test.tsx | |
| C-07 | UI | AC-17, BR-24 | Empty vs no-results | Distinct markup/copy for both states | client/src/__tests__/lab-02/MyTickets.test.tsx | |
| C-08 | UI | AC-13 | Search wiring | Debounced query params sent; results rendered | client/src/__tests__/lab-02/MyTickets.test.tsx | |
| C-09 | UI | AC-02 | Route guard | Unauthenticated (no selection) renders selector instead of screen | client/src/__tests__/lab-02/MyTickets.test.tsx | |
| C-10 | UI | AC-23 | Read-only distinction | Readonly classes/shading on ticket fields; no editable controls | client/src/__tests__/lab-02/RequesterTicketDetail.test.tsx | |
| C-11 | UI | AC-12, BR-17 | Remove dialog contract | Empty reason blocks confirm; confirmed remove calls DELETE w/ reason | client/src/__tests__/lab-02/AttachmentSection.test.tsx | |
| C-12 | UI | AC-11 | Removed rendering | Strikethrough + disabled actions; no download call possible | client/src/__tests__/lab-02/AttachmentSection.test.tsx | |
| C-13 | UI | AC-07/08 | Client file pre-checks | Invalid type/size rejected locally with messages before any request | client/src/__tests__/lab-02/AttachmentSection.test.tsx | |
| S-01 | Style | AC-22, ui-spec 1/3 | Zen Green conformance | Header/primary-button/focus classes present on key elements | client/src/__tests__/lab-02/CreateTicket.test.tsx | |
| S-02 | Style | ui-spec 4 | Badge consistency | Priority/status badges use mandated classes+labels | client/src/__tests__/lab-02/MyTickets.test.tsx | |
| R-01 | Responsive | AC-22 | No mobile horizontal scroll | document.scrollWidth <= innerWidth at 1366/768/375 | e2e/lab-02/requester-ticket-flow.spec.ts | |
| E-01 | E2E | AC-01/24 | Selector -> create happy path | Keyboard-usable selection; created number appears; ticket findable | e2e/lab-02/requester-ticket-flow.spec.ts | |
| E-02 | E2E | AC-18/03, AC-12 | Isolation + attachment lifecycle | A creates+attaches; switch to B sees none; A removes w/ reason; re-download blocked | e2e/lab-02/requester-ticket-flow.spec.ts | |
| E-03 | E2E | AC-22 | Screenshot evidence | Desktop/tablet/mobile PNGs written to artifacts/lab-02/screenshots/* | e2e/lab-02/requester-ticket-flow.spec.ts | |

Manual-only supplement (documented, not automated): backend-down visual state capture for Part 6
(stop server, screenshot preserved-form banner).

## 3. Acceptance-Criterion Traceability

| AC | Tests |
|---|---|
| AC-01 | U-01, A-01, C-04, E-01 |
| AC-02 | C-09, E-01 |
| AC-03 | A-08, A-14, A-20, E-02 |
| AC-04 | U-02, A-02, C-01 |
| AC-05 | U-02, A-03, C-02 |
| AC-06 | A-04, C-03 |
| AC-07 | A-05, A-17, C-13 |
| AC-08 | A-06, A-17, C-13 |
| AC-09 | A-17 |
| AC-10 | A-05 |
| AC-11 | A-18, C-12 |
| AC-12 | A-19, C-11, E-02 |
| AC-13 | A-09, C-08 |
| AC-14 | A-10 |
| AC-15 | A-11 |
| AC-16 | A-12, R-01, E-03 |
| AC-17 | C-07 |
| AC-18 | A-08, E-02 |
| AC-19 | A-07 |
| AC-20 | C-06 (+manual capture) |
| AC-21 | C-05 |
| AC-22 | R-01, S-01, E-03 |
| AC-23 | C-10 |
| AC-24 | E-01 (keyboard steps) |

Every AC maps to >=1 planned test; every planned automated test names its real file path.

## 4. Responsive and Visual Checklist

Executed per screen (Create, My Tickets, Detail) at 1366x768, 768x1024, 375x667:

- [ ] Colors match Zen Green tokens (ui-spec section 1)
- [ ] Editable vs read-only fields visually distinct
- [ ] Required asterisks present; validation messages below their fields
- [ ] Button hierarchy + busy states correct
- [ ] Badges consistent (text labels present)
- [ ] No clipping, overlap, unintended horizontal scrolling
- [ ] Empty vs no-results distinct on My Tickets
- [ ] Attachment rows render in active/uploading/invalid/removed/unavailable states
- [ ] Desktop table vs mobile cards both usable
- [ ] Keyboard-only pass on selector + forms

Evidence: artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/{desktop,tablet,mobile}.png

## 5. Test Commands

```bash
# server unit + API tests
cd server && npm test

# client component/style tests
cd client && npm test

# end-to-end + responsive (requires seeded dev DB running)
npx playwright install chromium   # first time only
npx playwright test e2e/lab-02
```

## 6. Final Results

Filled at sprint end: per-suite pass counts, run dates, commit hash of final main run.
_(pending implementation)_

## 7. Known Limitations or Deferred Tests

- True backend-outage E2E is replaced by manual capture (Part 6 evidence) - Playwright route-abort
  alternative documented if time allows.
- Real authentication flows out of scope until Lab 3 (BR-25 evolution point).
