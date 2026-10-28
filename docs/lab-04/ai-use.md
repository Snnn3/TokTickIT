# AI Use Log — Lab 4

LLMs used:
- **OpenAI Codex (GPT-5)** — initial Issue #54 contract draft.
- **OpenAI Codex (GPT-6)** — handout validation, contract repair, implementation, review fixes and test evidence.
- The preserved planning-session record did not identify its exact model; no model identity is inferred for that session.

Prompts are recorded below in full, verbatim. Outcomes summarize the recorded work; actual test results and remaining limitations are maintained in `docs/lab-04/tests.md`.

> Note: following the Lab 2 disclosure format, this file keeps 6 selected key prompts in the grading table plus their full verbatim details. Repeated review iterations and log-maintenance requests are omitted from this selected version. These records do not claim final main-branch verification or Issue #61 peer approval.

---

## Selected key prompts (grading table — 6 prompts, per labsheet Part 4)

| # | Key prompt (verbatim) | Why selected / outcome |
|---|----------------------|------------------------|
| 1 | `[$grill-with-docs](C:\Users\lchan\\.agents\skills\grill-with-docs\SKILL.md) C:\KMUTT\Y3T1\CPE334\ToktikIT\material\SE+Lab+4.pdf understand this pdf file.` | Requirements discovery: examined the handout and surfaced decisions about roles, Actions Taken, Ticket workflow, dashboards and delivery evidence. Details in Prompt 1 below. |
| 2 | `let understand the pdf c:\KMUTT\Y3T1\CPE334\ToktikIT\material\SE+Lab+4.pdf and validation the issue#54 feature/lab4-1-contract` | Contract validation: found omissions in the initial six-document draft and drove explicit versioning, replay, migration and acceptance rules. Details in Prompt 2 below. |
| 3 | `coder implement the issue#56 move the kanban and dont open the PR` | Representative implementation kickoff: Actions Taken API, authorization, version checks, idempotency and audit history on a feature branch. Details in Prompt 3 below. |
| 4 | `c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-pr65-feature-lab4-3-actions-api-f1790d5.md coder read this review and implement following this. and review yourself one time.` | Review-driven correction: repaired error precedence and assignment release behavior, then checked the implementation again. Details in Prompt 4 below. |
| 5 | `reviewer review the Issue #60  in the scope of issue in feature/lab4-7-requester-dashboardcompare to origin/lab4-staging` | Independent Standards and Spec review: requester dashboard iterations exposed filter persistence, time display, query-budget and stale-response issues. Details in Prompt 5 below. |
| 6 | `coder let implement the issue#61 [https://github.com/Snnn3/TokTickIT/issues/61](https://github.com/Snnn3/TokTickIT/issues/61) . recheck yourself once then if has missing fix follow your review` | E2E and visual evidence: isolated browser coverage, regression checks and self-review against Issue #61. Details in Prompt 6 below. |

---

## Prompt 1 — Understand the Lab 4 handout and surface decisions

**Outcome:** The planning record reports extraction and visual inspection of the 11-page handout. The session identified roles, Action Taken fields, Ticket workflow, dashboards, regression obligations and submission evidence, then surfaced design decisions for confirmation. Follow-up prompts confirmed performer/assignee separation, resolution prerequisites, version conflicts, the seven-day/latest-five dashboard window and zero-action legacy Tickets.

**Prompt (verbatim):**

```text
[$grill-with-docs](C:\Users\lchan\\.agents\skills\grill-with-docs\SKILL.md) C:\KMUTT\Y3T1\CPE334\ToktikIT\material\SE+Lab+4.pdf understand this pdf file.
```

---

## Prompt 2 — Validate the Issue #54 contract against the handout

**Outcome:** Reviewed the initial contract against the handout and found dashboard, role, field, migration, test and disclosure gaps. The subsequent repair revised the six contract documents, including explicit optimistic-version checks, idempotent replay behavior and Product Definition of Done. This prompt represents checking the specification before relying on it for implementation.

**Prompt (verbatim):**

```text
let understand the pdf c:\KMUTT\Y3T1\CPE334\ToktikIT\material\SE+Lab+4.pdf and validation the issue#54 feature/lab4-1-contract
```

---

## Prompt 3 — Implement Issue #56: Actions Taken API

**Outcome:** Implemented the Actions Taken REST API on `feature/lab4-3-actions-api`, with requester-scoped reads, Staff/Administrator writes, active-staff assignment validation, status/follow-up/result guards, Ticket and Action versions, idempotent creation and audit events. The initial implementation followed the requested Kanban and no-PR workflow; later review iterations corrected remaining defects.

**Prompt (verbatim):**

```text
coder implement the issue#56 move the kanban and dont open the PR
```

---

## Prompt 4 — Apply the PR #65 review and self-review the fix

**Outcome:** Corrected authentication/access versus parsing precedence, added atomic release of nonterminal Action assignments when Staff become inactive or change roles, and checked Action/Ticket versions, audit actors and response counts. Added coverage proving an illegal Action transition performs no writes. The recorded run passed 223 server and 135 client tests, the server build and scoped formatting/whitespace checks; repository-wide formatting differences remained documented. This local self-review did not replace human peer approval.

**Prompt (verbatim):**

```text
c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-pr65-feature-lab4-3-actions-api-f1790d5.md coder read this review and implement following this. and review yourself one time.
```

---

## Prompt 5 — Review the requester dashboard against staging

**Outcome:** This prompt was used for repeated Issue #60 reviews against a fixed staging base, with separate Standards and Spec passes. Reviews identified lost filters/pagination, incorrect resolved-sort labeling, raw UTC bounds, a performance assertion problem and stale-response races. The final recorded local review at `fdaa916` found no blocking Issue #60 findings after corrections, while retaining optional maintainability notes and recording test retries/settings. Local review was distinct from the partner's GitHub approval.

**Prompt (verbatim):**

```text
reviewer review the Issue #60  in the scope of issue in feature/lab4-7-requester-dashboardcompare to origin/lab4-staging
```

---

## Prompt 6 — Implement and self-review Issue #61: regression and visual evidence

**Outcome:** Added isolated Lab 4 browser coverage, screenshot metadata and workflow UI checks, then compared the work with Issue #61. Regression checks exposed stale requester landing routes, an outdated seeded-user expectation and tablet navigation overflow. Later review remediation added real PostgreSQL concurrency/replay cases and two browser recovery journeys, corrected the requester tablet viewport and captured the actual mobile Action details. The test record distinguishes passing branch checks from the interrupted Lab 2/3 run and pending manual accessibility, peer-review and integrated-main gates. The final PDF report is reserved for the student.

**Prompt (verbatim):**

```text
coder let implement the issue#61 [https://github.com/Snnn3/TokTickIT/issues/61](https://github.com/Snnn3/TokTickIT/issues/61) . recheck yourself once then if has missing fix follow your review
```

---

## My Reflection

The most effective use of AI in this lab was turning ambiguous requirements
into explicit decisions, then asking for a separate cross-document consistency
check before implementation. Peer review and browser evidence supplied a
different validation layer: the reviewer found issues that the planning and
implementation passes did not, while the E2E run verified the real role-based
flows at the required viewports. I made the final scope and release decision,
reviewed the changes, and ran the verification commands myself.
