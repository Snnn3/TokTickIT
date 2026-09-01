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

<!-- Prompts 37..n appended during the sprint -->

## My Reflection

*(To be completed at sprint end.)*
