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

<!-- Prompts 23..n appended during the sprint -->

## My Reflection

*(To be completed at sprint end.)*
