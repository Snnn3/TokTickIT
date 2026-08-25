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

<!-- Prompts 10..n appended during the sprint -->

## My Reflection

*(To be completed at sprint end.)*
