# AI Use Log — Lab 3

Version: 2.6 | Date: 2026-09-19 | Companion to specification.md.

LLMs used:
- Muse Spark 1.3 (accessed via opencode CLI) — planning, contract drafting and implementation support
- Claude Opus 5 (accessed via Claude Code CLI) — consistency checks, review responses and verification support
- OpenAI Codex (GPT-5) — implementation, browser-test evidence, documentation updates and Git workflow support

Prompts are recorded below in full, verbatim. The student adds summaries and
the final reflection manually.

> Note: per labsheet Part 4, this file keeps the 6 selected key prompts in the
> grading table plus their full verbatim details. Earlier working prompts are
> not repeated here; historical session detail remains recoverable from Git
> history.

## Selected key prompts (grading table — 6 prompts)

| # | Key prompt (verbatim) | Why selected / outcome |
|---|----------------------|------------------------|
| 1 | read this c:\KMUTT\Y3T1\CPE334\ToktikIT\material\Lab_3_sheet.pdf . understand this lab sheet | Started the Lab 3 requirements and delivery workflow from the handout. |
| 2 | can you ask me and tell me what you recommend | Turned open design questions into recommended choices with explicit trade-offs and locked decisions. |
| 3 | make it to spec in @docs/lab-03\ follow the lab assignment | Produced the Lab 3 contract documents in the handout's required structure. |
| 4 | review spec again. check all spec is it conflict or not . | Performed a cross-document consistency audit and resolved contradictions across the contract set. |
| 5 | c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-feature-lab3-7-user-management.md coder implement following this | Applied peer-review findings to the user-management slice and verified the resulting PR before merge. |
| 6 | coder answer my peer comment thank you to him and move kanban close issue#41 then implement following the issue#42 not open pr | Thanked the reviewer, closed #41, updated Kanban, and implemented #42 with authenticated E2E journeys, responsive evidence and no PR opened. |

---

### Prompt 1 — Understand the Lab 3 labsheet (2026-09-08)

**Outcome:** Extracted the Lab 3 requirements and delivery workflow from the
handout, including the three roles, contract-first sequence and release
evidence expectations.

**Prompt (verbatim):**

```text
read this c:\KMUTT\Y3T1\CPE334\ToktikIT\material\Lab_3_sheet.pdf . understand this lab sheet
```

### Prompt 2 — Make design choices explicit (2026-09-08)

**Outcome:** Changed open-ended planning into recommended choices with stated
trade-offs, which locked the authentication, data, authorization and queue
decisions before implementation.

**Prompt (verbatim):**

```text
can you ask me and tell me what you recommend
```

### Prompt 3 — Write the contract in the lab format (2026-09-10)

**Outcome:** Produced the Lab 3 contract documents in the handout's required
structure and connected the functional requirements, business rules,
acceptance criteria and test traceability.

**Prompt (verbatim):**

```text
make it to spec in @docs/lab-03\ follow the lab assignment
```

### Prompt 4 — Audit the contract for contradictions (2026-09-10)

**Outcome:** Performed a cross-document consistency audit instead of checking
each document in isolation, then resolved contradictions across the contract
set.

**Prompt (verbatim):**

```text
review spec again. check all spec is it conflict or not .
```

### Prompt 5 — Apply the user-management peer review (2026-09-18)

**Outcome:** Applied the review findings from the user-management review file,
verified the implementation and prepared the reviewed PR for merge into
lab3-staging.

**Prompt (verbatim):**

```text
c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-feature-lab3-7-user-management.md coder implement following this
```

### Prompt 6 — Close #41 and implement the release evidence slice (2026-09-19)

**Outcome:** Thanked the peer reviewer, moved #41 to Done and closed it, then
implemented #42 on a feature branch without opening a PR. The work added the
three authenticated browser journeys, responsive screenshots, authorization
evidence, migration/test-plan documentation and final verification results.

**Prompt (verbatim):**

```text
coder answer my peer comment thank you to him and move kanban close issue#41 then implement following the issue#42 not open pr
```

## My Reflection

The most effective use of AI in this lab was turning ambiguous requirements
into explicit decisions, then asking for a separate cross-document consistency
check before implementation. Peer review and browser evidence supplied a
different validation layer: the reviewer found issues that the planning and
implementation passes did not, while the E2E run verified the real role-based
flows at the required viewports. I made the final scope and release decision,
reviewed the changes, and ran the verification commands myself.

AI assistance is disclosed here; commits do not include a Co-Authored-By
attribution.
