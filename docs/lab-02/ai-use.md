# AI Use Log — Lab 2

LLM used: **ox-alpha** (accessed via opencode CLI)

Prompts are recorded below in full, verbatim. The student adds summaries and the final reflection manually.

---

## Prompt 1 — Sprint planning from Lab 2 labsheet (2026-08-23)

**Outcome:** Extracted full Lab 2 requirements and produced an 8-phase workflow mapped to ~9 GitHub Issues. Decisions locked during follow-up Q&A: Ticket Number format `TKT-{year}-{5-digit sequence}`, attachment bytes stored as Postgres `bytea`, selected-requester identity carried via `X-Requester-Id` header middleware, hyphenated `ai-use.md` filename, `gh` CLI issue creation.

**Prompt (verbatim):**

```text
Call the Skill tool twice, for "grilling" and "domain-modeling".

Base directory for this skill: C:\Users\lchan\.agents\skills\grill-with-docs
Relative paths in this skill (e.g., scripts/, references/) are relative to this base directory.

c:\KMUTT\Y3T1\CPE334\ToktikIT\Lab_02_labsheet.pdf understand this pdf and plan Lab 2 workflow from this lab sheet
```

---

## Prompt 2 — Remove delivery issue; standing rule to log all prompts (2026-08-23)

**Outcome:** Issue Lab2-9 (#23) deleted; agreed that every future prompt in this sprint is appended here verbatim.

**Prompt (verbatim):**

```text
i the issue Lab2-9 it might not necessary delete it and always save the prompt to @docs/lab-02/ai-use.md .
```

---

## Prompt 3 - Request plan as markdown for review (2026-08-23)

**Outcome:** Full execution plan written to `docs/lab-02/plan.md` for student re-check.

**Prompt (verbatim):**

```text
give me your plan in md i will re-cheack it
```

---

## Prompt 4 — Cross-check plan against labsheet criteria (2026-08-24)

**Outcome:** Detailed gap analysis produced. Plan covered ~85-90% of labsheet criteria. Identified 5 critical gaps: specific test file names, schema evolution for Lab 3, badge consistency, appendix template structures, and frontend vs backend validation split. Most other gaps belong in downstream spec documents (specification.md, api-spec.md, ui-spec.md), not the plan itself.

**Prompt (verbatim):**

```text
@docs/lab-02/plan.md check this plan is it contain all of @material/Lab_02_labsheet.pdf citeria
```

---

## Prompt 5 — Improve plan to cover all labsheet criteria (2026-08-24)

**Outcome:** Plan expanded from 119 to 197 lines (14 sections). All 5 critical gaps addressed: (1) mandatory test file names added §9.1, (2) Lab 3 schema evolution added to Issue #17, (3) badge consistency added to Issues #19/#21, (4) Appendix A/B/C template structures referenced in Issue #16, (5) frontend vs backend validation split added to §6 and Issue #18. Also added: Issue #24 explanatory text + keyboard accessibility, Issue #18 component rules (§8.3), Issue #20 attachment states (§4.5), per-endpoint API error docs (§6.3), screen modes enumeration, AI agent workflow rules (§11), required fields checklist (§4.4), explicit excluded scope (§4.2), expanded DoD with Product/Delivery split, and additional Notes/Risks (nav requirements, attachment metadata, DB design justification).

**Prompt (verbatim):**

```text
let improve the plan to make it perfect. i will give this to another agent and save my prompt in to @docs/lab-02/ai-use.md
```

---

## Prompt 6 - Update plan.md to a new version (2026-08-24)

**Outcome:** plan.md rewritten as v2.0: restructured into 15 clean sections, fixed duplicate headings/orphan bullets, added submission-evidence map (Parts 1-9 w/ pts), and restored the v1.1 cross-check improvements (badge consistency, FE/BE validation split, Lab 3 schema evolution, appendix template refs) that the rewrite had dropped.

**Prompt (verbatim):**

```text
update your plan @docs/lab-02/plan.md to new version
```

---

## Prompt 7 - Execute the plan (2026-08-24)

**Outcome:** Started Issue #16 on `feature/lab2-1-contract`: drafting the four contract documents (specification.md, api-spec.md, ui-spec.md, tests.md) from plan.md v2.0.

**Prompt (verbatim):**

```text
use  @docs/lab-02/plan.md
```

---

## Prompt 8 - Confirm plan; hold until told to start (2026-08-24)

**Outcome:** plan.md adopted as the working contract; execution paused awaiting explicit start signal. No files written beyond this log.

**Prompt (verbatim):**

```text
use this plan  @docs/lab-02/plan.md  and wait for me to start
```

---

## Prompt 9 - Start Issue 16 (2026-08-24)

**Outcome:** Began contract authoring on `feature/lab2-1-contract`: writing specification.md, api-spec.md, ui-spec.md, tests.md per plan.md v2.0.

**Prompt (verbatim):**

```text
let do issue 16
```

---

## Prompt 10 - PR 25 merged; push .gitignore; start Issue 17 (2026-08-24)

**Outcome:** Synced lab2-staging; opened `feature/lab2-2-data` carrying the student's .gitignore edit into the next PR; implementing Prisma models, migration, and idempotent seed per specification.md section 7.

**Prompt (verbatim):**

```text
pr#25 already merge dont forget to push .gitignore. let move to issue#17
```

---

## Prompt 11 - How to test the schema (2026-08-25)

**Outcome:** Provided manual verification steps: docker compose up, prisma migrate status/studio, idempotent seed rerun, count-check script.

**Prompt (verbatim):**

```text
how can i test the schema
```

---

## Prompt 12 — Execution plan presentation & Issue #17 status check (2026-08-29)

**Outcome:** Presented the execution plan artifact in the side panel and checked the current status of Issue #17 (Data increment: Prisma schema, migration, seed script) against specification.md.

**Prompt (verbatim):**

```text
@docs\lab-02\plan.md use this plan to impelement this project. now we in issue#17 if you need some thing to know more you find in @[docs/lab-02] and @[material] we in lab2. Can you show the plan this left side. save the prompt in @[docs/lab-02/ai-use.md]
```

---

## Prompt 13 — Issue #17 Implementation Readiness & PR Review Check (2026-08-29)

**Outcome:** Confirmed that all Issue #17 requirements (Prisma models, database migration, sequence, and idempotent seed) are fully implemented on `feature/lab2-2-data` and PR #26 is open and ready for peer review and merge into `lab2-staging`.

**Prompt (verbatim):**

```text
before moveing to next issue my friend should review the pr and merge for me. have you need something to impletement this issue
```

---

## Prompt 14 — Start Issue #24 on feature/lab2-3-requester-context (2026-08-31)

**Outcome:** Synced `lab2-staging` following PR #26 merge, branched `feature/lab2-3-requester-context`, and implementing `GET /api/requesters`, `X-Requester-Id` header validation middleware, Development Requester selection UI, and session context management per specification.md.

**Prompt (verbatim):**

```text
my friend already merge PR#26 let do issue#24 in the following plan
```

---

## Prompt 15 — Push branch and create Pull Request for Issue #24 (2026-08-31)

**Outcome:** Pushed `feature/lab2-3-requester-context` to remote and created GitHub Pull Request targeting `lab2-staging` for peer review.

**Prompt (verbatim):**

```text
create the Pull request tooo
```

---

## Prompt 16 — Rigorous Verification and Implementation Audit of Issue #24 (2026-08-31)

**Outcome:** Audited all requirements, business rules, acceptance criteria, and UI/API specs for Issue #24. Executed full test suites (server + client), typechecking, and linting to ensure 100% compliance before PR approval.

**Prompt (verbatim):**

```text
/implement checking and implement  the issue#24
```

---

## Prompt 17 — Start Issue #18 (Create Ticket) on feature/lab2-4-create-ticket (2026-09-01)

**Outcome:** Synced `lab2-staging` after PR #27 merged, branched `feature/lab2-4-create-ticket`, updated execution plan and Kanban tracking, and started implementing the Create Ticket full-stack feature (multipart backend with transactional number generation and atomic attachments, Zen Green validated frontend form) per specification.md.

**Prompt (verbatim):**

```text
/implement my friend already merge the PR#27. let do next issue and don't forget to move the kanban board.
```

---

## Prompt 18 — Address Code Review & Spec Feedback on Issue #18 (2026-09-01)

**Outcome:** Addressed all standards and spec review findings on `feature/lab2-4-create-ticket`: aligned client and server file validation logic, added tooltips and loading option states to Create Ticket form, streamlined backend file processing, and modularized ticket creation controller logic.

**Prompt (verbatim):**

```text
/implement do following the code review and the spec
```

---

## Prompt 19 — Boxed layout for ticket number and date (2026-09-01)

**Outcome:** Refined the Create Ticket form and Success confirmation panel to display the Ticket Number and Ticket Date inside distinct, clearly framed readonly input boxes and highlighted metadata cards with Zen Green tokens.

**Prompt (verbatim):**

```text
fix while create show the ticket number and date must be in box
```

---

## Prompt 20 — Display actual ticket number and date in boxes on success state (2026-09-01)

**Outcome:** Updated the Create Ticket component so that once a ticket is created, the official generated Ticket Number and timestamp are populated into the System Metadata boxes on the working screen.

**Prompt (verbatim):**

```text
fix while create show the ticket number and date must be in box Generated after submission show the number
```

---

## Prompt 21 — Show preview ticket number and date in creation mode (2026-09-01)

**Outcome:** Updated creation mode to render the official ticket number format preview `TKT-YYYY-##### (Generated on submission)` and current date preview `Today (Auto-generated on submission)` inside the System Metadata boxes.

**Prompt (verbatim):**

```text
in creation mode Generated after submission this must show the preview number
```

---

## Prompt 22 — Update preview ticket number format to TKT-YYYY-XXXXX (2026-09-01)

**Outcome:** Updated creation mode preview ticket number from `##### (Preview)` to clean format `TKT-YYYY-XXXXX`.

**Prompt (verbatim):**

```text
##### (Preview) change to the actual number or xxxx
```

---

## Prompt 23 — Allow submission when invalid attachment attempt is not staged (2026-09-01)

**Outcome:** Fixed submission blocking bug in CreateTicket form: validation now evaluates active staged files rather than lingering attachment rejection warnings, added dismiss action to attachment warning alert, and auto-clears stale file errors on submission.

**Prompt (verbatim):**

```text
if i Attachment worng file and i dont want to Attachment anymore i cant sumbit ticket
```

---

## Prompt 24 — Restore legacy Lab 1 test compatibility (2026-09-01)

**Outcome:** Extracted Lab 1's CheckSystem component into `CheckSystem.tsx` and updated `tests/lab-01/` UI test suite so that running full regression tests (`npm test`) passes 100% across all legacy Lab 1 and current Lab 2 suites.

**Prompt (verbatim):**

```text
 FAIL  tests/lab-01/UI-03.error-state.test.tsx > Check System - API failure > displays a useful error message when the API is unavailable
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Check System"
i ran test and it fail
```

---

## Prompt 25 — Start Issue #19 (My Tickets) on feature/lab2-5-my-tickets (2026-09-01)

**Outcome:** Closed Issue #18, updated the execution plan Kanban board, created feature branch `feature/lab2-5-my-tickets`, and began implementing the full My Tickets list view feature (search/filter/sort/pagination backend `GET /api/tickets` and Zen Green responsive table/card frontend `MyTickets.tsx`).

**Prompt (verbatim):**

```text
/implement let do the issue 19 and close the issue 18 it is already finish do forget to moving the kanban board of issue and dont open pr when finished.
```

---

## Prompt 26 — Two-axis code review on feature/lab2-5-my-tickets (2026-09-01)

**Outcome:** Executed two-axis code review (Standards Reviewer and Spec Reviewer sub-agents in parallel) comparing `lab2-staging...feature/lab2-5-my-tickets` against specifications and coding standards for Issue #19.

**Prompt (verbatim):**

```text
/code-review at feature/lab2-5-my-tickets  review the issue#19  dont open pr
```

---

## Prompt 27 — Implement review findings: table/card skeletons, tertiary clear filters, action-link styling, shared badge/types, and creation scroll-to-top (2026-09-01)

**Outcome:** Implemented table and card skeleton loading placeholders per `ui-spec.md §8`, styled Clear Filters as a tertiary green link button, converted table row actions to action-links, extracted shared types & badge components, and added window scroll-to-top on successful ticket creation.

**Prompt (verbatim):**

```text
/implement ## Standards

  ### (a) Documented Standards Violations (Hard Violations)
  1. Loading State Presentation (ui-spec.md:115)
      • Rule: ui-spec.md §8 specifies loading state as "loading (table skeletons / card skeletons)".
      • Violation: MyTickets.tsx:350-359 renders a generic Bootstrap spinner (spinner-border) instead of table/card skeleton placeholders.
  2. Clear Filters Button Styling (ui-spec.md:45, ui-spec.md:107)
      • Rule: ui-spec.md §8 specifies "Clear filters tertiary", and §3 defines Tertiary as "green text link style".
      • Violation: MyTickets.tsx:272 uses btn btn-outline-secondary btn-sm w-100 (gray Bootstrap outline button) instead of a tertiary green link button.
  3. Table Row Action (ui-spec.md:109-110)
      • Rule: ui-spec.md §8 table columns specify "View action-link".
      • Violation: MyTickets.tsx:451 uses btn btn-zen-secondary btn-sm (pill button variant) rather than a green text action-link style.

  ### (b) Baseline Smells (Judgement Calls)

  1. Primitive Obsession / Data Clumps (MyTickets.tsx:39-47)
      • Heuristic: Eight individual filter/query state primitives (search, debouncedSearch, categoryId, priority, status, sort, order, page, pageSize) travel together across query fetching and
      resets. Packaging them into a single filter state object or a dedicated useTicketQuery hook would consolidate filter state transitions.
  2. Duplicated Code (MyTickets.tsx:143-153)
      • Heuristic: Priority mapping logic and Category interface definitions are duplicated between MyTickets.tsx and CreateTicket.tsx. Extracting shared badge helpers and common domain types into
      client/src/types / client/src/utils prevents drifting implementations across screens.

  ──────
  ## Spec

  ### (a) Missing or Partial Requirements

  • ui-spec.md:115 (Loading State): Spec mandates loading (table skeletons / card skeletons). Implementation renders a centered spinner (spinner-border) rather than skeleton placeholders. fix following this review dont open pr and use Pagination. if i create the ticket the create success i want it bring it back to the top
```

---

## Prompt 28 — Implement button token alignment, query state consolidation, uncontracted field pruning, and pagination cleanup (2026-09-01)

**Outcome:** Replaced default Bootstrap gray buttons with Zen Green tokens (`.btn-zen-secondary`), typed status with `TicketStatus`, consolidated filter state, extracted shared date formatting utility, pruned uncontracted fields (`systemId`, `systemName`, `ticketDate`) from `GET /api/tickets`, and cleaned up pagination display to strictly follow `ui-spec.md §8`.

**Prompt (verbatim):**

```text
/implement ## Standards

  ### (a) Documented Standards Violations (Hard / Strict)

  1. Button Hierarchy Token Deviation (ui-spec.md:42-46)
      • Standard: ui-spec.md §3 (Component States and Buttons - Button hierarchy) defines strict button variants: Primary (#006B3C), Secondary (white bg, 1px #006B3C border), Tertiary/link, and
      Destructive.
      • Locations:
          • MyTickets.tsx:390: <button className="btn btn-sm btn-outline-secondary" ...>Clear filters</button> in no-results state.
          • MyTickets.tsx:540: <button className="btn btn-outline-secondary btn-sm" ...> in pagination controls.
      • Violation: Uses default Bootstrap .btn-outline-secondary (gray border/hover) instead of Zen Green design tokens (.btn-zen-secondary or .btn-zen-tertiary).
  ### (b) Baseline Code Smells (Judgement Calls)
  1. Primitive Obsession (MyTickets.tsx:27)
      • Hunk:
        const [priority, setPriority] = useState<TicketPriority | "">("");
        const [status, setStatus] = useState("");

      • Smell: status is held as an untyped string primitive useState("") instead of utilizing the domain type TicketStatus | "" (as done with ticket.ts:3).
  2. Data Clump (MyTickets.tsx:23-32)
      • Hunk:
        const [search, setSearch] = useState("");
        const [debouncedSearch, setDebouncedSearch] = useState("");
        const [categoryId, setCategoryId] = useState("");
        const [priority, setPriority] = useState<TicketPriority | "">("");
        const [status, setStatus] = useState("");
        const [sort, setSort] = useState("updatedAt");
        const [order, setOrder] = useState<"asc" | "desc">("desc");
        const [page, setPage] = useState(1);
        const [pageSize, setPageSize] = useState(10);

      • Smell: Nine separate filter and pagination state hooks travel together across fetchTickets, URL parameter building, and reset handlers; bundling into a single query state object or custom
      hook improves cohesion.
  3. Duplicated Code (MyTickets.tsx:461, MyTickets.tsx:511)
      • Hunk:
        // Desktop row:
        {new Date(ticket.updatedAt).toLocaleString()}
        // Mobile card:
        <span>Updated: {new Date(ticket.updatedAt).toLocaleString()}</span>

      • Smell: Raw inline date formatting is duplicated across desktop and mobile render trees rather than using a shared date utility or formatting helper.

  ──────
  ## Spec

  ### (a) Missing or Partial Requirements

  • None. All requirements across functional specifications (FR-08), business rules (BR-19–BR-21, BR-24), acceptance criteria (AC-13–AC-17, AC-22), UI specifications (ui-spec.md §8, §11, §12), and
  REST contracts (api-spec.md §2) are fully implemented with unit, API, and component test coverage.

  ### (b) Scope Creep / Unrequested Behaviour

  1. Extra ticket fields in API list payload (api-spec.md:94-97):
      • api-spec.md §2 defines list items with {id, number, summary, categoryId, categoryName, requestedPriority, status, createdAt, updatedAt}.
      • tickets.ts:408-412 also maps and exposes systemId, systemName, and ticketDate in the list response.
  2. Additional record counter in pagination strip (ui-spec.md:113):
      • ui-spec.md §8 specifies Page X of Y (N tickets).
      • MyTickets.tsx:531-534 adds a preceding "Showing X to Y of N tickets" label alongside the mandated page indicator.


  ### (c) Implementation Discrepancies / Potential Issues

  • None. Verification details:
      • Search & Filters: Debounced at 300ms (ui-spec.md:105; FR-08), queries number OR summary case-insensitively (BR-19, AC-13), and strictly supports categoryId, priority, and status=NEW (BR-20,
      AC-14).
      • Sorting & Tiebreaking: Default updatedAt desc applies secondary number desc tiebreak (BR-20, tickets.ts:381, AC-15).
      • Pagination & Validation: Whitelisted pageSize {5, 10, 20} with 400 on invalid input (BR-21, api-spec.md, AC-16).
      • Empty vs. No-Results: Explicit separation of zero-ticket state from filter-miss state with correct copy and action CTAs (BR-24, AC-17, ui-spec.md §8).
      • Responsive Layout: Desktop table (>=992px), tablet table hiding category column (768–991px), and touch-friendly mobile cards (<768px) with whole-card click handlers (ui-spec.md §8, §11, AC-
      22).

  ──────
  Summary: 4 Standards findings (worst: pagination and no-results buttons using default Bootstrap gray outline rather than Zen Green tokens); 2 Spec findings (worst: GET /api/tickets exposing
  additional uncontracted fields systemId, systemName, and ticketDate). fix following this
```

---

## Prompt 29 — Add direct page number jump buttons and fix pagination transitions (2026-09-01)

**Outcome:** Added direct clickable page number buttons with smart windowing (allowing users to click exact page numbers to jump/skip pages directly), placed page size selector alongside pagination controls, and eliminated debounce timer state reset collisions.

**Prompt (verbatim):**

```text
pagination doesnt work i want the number to skip it
```

---

## Prompt 30 — Position pagination to bottom right, remove per-page selector, keep default page size 10 (2026-09-01)

**Outcome:** Aligned pagination controls to the bottom right of the tickets list, removed the per-page selector dropdown from the UI while keeping pageSize fixed at the default of 10.

**Prompt (verbatim):**

```text
make it bottom right of list delete the number showing per page keep defualt at 10
```

---

## Prompt 31 — Generate realistic, spec-compliant mock data in seed script (2026-09-01)

**Outcome:** Analyzed spec compliance for mock data (confirmed full alignment with BR-01, BR-02, BR-06, BR-09..11, BR-24) and implemented 16 realistic, multi-category, multi-requester mock tickets in `server/prisma/seed.ts`.

**Prompt (verbatim):**

```text
can you create the mockup data for me. does it conflict thge spec
```

---

## Prompt 32 — Fix missing npm run db:seed script in package.json (2026-09-01)

**Outcome:** Added `db:seed` and `seed` script aliases to both root `package.json` and `server/package.json` so `npm run db:seed` executes reliably from either directory.

**Prompt (verbatim):**

```text
npm run db:seed
npm error Missing script: "db:seed"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: C:\Users\lchan\AppData\Local\npm-cache\_logs\2026-09-01T14_58_34_954Z-debug-0.log
```

---

## Prompt 33 — Restore pageSize selector {5,10,20}, simplify pagination controls to prev/next + indicator, and refactor ZenBadge mapping (2026-09-01)

**Outcome:** Restored the specified `pageSize` selector `{5, 10, 20}` in the bottom pagination bar per `ui-spec.md §8`, simplified pagination controls to `Previous`, `Page X of Y (N tickets)`, and `Next`, and refactored `ZenBadge.tsx` with a strongly typed lookup map (`Record<TicketPriority, string>`).

**Prompt (verbatim):**

```text
## Standards

  ### (a) Documented Standards Violations (Hard Violations)
  1. Missing pageSize Selector in Pagination Bar (ui-spec.md:113)
      • Standard: ui-spec.md §8 (Screen: My Tickets) specifies:
      │ "Pagination bar: prev/next + page indicator 'Page X of Y (N tickets)'; pageSize select {5,10,20}."
      • Location: MyTickets.tsx:558-614
      • Violation: The pageSize selector {5, 10, 20} was omitted in the pagination strip, locking pageSize: 10 in query state.


  ### (b) Baseline Code Smells (Judgement Calls)
  1. Speculative Generality (MyTickets.tsx:157-169, MyTickets.tsx:579-599)
      • Hunk:
        const getPageNumbers = (): (number | string)[] => {
          if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
          if (current <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
          if (current >= totalPages - 3) return [1, "...", totalPages - 4, ...];
          return [1, "...", current - 1, current, current + 1, "...", totalPages];
        };

      • Observation: Generates multi-page range/ellipsis jumping buttons not specified in ui-spec.md §8 (which only specifies prev/next + page indicator), adding pagination logic while omitting the
      specified pageSize selector.
  2. Primitive Obsession / Repeated Switches (ZenBadge.tsx:3-9)
      • Hunk:
        let badgeClass = "badge badge-zen-low";
        if (priority === "HIGH") {
          badgeClass = "badge badge-zen-high";
        } else if (priority === "MEDIUM") {
          badgeClass = "badge badge-zen-medium";
        }

      • Observation: Using loose TicketPriority | string with cascading if/else conditionals instead of a typed lookup map (e.g., Record<TicketPriority, string>).

  ──────
  ## Spec

  ### (a) Missing or Partial Requirements

  1. Page Size Selector Missing in UI (ui-spec.md:113, specification.md:279):
      • Spec: ui-spec.md §8 specifies "Pagination bar: prev/next + page indicator 'Page X of Y (N tickets)'; pageSize select {5,10,20}." & specification.md Assumption A7: "pageSize whitelist {5,10,
      20}, default 10 | Prevents abuse-sized pages; predictable UI dropdown".
      • Finding: The per-page selector dropdown was removed from MyTickets.tsx. Users currently have no UI control to select between 5, 10, or 20 items per page even though backend support is
      implemented.


  ### (b) Behaviour in Diff Not Asked For (Scope Creep)

  1. Direct Page Jump Number Buttons & Ellipsis Navigation (ui-spec.md:113):
      • Spec: ui-spec.md §8 specifies Pagination bar: prev/next + page indicator "Page X of Y (N tickets)"; pageSize select {5,10,20}.
      • Finding: MyTickets.tsx:157-169 adds numerical page jump buttons (1, 2, 3...) and ellipsis navigation logic beyond the prev/next + text page indicator requested.
  2. Seeding Mock Tickets in Database Seed (specification.md:168-172):
      • Spec: specification.md §7 specifies seeding 4 Categories, 7 Related Systems, 4 active Requesters, and 1 inactive Requester.
      • Finding: seed.ts:28-237 added 16 mock Ticket entities. While useful for manual testing, ticket generation was not part of the initial seed contract.


  ### (c) Requirements Implemented Incorrectly

  • None. Search debounce (300ms, Number/Summary substring), multi-parameter filtering (Category, Priority, Status NEW), sorting (updatedAt desc + number desc), ownership isolation (X-Requester-Id),
  empty vs no-results distinction, table/card responsive rendering, and query parameter validation (HTTP 400 INVALID_QUERY) strictly comply with specification.md (FR-08, BR-19..BR-21, BR-24, AC-13.
  .AC-17, AC-22) and api-spec.md §2.
  ──────
  Summary: 3 Standards findings (worst: missing {5,10,20} pageSize selector in the pagination bar); 3 Spec findings (worst: missing required pageSize dropdown control in UI while adding unrequested
  numeric jump buttons). fix following thjis
```

---

## Prompt 34 — Fix color token inconsistency on mobile card, extract useCategories hook, and clean baseline seed (2026-09-01)

**Outcome:** Replaced `text-dark` on mobile card summary with `var(--zg-text-primary)` color token, extracted shared `useCategories` custom hook across `MyTickets.tsx` and `CreateTicket.tsx`, and reverted `server/prisma/seed.ts` to strictly adhere to the Section 7 baseline dataset.

**Prompt (verbatim):**

```text
/implement following this comment   ## Standards

  ### (a) Documented Standards Violations
  1. Minor Token Inconsistency (ui-spec.md:17)
      • Standard: docs/lab-02/ui-spec.md §1 (Color Tokens): text-primary (#22332B) — "dark charcoal-green body text (never pure black)".
      • Location: MyTickets.tsx:521
      • Violation: Mobile ticket card summary uses Bootstrap class text-dark (#212529 / pure black) instead of the design token var(--zg-text-primary) or inheriting body text color:
        <div className="fw-medium small mb-2 text-dark">{ticket.summary}</div>
  ### (b) Baseline Smells (Judgement Calls)
  1. Duplicated Code / Data Clumps (MyTickets.tsx:72-85 vs CreateTicket.tsx:53-73)
      • Hunk:
        useEffect(() => {
          async function loadCategories() {
            try {
              const res = await fetch("/api/reference/categories");
              if (res.ok) {
                const data = await res.json();
              }
            } catch { /* ... */ }
          }
          loadCategories();
        }, []);

      • Observation: Reference category fetching and state management are duplicated between MyTickets.tsx and CreateTicket.tsx. Extracting a shared custom hook (e.g., useCategories /
      useReferenceData) would consolidate caching and error handling across views.

  ──────
  ## Spec

  ### (a) Missing or Partial Requirements

  • None identified. All core functional and acceptance criteria requirements for Issue #19 / My Tickets are fully satisfied:
      • FR-08 / BR-19 / AC-13: Debounced (300ms) case-insensitive search across Ticket Number OR Summary (ui-spec.md §8).
      • BR-20 / AC-14 / AC-15: Category, Priority, and Status (NEW) filters; sortable by updatedAt, createdAt, number with default updatedAt desc + number desc tiebreak.
      • BR-21 / AC-16: Pagination starting at page 1, pageSize select in {5, 10, 20} (default 10), {page, pageSize, total, totalPages} response envelope, and 400 validation on invalid query
      parameters.
      • BR-24 / AC-17: Distinct empty state ("No tickets yet - Create your first ticket") vs no-results state ("No tickets match your filters" + Clear filters) (ui-spec.md §8).
      • AC-22 / ui-spec.md §8 & §11: Responsive design with desktop table (>=992px), tablet view (768–991px omitting Category column), and interactive mobile cards (<768px).

                setCategories(data.categories || []);

  ### (b) Scope Creep / Unrequested Behaviour

  1. Mock Ticket Seed Dataset (specification.md:168-172):
      • Spec Quote: specification.md Section 7 (Data Changes):
      │ "Seed (idempotent, safe to rerun): 4 Categories (...); 7 Related Systems (...); 4 active Requesters (...); 1 inactive Requester (...)"

      • Finding: In seed.ts:28-237, 16 pre-populated mock tickets and Postgres sequence synchronization were added under SEED_MOCK_TICKETS=true. While beneficial for manual UI verification and
      pagination demonstration, pre-seeding ticket records was not requested in Section 7.


  ### (c) Requirements Implemented Incorrectly

  • None identified. Query validation in tickets.ts strictly adheres to api-spec.md §2 (400 INVALID_QUERY with parameter-level details; 401 AUTH_REQUIRED via requireRequester). MyTickets.tsx
  correctly implements the Zen Green tokens, accessible button hierarchy, skeleton loaders, and badge color/text pairings.
  ──────
  Summary: 2 Standards findings (worst: minor Bootstrap text-dark class usage on mobile card summary instead of Zen Green body text token); 1 Spec finding (worst: optional mock ticket seeding
  dataset added in seed.ts beyond Section 7 baseline).
```

---

## Prompt 35 — Polish codebase design: remove proxy files, add .text-zen-primary utility class, and finalize standards compliance (2026-09-01)

**Outcome:** Confirmed 0 hard standards violations and 0 spec defects. Polished code smells by eliminating proxy re-export file `useCategories.ts` in favor of direct `useReferenceData.ts` imports, adding `.text-zen-primary` utility class in `index.css`, and replacing inline style tokens.

**Prompt (verbatim):**

```text
/implement ## Standards

  ### (a) Documented Standards Compliance

  Hard Violations: 0

  The diff adheres to all documented repo standards across ui-spec.md, README.md, and README.md:
  • Design Tokens & Button Hierarchy (ui-spec.md:15-46): Implements Zen Green CSS tokens (--zg-primary, --zg-secondary, --zg-pale, --zg-surface, --zg-text-primary), accessible focus rings, and
  explicit button variants (.btn-zen-primary, .btn-zen-secondary, .btn-zen-tertiary, .zg-action-link).
  • Badges (ui-spec.md:49-59): ZenBadge.tsx matches token fills/borders (badge-zen-new, badge-zen-low, badge-zen-medium, badge-zen-high) with visible text labels and aria-label attributes.
  • My Tickets Layout & Behaviors (ui-spec.md:103-117, ui-spec.md:141-148):
      • Debounced search input (300ms) with exact placeholder "Search number or summary".
      • Responsive layout: multi-column table on desktop, tablet category column suppression (d-none d-lg-table-cell), and full clickable mobile cards (<768px).
      • Shimmer skeletons for both table and card views during data load.
      • Distinct empty ("No tickets yet - Create your first ticket") and no-results ("No tickets match your filters") states.
      • Full pagination controls ("Page X of Y (N tickets)", Prev/Next navigation, and {5, 10, 20} page size selector).


  ### (b) Baseline Smells (Judgement Calls)

  1. Middle Man (Minor): useCategories.ts:1
    export { useCategories, useReferenceData } from "./useReferenceData";
  Judgement: Standalone useCategories.ts exists as a re-export proxy after consolidating reference data hooks into useReferenceData.ts. Safe to keep for backward compatibility or simplify by
  importing directly from useReferenceData.
  2. Duplicated Logic Shape (Minor): useReferenceData.ts
  Judgement: useCategories() and useReferenceData() share similar fetch lifecycle structure (isMounted, loading/error handling). Acceptable separation since MyTickets.tsx only needs categories and
  avoids over-fetching system reference data.
  3. Inline Styles vs Utility Classes (Minor): MyTickets.tsx:438
    <button ... style={{ color: "var(--zg-primary)" }}>{ticket.number}</button>
  Judgement: Ad-hoc inline style consumption could optionally be unified under a utility class (e.g. .text-zen-primary), though it cleanly consumes the canonical CSS variable.
  ──────
  ## Spec

  ### (a) Missing or Partial Requirements

  • None: All functional requirements and acceptance criteria scoped for My Tickets are fully implemented:
      • FR-08 / BR-19 / AC-13: Debounced 300ms search matching Ticket Number or Summary case-insensitively (specification.md:63-64, ui-spec.md:105).
      • BR-20 / AC-14 / AC-15: Category, Priority, Status (NEW), and sort controls (updatedAt, createdAt, number with descending number tiebreak) (specification.md:110-111).
      • BR-21 / AC-16 / api-spec §2: Validated pagination returning {page, pageSize, total, totalPages}, with invalid query params returning HTTP 400 INVALID_QUERY (api-spec.md:80-98).
      • BR-24 / AC-17 / ui-spec §8: Clear visual distinction between empty state ("No tickets yet - Create your first ticket") and no-results state ("No tickets match your filters")
      (ui-spec.md:115-117).
      • AC-22 / ui-spec §8, §11: Responsive table (>=992px full columns, tablet minus Category) and mobile cards (<768px with full-card clickability) (ui-spec.md:109-111).


  ### (b) Behaviour in Diff Not Asked For (Scope Creep)

  • Convenience Package Scripts (package.json, package.json):
      • Added root and server shortcut scripts "db:seed" / "seed". While convenient for development and local testing, these convenience aliases are extra additions.


  ### (c) Requirements Implemented Incorrectly

  • None: The implementation adheres strictly to the contract:
      • Status Filter (ui-spec.md:106): Status select provides All Statuses and fixed NEW option without unsupported status choices.
      • Pagination Strip (ui-spec.md:113): Formatted as "Page X of Y (N tickets)" with previous/next controls and {5, 10, 20} page size selector.
      • Clear Filters (ui-spec.md:107): Rendered using tertiary styling (btn-zen-tertiary) and properly disabled when default query parameters are active.
      • Seed Baseline (specification.md:168-172): Seed strictly matches the idempotent 4 categories, 7 systems, 4 active requesters, and 1 inactive requester baseline.

  ──────
  Summary: 0 hard Standards violations (3 minor judgement calls on re-export proxy and inline styling); 0 hard Spec defects (1 minor convenience script alias in package.json). All previously
  identified issues are fully resolved. implement following this but keep the spec md in first piority
```

---

## Prompt 36 — Fix query validation strictness, secondary tiebreak ordering, and empty-state filtering logic (2026-09-01)

**Outcome:** Implemented strict integer validation for `categoryId`, `page`, and `pageSize` preventing malformed numbers (e.g. floats, trailing characters) from bypassing 400 INVALID_QUERY, aligned secondary tiebreak to respect requested sort direction, and decoupled sort/order state from the empty-state vs no-results-state determination per BR-24.

**Prompt (verbatim):**

```text
/implement Requirements Implemented Incorrectly

  1. Loose Query Validation for Integer Parameters (api-spec.md:80-90 BR-21, AC-16)
      • Spec Quote: api-spec.md §2: "categoryId: integer ... must be positive int if present", "page: integer >=1", "Any invalid value -> 400 INVALID_QUERY with per-param details [AC-16]."
      • Finding: In tickets.ts:221-231 and tickets.ts:292-302, standard parseInt() without regex/strict integer format checks allows malformed floats or trailing-character strings (e.g.
      categoryId="1abc", page="2.5") to be parsed as valid integers rather than returning 400 INVALID_QUERY.
  2. Secondary Tiebreak on Non-Default Sorts (specification.md:110-111 BR-20)
      • Spec Quote: BR-20: "default sort updatedAt descending with number descending tiebreak."
      • Finding: In tickets.ts:378-382, { number: "desc" } is unconditionally appended to all non-number queries, forcing a descending tiebreak even when explicitly querying ascending order (e.g.,
      sort=createdAt&order=asc).
1. Empty vs. No-Results State Discrepancy (specification.md:118-119 BR-24, AC-17, ui-spec.md:115-117)
      • Spec Quote: BR-24: "My Tickets distinguishes the empty state (requester has zero tickets) from the no-results state (filters/search matched nothing)." / AC-17: "Given a requester with no
      tickets versus filters matching nothing, then the empty state and the no-results state render distinctly."
      • Finding: In MyTickets.tsx:63-70, hasActiveFilters includes sort !== "updatedAt" and order !== "desc". If a requester with 0 tickets changes sort options without applying any search/filter
      criteria, the UI incorrectly renders the no-results-state ("No tickets match your filters") instead of empty-tickets-state ("No tickets yet - Create your first ticket").
fix to follow the criteria
```

---

## Prompt 37 — Refactor query integer parser, type query validation input, unify reference data hooks, and map status badges (2026-09-01)

**Outcome:** Extracted reusable `parseStrictInteger` query helper in `tickets.ts`, replaced `any` with typed `Record<string, unknown>` for query validation, unified `useCategories` onto `useReferenceData`, and added typed lookup map `STATUS_BADGE_MAP` in `ZenBadge.tsx`.

**Prompt (verbatim):**

```text
/implement ## Standards

  ### (a) Documented Standards Violations
  • None: No standalone CODING_STANDARDS.md or CONTRIBUTING.md exists in the repository. All documented rules in api-spec.md and ui-spec.md are satisfied (0 hard violations).

  ### (b) Baseline Smells (Judgement Calls)

  1. Duplicated Code — Query Integer Parsing (tickets.ts:221-238)
      • Hunk:
        const raw = String(query.categoryId).trim();
        if (!/^\d+$/.test(raw)) { ... }

      • Assessment: Regex check (/^\d+$/) and integer validation logic is duplicated across categoryId, page, and pageSize.
      • Recommendation: Extract a reusable helper parsePositiveInt(val, paramName, errorMsg) to unify integer validation.
  2. Primitive Obsession — Query Parameter Type (tickets.ts:198)
      • Hunk:
        function validateTicketQuery(query: any): QueryValidationResult

      • Assessment: Takes an unconstrained any instead of ParsedQs or a typed query interface.
  3. Duplicated Code — Reference Data Fetching (useReferenceData.ts:7-42)
      • Hunk:
        export function useCategories() { ... fetch("/api/reference/categories") ... }
        export function useReferenceData() { ... Promise.all([fetch("/api/reference/categories"), ...]) ... }

      • Assessment: Category fetch and lifecycle state management in useCategories duplicates logic in useReferenceData.
  4. Speculative Generality — Unmapped Status Badge (ZenBadge.tsx:20-26)
      • Hunk:
        export function ZenStatusBadge({ status }: { status: TicketStatus | string }) {
          return <span className="badge badge-zen-new" ...>{status}</span>;
        }

      • Assessment: ZenStatusBadge accepts TicketStatus | string prop but hardcodes class "badge badge-zen-new".

  ──────
  ## Spec

  ### (a) Requirements Missing or Partial

  • None: All core requirements for Issue #19 are fully implemented:
      • FR-08 / BR-19 / AC-13 (specification.md:63-64): Free-text search matching Ticket Number or Summary case-insensitively with 300ms debounce (ui-spec.md:105).
      • BR-20 / AC-14 / AC-15 (specification.md:110-111): Category, Priority, and Status (NEW) filters, with sortable fields (updatedAt, createdAt, number) and default descending sort with number
      descending tiebreak.
      • BR-21 / AC-16 (specification.md:112-113, api-spec.md:79-98): Strict query validation returning 400 INVALID_QUERY on malformed integers/enums and responding with full pagination envelope {
      tickets, page, pageSize, total, totalPages }.
      • BR-24 / AC-17 (specification.md:118-119): Clear distinction between empty state ("No tickets yet - Create your first ticket") and filtered no-results state ("No tickets match your filters")
      (ui-spec.md:115-117).
      • AC-22 (specification.md:241-242, ui-spec.md:109-111): Responsive layout rendering desktop table (>=992px), tablet view suppressing Category, and mobile cards (<768px, whole card clickable).


  ### (b) Behaviour in Diff Not Asked For (Scope Creep)

  1. CreateTicket scroll behavior modification (CreateTicket.tsx:196-198):
      • Injected window.scrollTo({ top: 0, behavior: "smooth" }) into CreateTicket.tsx on successful ticket creation (belongs to Issue #18 rather than Issue #19).
  2. Package Script Aliases (package.json:11-12, package.json:16-17):
      • Added shortcut scripts "db:seed" and "seed" following ths
```

---

## Prompt 38 — Final review verification for Issue #19 and query error field mapping (2026-09-01)

**Outcome:** Verified 0 hard violations and 0 spec defects on `feature/lab2-5-my-tickets`. Aligned error detail objects to include both `field` and `parameter` properties for full Section 1 & Section 2 compliance.

**Prompt (verbatim):**

```text
/implement ## Standards

  ### 1. Verification of Previous Feedback

  • Duplicated Integer Parsing (tickets.ts:198-221): FIXED. Extracted tickets.ts:198-221 helper validating regex /^\d+$/, bounds, and allowed sets across categoryId, page, and pageSize.
  • Duplicated Fetch Hooks (useReferenceData.ts:54-57): FIXED. useReferenceData.ts:54-57 delegates directly to useReferenceData.ts:7-49, avoiding redundant network request lifecycles.
  • Type Safety & Badge Mapping (ZenBadge.tsx): FIXED. Uses typed lookup records PRIORITY_BADGE_MAP and STATUS_BADGE_MAP keyed by domain types with safe fallbacks, eliminating repeated switch logic.

  ### 2. Standards Compliance by File / Hunk
  • tickets.ts:185-442: Full compliance with api-spec.md §3 (GET /api/tickets), specification.md (FR-08, BR-04, BR-19..BR-22), and AC-16 (returns 400 INVALID_QUERY with field-level details).
  Properly applies number tiebreaker across non-number sort orders per BR-20.
  • MyTickets.tsx: Adheres to ui-spec.md §8 and specification.md (BR-24, AC-17, AC-22). Consolidates query state into TicketQueryState, isolating active filter flags from pagination/sorting for
  correct empty-state display, and provides desktop table / mobile card skeletons.
  • ticket.ts & format.ts: Clean extraction of domain types and date formatting helper; avoids Primitive Obsession.
  ### 3. Baseline Smell Assessment

  • Hard Violations: 0
  • Judgement Calls / Smells: 0 (all previous smell items resolved).
  ──────
  ## Spec

  ### (a) Missing or Partial Requirements
  • None: All core requirements for Issue #19 across specification.md (FR-08, BR-19..BR-21, BR-24, AC-13..AC-17, AC-22), api-spec.md (GET /api/tickets), and ui-spec.md (§8 My Tickets Screen) are
  fully implemented:
      • Strict integer & enum query validation with 400 INVALID_QUERY (api-spec.md:81-90).
      • Default sort updatedAt descending with number tiebreak (specification.md:110-111).
      • Responsive table (desktop/tablet) and clickable card layout (mobile) (ui-spec.md:109-111).
      • Debounced search (300ms), filter dropdowns, tertiary Clear Filters, loading skeletons, and pagination strip {5,10,20} (ui-spec.md:105-117).


  ### (b) Unrequested Behavior / Scope Creep

  1. **CreateTicket.tsx**: Refactored CreateTicket to consume useReferenceData and added smooth scroll-to-top on form submission (touches Issue #18 scope).
  2. **Seed Scripts in package.json**: Added root and server db:seed convenience shortcuts.

  ### (c) Divergences or Subtleties

  1. Query Error Details Key Name: docs/lab-02/api-spec.md Section 1 defines generic error details as details: [{ "field": "...", "issue": "..." }], whereas tickets.ts:195-221 uses { parameter:
  string, issue: string } for query validation per §2 L90 ("per-param details").
  2. Empty State Copy Structure: docs/lab-02/ui-spec.md §8 specifies "No tickets yet - Create your first ticket" + CTA; MyTickets.tsx:406-422 structures this cleanly across a header, subtitle, and
  primary button.
  ──────
  Summary: Standards: 0 findings (all prior refactoring items resolved). Spec: 2 minor observations (worst: harmless out-of-scope window.scrollTo in CreateTicket.tsx). All 27 server and 36 client
  tests pass.
```

---

## Prompt 39 — Switch pageSize to bottom-left of pagination bar, finalize tests, and open PR for Issue #19 (2026-09-01)

**Outcome:** Switched the `Per page:` select dropdown to the bottom-left of the pagination bar while keeping the page info and navigation controls on the bottom-right. Ran all test suites with 100% pass, committed, pushed, and opened Pull Request [#29](https://github.com/Snnn3/TokTickIT/pull/29) for Issue #19 into `lab2-staging`.

**Prompt (verbatim):**

```text
/implement switch the per page make it bottom left   ### (b) Code Smells & Judgement Calls
  1. Speculative Generality / Future Seam (Judgement Call):
      • App.tsx:24-26 & MyTickets.tsx:20-24 include onSelectTicket as an explicit forward-compatibility seam for Issue #20 (Ticket Detail navigation).
  2. Refactored Smells (Resolved on Branch):
      • Duplicated Code: Integer parsing consolidated into tickets.ts:198-221.
      • Duplicated Fetch Hooks: Reference data fetching consolidated into useReferenceData.ts:1-57.
      • Repeated Switches: Replaced badge switches with typed dictionary maps in ZenBadge.tsx:3-11.
 ### (b) Scope Creep / Unrequested Behaviour

  1. Window Scroll in CreateTicket: CreateTicket.tsx:196-198 introduces window.scrollTo({ top: 0, behavior: "smooth" }) upon ticket creation (Issue #18 scope).
  2. Root & Server Package Scripts: Added db:seed shortcuts in package.json and package.json.
after this finish open the PR
```

---

## Prompt 40 — Add comprehensive testing steps to Pull Request description (2026-09-01)

**Outcome:** Updated Pull Request [#29](https://github.com/Snnn3/TokTickIT/pull/29) description with detailed "How to Test" guidance, including automated testing commands for client and server and a step-by-step manual verification procedure.

**Prompt (verbatim):**

```text
in the pr wirte how to test too
```

---

## Prompt 41 — Create reviewer.md with peer review records for Lab 2 (2026-09-02)

**Outcome:** Created `docs/lab-02/reviewer.md` documenting all Pull Requests authored on `Snnn3/TokTickIT` (PRs #25, #26, #27, #28, #29) and reviewed on `YummieGG/toktickit` (PRs #19, #20, #21), including verdicts, exact review comments, and partner responses.

**Prompt (verbatim):**

```text
add reviewer.md at docs/lab-02 comment in my https://github.com/Snnn3/TokTickIT/pulls and i was review is in https://github.com/YummieGG/toktickit/pulls
```

---

## Prompt 42 — Implement Issue #20: Ticket Detail and Attachment Lifecycle (2026-09-02)

**Outcome:** Created branch `feature/lab2-6-detail-attachments`. Implemented `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id`, `GET /api/attachments/:id/download`, and `DELETE /api/attachments/:id` with strict ownership checks, 410 REMOVED enforcement, confirmation dialog for soft removal, and responsive read-only Ticket Detail UI with AttachmentSection.

**Prompt (verbatim):**

```text
/implement issue#20 dont open the pr
```

---

## Prompt 43 — Resolve Code Review Findings for Issue #20 (2026-09-02)

**Outcome:** Refactored `.btn-zen-destructive` styling and `.badge-zen-removed` tokens across `AttachmentSection.tsx`, applied `.zg-readonly-panel` shading to all read-only containers in `RequesterTicketDetail.tsx`, extracted `parsePositiveIntParam` and `serializeAttachment` helpers in `attachments.ts`, aligned soft-remove DELETE 200 payload with `api-spec.md`, and removed unrequested header counter badge.

**Prompt (verbatim):**

```text
/implement ## Standards

  ### 1. Documented Standards Violations (Hard)

  • AttachmentSection.tsx:403-486 — Destructive Button Styling
      • Standard: ui-spec.md:43 (Button hierarchy: Destructive #B3261E bg, white text).
      • Violation: Uses Bootstrap's btn btn-outline-danger (attachment list Remove) and btn btn-danger (modal action) instead of the Zen Green
      token class .btn-zen-destructive.
  • AttachmentSection.tsx:337 — Removed Attachment Badge Styling
      • Standard: ui-spec.md:58 (Badges: Removed attachment fill #F0F2F1, text #5B6B62).
      • Violation: Uses standard Bootstrap badge bg-secondary (#6c757d) instead of the Zen token fill/text (.badge-zen-low or token-styled badge).
  • RequesterTicketDetail.tsx:99-231 — Read-only Group Background
      • Standard: ui-spec.md:16-122 (All read-only ticket info cards/values shaded #EEF3EF / readonly-field).
      • Violation: Uses Bootstrap bg-light (#f8f9fa) and bg-white rather than --zg-readonly-field / .zg-readonly-field (#EEF3EF).

  ### 2. Baseline Code Smells (Judgement Calls)

  • Duplicated Code — attachments.ts:49-153
    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Attachment ID must be a positive integer" },
      });
    }
  Param ID parsing & validation repeated across all 3 attachment route handlers; extract into a shared parameter validation helper/middleware.
  • Duplicated Code — attachments.ts:66-209
  Attachment DTO response serialization ({ id, ticketId, filename, mimeType, sizeBytes, uploadedAt, removedAt, removedReason }) is manually
  reconstructed in multiple route responses instead of a reusable serializer function.
  • Duplicated Code / Data Clump — AttachmentSection.tsx:5-6 & tickets.ts:17-18
  ALLOWED_EXTENSIONS and MAX_FILE_SIZE constants and mime-validation logic are declared independently across client components and server route
  files without a shared type/constant definition.
  ──────
  ## Spec

  ### (a) Requirements Missing or Partial

  1. Removed Attachment Badge Token:
  │ ui-spec.md:58: "| Removed attachment | #F0F2F1 | #5B6B62 + strikethrough filename | disabled actions |"

      • AttachmentSection.tsx:337 uses Bootstrap's badge bg-secondary (dark gray #6c757d) instead of Zen Green #F0F2F1 / #5B6B62 (badge-zen-low).
  2. Destructive Button Styling:
  │ ui-spec.md:43: "| Destructive | #B3261E bg, white text (attachment Remove) |"

      • AttachmentSection.tsx:403 styles the row Remove button as btn-outline-danger instead of using the repository's .btn-zen-destructive token
      class.
  3. Read-only Shading on Description:
  │ ui-spec.md:121-122: "Read-only ticket info grouped in cards, all values readonly-shaded: ... Description (preserved whitespace)"

      • RequesterTicketDetail.tsx:231 applies bg-white to the description container rather than the readonly token shade #EEF3EF (.zg-readonly-
      field).


  ### (b) Unasked Behaviour (Scope Creep)

  1. Extra Payload in Soft-Remove Response:
  │ api-spec.md:140: "- 200: { \"removed\": true, \"removedAt\": \"<ts>\" }"

      • attachments.ts:200-209 includes an extra full attachment metadata object in the 200 response alongside removed and removedAt. (Benign
      client convenience).
  2. Active Attachments Counter Badge:
  │ ui-spec.md:126: "Attachment Section (separate card): header + Add attachment button (hidden/disabled at limit)."

      • AttachmentSection.tsx:254-256 adds an unrequested "{activeCount} / 5 active" counter pill badge in the card header.


  ### (c) Requirements Implemented but Look Wrong

  • None Identified: Core specifications are correctly implemented:
      • Ownership & Status Codes: X-Requester-Id ownership check strictly enforces 403 on foreign ticket/attachment access (BR-06, AC-03); 401 on
      missing/inactive (BR-22); 404 on absent (AC-03); 410 on downloading removed items (FR-11, AC-11); 409 on duplicate removal or exceeding 5
      active attachments (AC-09); 413/415 on file limits (AC-07, AC-08).
      • Soft Removal & Dialog: Mandatory 1–300 char trimmed reason with Escape key and focus-trapped confirmation modal (FR-12, BR-16, BR-17, AC-
      12).
      • Submission Lockout: Busy-disabled states prevent duplicate submits (BR-18, AC-21).
      • Read-Only View: No edit controls rendered (FR-09, AC-23).
```

---

## Prompt 44 — Implement Review Feedback on Attachment Row States, Shape Parity, and Responsive Layout (2026-09-03)

**Outcome:** Implemented all 5 attachment row states (active, uploading with spinner, invalid with message/dismiss, removed with audit caption, and unavailable with retry), styled buttons and badges with Zen Green tokens, added tablet two-column layout (`col-md-6`) on Ticket Detail view, removed duplicated ticket header, aligned `GET /api/tickets/:id` payload shape parity with `POST /api/tickets`, and returned attachment metadata at root for `GET /api/attachments/:id`.

**Prompt (verbatim):**

```text
/implement following this ## Standards

  ### Documented Standards Breaches (Hard)
  1. Button Hierarchy (ui-spec.md:36-46):
      • AttachmentSection.tsx:300: The retry button uses raw Bootstrap <button type="button" className="btn btn-sm btn-outline-dark" ...
      >Retry</button> instead of adhering to the Zen Green button tokens (Secondary or Tertiary/link).
  2. Attachment Row States (ui-spec.md:128-130):
      • AttachmentSection.tsx:294-308: Spec specifies "States per row: active | uploading | invalid | removed | unavailable (download failed -
      retry)". Download retry is rendered as a global card-level alert banner above the list rather than an inline per-row state.
  3. Color Tokens & Reason Caption (ui-spec.md:7-21):
      • AttachmentSection.tsx:359: Uses Bootstrap utility classes (text-danger, border-danger) for audit reason captions rather than the Zen Green
      token (text-muted #5B6B62). Removal audit reasons are historical metadata, not validation errors.
      • AttachmentSection.tsx:426: The modal title uses Bootstrap text-danger instead of Zen Green design tokens.
  4. Busy Button State (ui-spec.md:45):
      • AttachmentSection.tsx:485: {isRemoving ? "Removing..." : "Remove Attachment"} replaces text but omits the required spinner element ("Busy:
      spinner replaces label area, stays disabled until settled").
  ### Baseline Code Smells (Judgement Calls)

  1. Duplicated Code:
      • tickets.ts:688-698: Manually constructs the attachment response object, duplicating attachments.ts:14-34 from attachments.ts.
      • tickets.ts:561: Duplicates integer parameter validation with looser semantics (parseInt) instead of reusing attachments.ts:7-12.
  2. Primitive Obsession:
      • AttachmentSection.tsx:5-6 & tickets.ts:31-40: File limits and allowed types are declared as disjoint primitive constants across frontend
      and backend.
  ──────
  ## Spec

  ### (a) Missing or Partial Requirements

  1. Attachment Row States Incomplete:
      • Spec Quote: ui-spec.md:128 & ui-spec.md:153: "States per row: active | uploading (busy) | invalid (message) | removed (badge Removed,
      strikethrough, actions disabled, reason tooltip/caption) | unavailable (download failed - retry)."
      • Finding: In AttachmentSection.tsx:286-366, only active and removed are rendered as in-row states. The uploading state is only represented
      on the header button, while invalid files and download failures (unavailable) are presented as card-level banners rather than per-row states.
  2. Tablet Two-Column Layout Incomplete:
      • Spec Quote: ui-spec.md:145: "Tablet 768-991px: Two-column where practical; Summary/Description keep width"
      • Finding: In RequesterTicketDetail.tsx:173-197, System and Classification groups use col-12 col-lg-6, which collapses into a single column
      on tablet viewports (768–991px), unlike the loading skeleton which correctly applied col-md-6.


  ### (b) Scope Creep

  1. Unrequested Outer Envelope on Attachment Metadata:
      • Spec Quote: api-spec.md:123: 200: { "id", "ticketId", "filename", "mimeType", "sizeBytes", "uploadedAt", "removedAt", "removedReason" }
      • Finding: In attachments.ts:86-88, GET /api/attachments/:id wraps the metadata payload in an unrequested { "attachment": { ... } } object
      rather than returning the metadata object at the root.
  2. Duplicated Ticket Header Summary:
      • Spec Quote: ui-spec.md:121-124: "Read-only ticket info grouped in cards, all values readonly-shaded: System group (Number, Date, Status
      badge, Requester) | Classification ... | Description ... | meta footer ..."
      • Finding: In RequesterTicketDetail.tsx:157-166, an extra header card banner duplicates Ticket Number, Status badge, Ticket Date, and
      Requester directly above the System group card that contains identical fields.


  ### (c) Incorrect Implementation

  1. GET Ticket Detail Payload Shape Discrepancy:
      • Spec Quote: api-spec.md:104: 200: ticket shape as POST response plus "attachments" array...
      • Finding: POST /api/tickets specifies systemId and nested requester: { id, name } (api-spec.md lines 58-59), whereas GET /api/tickets/:id in
      tickets.ts:622-627 returns flattened fields (relatedSystemId, relatedSystemName, requesterId, requesterName), breaking shape parity.
```

---

## Prompt 45 — Address Review Findings on Tokens, Live Regions, Upload Handlers, and Canonical Payloads (2026-09-03)

**Outcome:** Fixed conflicting read-only shading in Ticket Detail Description container by removing `.bg-white` and relying on `.zg-readonly-panel`, added `.badge-zen-error` design token, added `title="Close"` tooltip to modal close button, reused centralized `validateFile` in `AttachmentSection.tsx`, consolidated upload error and validation handling into shared helpers (`handleMulterError`, `isValidAttachmentFile`) in `tickets.ts`, added `aria-live="polite"` to status messages, unwrapped `POST /api/tickets/:id/attachments` 201 response, and standardized `TicketDetail` to canonical POST-parity domain model.

**Prompt (verbatim):**

```text
/implement ## Standards
  ### Hard Violations (Documented Standards)
  1. Conflicting Read-Only Shading (ui-spec.md:17):
      • Location: RequesterTicketDetail.tsx:230-236
      • Violation: The Description container combines className="... bg-white ..." with style={{ backgroundColor: "var(--zg-readonly-field)" }}.
      Bootstrap’s .bg-white rule carries !important, overriding the inline token and preventing the field from rendering with the required #EEF3EF
      gray-green read-only shading.
  2. Non-Standard Badge Token (ui-spec.md:18):
      • Location: AttachmentSection.tsx:381-383
      • Violation: Uses Bootstrap's bg-danger (#dc3545) for the invalid state badge instead of Zen Green error token #B3261E (var(--zg-error)).
  3. Icon-Only Control Missing Tooltip (ui-spec.md:136):
      • Location: AttachmentSection.tsx:494-501
      • Violation: The modal close button <button className="btn-close" aria-label="Close" /> provides an aria-label but omits a title tooltip
      ("icon-only controls carry aria-label AND tooltip").


  ### Judgement Calls (Baseline Smells)
  1. Duplicated Code (File validation & limits):
      • Location: AttachmentSection.tsx:5-6
      • Re-implements file size and extension checks rather than reusing validation.ts:55-69 and shared constants from client/src/utils/validation.
      ts.
  2. Duplicated Code (Upload handling boilerplate):
      • Location: tickets.ts:654-680
      • Multer error handling (LIMIT_FILE_SIZE, VALIDATION_FAILED) and ALLOWED_MIME_TYPES validation in POST /:id/attachments duplicate existing
      logic from POST /api/tickets (lines 454–480, 500–510).
  3. Data Clumps / Speculative Generality (Property Aliasing):
      • Location: ticket.ts:37-60 & tickets.ts:622-630
      • Aliased pairs (systemId/relatedSystemId, systemName/relatedSystemName, requester/requesterName) are bundled together across interfaces and
      endpoint responses rather than standardizing on a single domain model structure.
  ──────
  ## Spec

  ### (a) Missing or Partial Requirements

  1. Live Region Status Announcements:
      • Spec Quote: ui-spec.md:137: "status messages announced politely (live region)"
      • Finding: In AttachmentSection.tsx, dynamic error/status alerts (staged-error-message, unavailable-state, and dialog errors) lack aria-
      live="polite" containers for accessibility.
  ### (b) Behaviour Not Asked For (Scope Creep)
  1. Denormalized & Alias Fields in Ticket Detail Response:
      • Spec Quote: api-spec.md:104: "200: ticket shape as POST response plus "attachments" array where each item includes {id, filename, mimeType,
      sizeBytes, uploadedAt, removedAt: null | ts, removedReason: null | string}."
      • Finding: In tickets.ts:616-639, GET /api/tickets/:id returns redundant convenience aliases and timestamps (categoryName, systemName,
      relatedSystemId, relatedSystemName, requesterId, requesterName, createdAt, updatedAt) beyond the canonical POST /api/tickets response shape
      (api-spec.md:56-60).
  2. Wrapped Envelope on Attachment Upload:
      • Spec Quote: api-spec.md:114: "- 201: attachment metadata object."
      • Finding: In tickets.ts:771-773, POST /api/tickets/:id/attachments wraps the response in { attachment: ... } rather than returning the root
      metadata object directly (in contrast to GET /api/attachments/:id).


  ### (c) Requirements Implemented but Look Wrong

  • None Identified: Core Issue #20 requirements are fully implemented and verified by tests:
      • Strict ownership access control returning 403 on cross-requester access (specification.md:94, specification.md:202), 401 on missing auth
      (specification.md:114), and 404 on absent entities.
      • Maximum 5 active attachments cap enforced with 409 LIMIT_REACHED and UI button disablement (specification.md:102, specification.md:214).
      • Byte-stream download blocking returning 410 on soft-removed items (specification.md:67, specification.md:106, specification.md:218).
      • Soft removal requiring mandatory 1–300 character trimmed reason with Escape key and focus-trapped confirmation modal (specification.md:68,
      specification.md:107, specification.md:220).
      • All 5 attachment row states (active, uploading with spinner, invalid with inline message/dismiss, removed with audit caption, and
      unavailable with retry) conform to ui-spec.md:128-130.
      • Ticket detail layout renders read-only fields with preserved whitespace and two-column layout on tablet viewports (specification.md:65,
      specification.md:241, specification.md:243, ui-spec.md:145).
```

---

## Prompt 46 — Fix Meta Footer Timestamps, Focus Ring, Invalid Row Markup, and Requester Switching (2026-09-03)

**Outcome:** Rendered `Created:` and `Last Updated:` timestamps in Ticket Detail meta footer per `ui-spec.md:122-123`, corrected `.btn-zen-destructive` focus ring to `var(--zg-secondary)` outline per `ui-spec.md:32-33`, removed unauthorized `.badge-zen-error` in favor of inline error message on invalid staged rows per `ui-spec.md §9`, removed unused Prisma relations from `GET /api/tickets/:id`, reset `selectedTicketId` upon requester switch/clearing per `specification.md FR-03, BR-05, AC-18`, and prevented modal dismissal (Escape & close button) during in-flight attachment removal per `specification.md BR-18`.

**Prompt (verbatim):**

```text
/implement ### (a) Documented Standards Violations (Hard Violations)
  1. Missing Meta Footer Timestamps
      • File: RequesterTicketDetail.tsx:247-249
      • Standard: ui-spec.md:122-123 §9 ("meta footer (created/updated timestamps)")
      • Violation: The card footer renders only Date: {formatDateTime(ticket.ticketDate)}. It omits both the createdAt and updatedAt timestamps
      mandated by UI spec §9.
  2. Destructive Button Focus Ring Color
      • File: index.css:124-130
      • Standard: ui-spec.md:32-33 §3 ("focus (2px secondary-green outline, offset 1px, never removed)")
      • Violation: .btn-zen-destructive:focus-visible, .btn-zen-destructive:focus sets outline: 2px solid var(--zg-error) instead of the required
      secondary-green outline (var(--zg-secondary)).
  3. Unauthorized Badge Variant
      • File: AttachmentSection.tsx:366-368 & index.css:182-186
      • Standard: ui-spec.md:52-59 §4 & §9 ("States per row: ... invalid (message)")
      • Violation: Introduces an undocumented badge-zen-error ("Invalid" badge) on invalid staged rows, whereas §4 defines a closed set of badge
      tokens and §9 dictates that invalid rows show an inline message rather than a badge.  Requirements Missing or Partial

  1. Missing Created/Updated Timestamps in Meta Footer
      • Spec Quote: ui-spec.md:122-123: "meta footer (created/updated timestamps)"
      • Finding: In RequesterTicketDetail.tsx:247-249, the meta footer only renders ticketDate. Both createdAt and updatedAt are omitted from the
      UI and excluded from GET /api/tickets/:id in tickets.ts:623-638.

  ──────
  ### (b) Behaviour Not Asked For (Scope Creep)

  1. Unused Prisma Relations Fetched in Ticket Detail
      • Spec Quote: api-spec.md:104: "200: ticket shape as POST response plus "attachments" array..."
      • Finding: In tickets.ts:579-580, prisma.ticket.findUnique queries category: { select: { name: true } } and system: { select: { name: true }
      }, which are never serialized into the response payload.
  2. Unspecified Status Badge for Invalid Staged Attachments
      • Spec Quote: ui-spec.md:128: "States per row: active | uploading (busy) | invalid (message) | removed (badge Removed, strikethrough, actions
      disabled, reason tooltip/caption) | unavailable (download failed - retry)."
      • Finding: In AttachmentSection.tsx:366-368 and index.css:182-186, an extra "Invalid" badge (.badge-zen-error) was introduced, whereas the
      specification dictates an inline message for invalid rows.

  ──────
  ### (c) Requirements Implemented but Look Wrong

  1. Ticket Detail State Persists Across Requester Switch
      • Spec Quote: specification.md:54: "FR-03 A Change Requester action clears context-bound data and returns to Selection; switching reloads all
      requester-specific data." (also BR-05, AC-18)
      • Finding: In App.tsx:13-35, selectedTicketId is not reset when selectedRequester changes or is cleared. Switching to another requester
      immediately attempts to fetch the previous requester's ticket, causing an unexpected 403 Forbidden error screen instead of returning to
      MyTickets.
  2. Modal Close & Escape Allowed During In-Flight Removal
      • Spec Quote: specification.md:107: "BR-18 Duplicate-submission prevention: while a create/add/remove request is in flight the triggering
      control is busy-disabled; further submits are impossible from the UI."
      • Finding: In AttachmentSection.tsx:57-59, the modal header close button and the Escape key listener remain active while isRemoving is in
      flight, allowing the user to dismiss the modal mid-flight and immediately re-trigger removal.
```

---

## Prompt 47 — Fix Attachment Link Tokens, Simplify Lookups, and Extract Shared Ownership & Utility Helpers (2026-09-03)

**Outcome:** Styled active attachment filename button using `.zg-action-link` (`var(--zg-secondary)` / `#0B7A46`) per `ui-spec.md:10`, pruned vestigial casts for category/system names in `RequesterTicketDetail.tsx`, removed deprecated `data.attachment` response wrapper fallback in `AttachmentSection.tsx`, extracted shared `parsePositiveIntParam` and `serializeAttachment` into `server/src/utils/attachment.ts` decoupling routes, and introduced shared `getOwnedTicket` helper in `tickets.ts` unifying ticket lookup and ownership enforcement.

**Prompt (verbatim):**

```text
/implement ### (a) Documented Standards Violations (Hard Violations)

  1. Active Attachment Link Color Token Mismatch
      • File: AttachmentSection.tsx:425-433
      • Standard: ui-spec.md:10 (secondary-green | #0B7A46 | active tabs, focus accents, links, hover states)
      • Violation: The active attachment filename button uses class text-zen-primary (#006B3C) instead of the documented link token secondary-green
      (#0B7A46 / .zg-action-link).

  ──────
  ### (b) Baseline Smells (Judgement Calls)
  1. Speculative Generality (Vestigial Property Checking)
      • File: RequesterTicketDetail.tsx:142-151
      • Hunk:
        const categoryDisplayName = categories.find((c) => c.id === ticket.categoryId)?.name ||
          (ticket as unknown as { categoryName?: string }).categoryName || "Unknown";
        const systemDisplayName = systems.find((s) => s.id === ticket.systemId)?.name ||
          (ticket as unknown as { relatedSystemName?: string }).relatedSystemName || "Unknown";
      • Judgement Call: Casting ticket through unknown to read categoryName and relatedSystemName anticipates properties already pruned from the
      backend response. The reference data arrays already resolve categoryId and systemId.
  2. Speculative Generality (Deprecated Response Envelope Fallback)
      • File: AttachmentSection.tsx:165
      • Hunk:
        const uploadedAtt: AttachmentMetadata = data.id ? data : data.attachment;

      • Judgement Call: The data.attachment fallback handles an obsolete nested wrapper; tickets.ts:756 now returns the canonical root metadata
      object directly.
  3. Duplicated Code (Ticket Ownership Validation)
      • File: tickets.ts:590-608 and tickets.ts:701-719
      • Hunk:
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, ... });
        if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
        if (ticket.requesterId !== requester.id) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      • Judgement Call: Repeated in GET /:id and POST /:id/attachments. Extracting a shared getOwnedTicket helper would unify ownership checks,
      mirroring getOwnedAttachment in attachments.ts:14-44.
  4. Middle Man / Cross-Route Coupling
      • File: tickets.ts:6
      • Hunk:
        import { parsePositiveIntParam, serializeAttachment } from "./attachments";

      • Judgement Call: Route module tickets.ts imports parsing and serialization helpers from sibling route attachments.ts. Placing shared logic
      in a shared utility module (e.g. server/src/utils/) avoids inter-route module coupling.
```

---

<!-- Prompts 48..n appended during the sprint -->

## My Reflection

*(To be completed at sprint end.)*




