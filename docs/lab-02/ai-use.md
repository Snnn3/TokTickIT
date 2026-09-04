# AI Use Log — Lab 2

LLMs used:
- **ox-alpha** (accessed via opencode CLI) — sprint planning and Issues #16–#22 implementation/review loop
- **Gemini 3.7 / 3.8 Flash** (accessed via Antigravity) — assisting with implementation and reviews
- **Muse Spark 1.3** (accessed via opencode CLI) — reviewer.md backfill, ai-use.md grading-table curation, `.ignore` tagging investigation

Prompts are recorded below in full, verbatim. The student adds summaries and the final reflection manually.

> Note: per labsheet Part 4 (AI Use with Reflection) this file keeps the 6 selected key prompts in the grading table plus their full verbatim details. The earlier 47 working prompts were removed for submission; full history remains recoverable in git.

---

## Selected key prompts (grading table — 6 prompts, per labsheet Part 4)

| # | Key prompt (verbatim) | Why selected / outcome |
|---|----------------------|------------------------|
| 1 | `c:\KMUTT\Y3T1\CPE334\ToktikIT\Lab_02_labsheet.pdf understand this pdf and plan Lab 2 workflow from this lab sheet` | Sprint planning via grill skills; produced 8-phase / ~9-issue workflow, locked D1–D5 (ticket format, bytea, X-Requester-Id, ai-use.md name, gh CLI). Details in Prompt 1 below. |
| 2 | `let improve the plan to make it perfect. i will give this to another agent and save my prompt in to @docs/lab-02/ai-use.md` | Plan 119→197 lines; closed all 5 labsheet gaps (test names, Lab 3 evolution, badges, Appendix A/B/C, FE/BE split). Details in Prompt 2 below. |
| 3 | `/implement let do the issue 19 and close the issue 18 it is already finish do forget to moving the kanban board of issue and dont open pr when finished.` | Representative `/implement` issue kickoff: branch, Kanban move, no-PR rule (same pattern for #16–#21). Details in Prompt 3 below. |
| 4 | `/code-review at feature/lab2-5-my-tickets  review the issue#19  dont open pr` | Representative `/code-review` gate: parallel Standards + Spec two-axis review, no-PR rule. Details in Prompt 4 below. |
| 5 | `/implement following the code-review Standards + Spec findings above (spec docs first priority), verify with npm test --prefix server, npm test --prefix client, tsc and oxlint, then /code-review again — repeat this implement → verify → review loop until 0 hard violations and 0 spec defects. dont open pr.` | **General loop entry**: the standing implement ⇄ verify ⇄ review loop run ~15× across Issues #18–#21 instead of pasting every iteration. Details in Prompt 5 below. |
| 6 | `/implement let implement issue#21. dont open pr` | E2E + visual evidence: Playwright E-01/E-02/R-01/E-03, 9 screenshots, 3/3 E2E + 42 client + 34 server green. Details in Prompt 6 below. |

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

## Prompt 2 — Improve plan to cover all labsheet criteria (2026-08-24)

**Outcome:** Plan expanded from 119 to 197 lines (14 sections). All 5 critical gaps addressed: (1) mandatory test file names added §9.1, (2) Lab 3 schema evolution added to Issue #17, (3) badge consistency added to Issues #19/#21, (4) Appendix A/B/C template structures referenced in Issue #16, (5) frontend vs backend validation split added to §6 and Issue #18. Also added: Issue #24 explanatory text + keyboard accessibility, Issue #18 component rules (§8.3), Issue #20 attachment states (§4.5), per-endpoint API error docs (§6.3), screen modes enumeration, AI agent workflow rules (§11), required fields checklist (§4.4), explicit excluded scope (§4.2), expanded DoD with Product/Delivery split, and additional Notes/Risks (nav requirements, attachment metadata, DB design justification).

**Prompt (verbatim):**

```text
let improve the plan to make it perfect. i will give this to another agent and save my prompt in to @docs/lab-02/ai-use.md
```

---

## Prompt 3 — Start Issue #19 (My Tickets) on feature/lab2-5-my-tickets (2026-09-01)

**Outcome:** Closed Issue #18, updated the execution plan Kanban board, created feature branch `feature/lab2-5-my-tickets`, and began implementing the full My Tickets list view feature (search/filter/sort/pagination backend `GET /api/tickets` and Zen Green responsive table/card frontend `MyTickets.tsx`).

**Prompt (verbatim):**

```text
/implement let do the issue 19 and close the issue 18 it is already finish do forget to moving the kanban board of issue and dont open pr when finished.
```

---

## Prompt 4 — Two-axis code review on feature/lab2-5-my-tickets (2026-09-01)

**Outcome:** Executed two-axis code review (Standards Reviewer and Spec Reviewer sub-agents in parallel) comparing `lab2-staging...feature/lab2-5-my-tickets` against specifications and coding standards for Issue #19.

**Prompt (verbatim):**

```text
/code-review at feature/lab2-5-my-tickets  review the issue#19  dont open pr
```

---

## Prompt 5 — General loop workflow: implement + code-review repeated until green (2026-09-04)

**Outcome:** Standing loop used ~15 times across Issues #18–#21 (formerly Prompts 26–28, 33–38, 43–47): paste `code-review` Standards+Spec findings into `implement`, verify with server/client tests + tsc + oxlint, re-run `code-review`, repeat until 0 hard violations and 0 spec defects. Keeps spec docs first priority; no PR opened until loop is green.

**Prompt (verbatim):**

```text
/implement following the code-review Standards + Spec findings above (spec docs first priority), verify with npm test --prefix server, npm test --prefix client, tsc and oxlint, then /code-review again — repeat this implement → verify → review loop until 0 hard violations and 0 spec defects. dont open pr.
```

---

## Prompt 6 — Implement Issue #21: Playwright E2E Flow and Responsive Visual Evidence (2026-09-03)

**Outcome:** Configured Playwright runner (`playwright.config.ts`, `npm run test:e2e`), implemented comprehensive E2E test suite `e2e/lab-02/requester-ticket-flow.spec.ts` covering happy path ticket creation with keyboard usability (E-01), multi-requester data isolation and attachment soft-removal/blocking lifecycle (E-02), and responsive layout overflow verification with 9 full-page visual screenshots across desktop (1366px), tablet (768px), and mobile (375px) viewports (R-01, E-03). All 3 Playwright tests, 42 client tests, and 34 server tests pass 100%.

**Prompt (verbatim):**

```text
/implement let implement issue#21. dont open pr
```

---

## My Reflection

*(To be completed at sprint end.)*
