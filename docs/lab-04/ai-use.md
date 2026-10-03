# AI Use Log - Lab 4

Status: **Draft contract for peer review**<br>
Version: **1.0**<br>
Date: **2026-09-22**<br>
Branch: `feature/lab4-1-contract`<br>
Issue: [#54](https://github.com/Snnn3/TokTickIT/issues/54)

LLMs used:
- **OpenAI Codex (GPT-5)** - initial Issue #54 contract draft.
- **OpenAI Codex (GPT-6)** - validation against the PDF and repair of the contract.
- The earlier planning-session record below is preserved as supplied; its
  exact model was not recorded, so no model identity is inferred.

## Selected key prompts - 6 actual prompts

These are verbatim prompts from this conversation or the preserved session
addendum. The five synthesized "working prompts" from the first draft were
retrospective summaries, not submitted prompts, and have been removed from
the selected table. Outcomes describe document work, not passing product tests.

| # | Key prompt (verbatim) | Outcome |
|---|---|---|
| 1 | `as you recommended` | The preserved planning record reports agreement on performer/assignee separation, resolution and dashboard decisions. |
| 2 | `also as you reccomend` | The preserved record reports agreement on statuses, concurrency, time window and legacy migration behavior. |
| 3 | `good if have enough information let start with do split the issue` | The preserved planning record reports Issues #54-#62 and their dependencies. |
| 4 | `let do issue#54 dont open pr add reviewer.md and ai-use.md` | Created six draft contract documents; later PDF validation found material omissions. |
| 5 | `let understand the pdf c:\KMUTT\Y3T1\CPE334\ToktikIT\material\SE+Lab+4.pdf and validation the issue#54 feature/lab4-1-contract` | Read the 11-page handout and reviewed the draft; found dashboard, role, field, migration, test and disclosure defects. |
| 6 | `fix it` | Revised the six documents to address that validation, including explicit version/replay behavior and Product DoD. |

## Selected prompt details

Prompts1-3 and their original context are retained verbatim in the supplied
planning addendum below. The current task prompts are:

### Prompt4 - Contract kickoff

~~~text
let do issue#54 dont open pr add reviewer.md and ai-use.md
~~~

### Prompt5 - PDF validation

~~~text
let understand the pdf c:\KMUTT\Y3T1\CPE334\ToktikIT\material\SE+Lab+4.pdf and validation the issue#54 feature/lab4-1-contract
~~~

### Prompt6 - Repair the validation findings

~~~text
fix it
~~~

## My Reflection

Draft for the student to review and personalize:

The first AI draft looked complete because it had six documents and a test
mapping, but checking it against the actual handout exposed missing Requester
dashboards, incorrect Administrator permissions and missing Action Taken fields.
This showed me that consistent documents can still describe the wrong product.
The specification work helped make decisions explicit; the separate review
helped check those decisions against the source. I would use the handout first,
keep actual prompts in the disclosure, and require measured test and peer-review
evidence before calling the implementation complete.

## Log maintenance

The follow-up instruction is retained verbatim:

~~~text
save the prompt to ai-use lab-04
~~~

The original planning-session addendum below is preserved, including its reported
outcomes; these are session records, not newly verified GitHub actions. Its prompt
numbers are archival and distinct from the six selected prompts above.

---

## Session Addendum - Lab 4 planning and issue workflow (2026-09-22)

This addendum records the prompts from the Lab 4 planning session that followed
the contract decisions above. The prompts are kept verbatim, including the
user's informal wording and spelling.

### Prompt 7 - Understand the Lab 4 handout

**Prompt (verbatim):**

```text
[$grill-with-docs](C:\Users\lchan\\.agents\skills\grill-with-docs\SKILL.md) C:\KMUTT\Y3T1\CPE334\ToktikIT\material\SE+Lab+4.pdf understand this pdf file.
```

**Outcome:** The 11-page PDF was extracted and visually checked. Its scope,
roles, Action Taken model, Ticket workflow, dashboards, regression obligations,
repository structure and 60-point submission rubric were summarized. The
remaining design decisions were surfaced for confirmation.

### Prompt 8 - Confirm the first design decisions

**Prompt (verbatim):**

```text
as you recommended
```

**Outcome:** Confirmed separate `performedBy`, `assignee` and `status`
concepts for Actions Taken; formal resolution requires a completed action with
a meaningful result; and the recommended dashboard metric set is accepted.

### Prompt 9 - Confirm the implementation rules

**Prompt (verbatim):**

```text
also as you reccomend
```

**Outcome:** Confirmed the Action Taken lifecycle, active-assignee rule,
version-based stale-write handling with `409 Conflict`, seven-day/latest-five
dashboard windows with UTC storage and Asia/Bangkok display, and zero-action
legacy Tickets without artificial backfill.

### Prompt 10 - Split the implementation into Issues

**Prompt (verbatim):**

```text
good if have enough information let start with do split the issue
```

**Outcome:** Created Issues #54-#62 with explicit acceptance criteria,
dependencies and feature-branch names. The breakdown separates the contract,
data foundation, API authorization, Ticket workflow, Actions Taken UI, Staff
dashboard, Requester dashboard, final evidence and release.

### Prompt 11 - Move the Issues to Backlog

**Prompt (verbatim):**

```text
เอา issue ไปไว้ blacklog
```

**Outcome:** Moved all Lab 4 Issues #54-#62 to the TokTickIT Kanban `Backlog`
column and verified all nine items.

### Prompt 12 - Keep the AI-use log current

**Prompt (verbatim):**

```text
save prompt in to [ai-use.md](docs/lab-04/ai-use.md)
```

**Outcome:** Added this session addendum to the Lab 4 AI-use log while
preserving the existing contract record.

### Prompt 13 - Record the Astra prompt

**Prompt (verbatim):**

```text
save astra prompt to ai-use
```

**Outcome:** Recorded this request in the Lab 4 AI-use log. The six selected
prompts in the grading table remain unchanged.

### Prompt 14 - Match the Lab 2 reviewer-log format

**Prompt (verbatim):**

```text
Do format docs\lab-04\reviewer.md like docs\lab-02\reviewer.md
```

**Outcome:** Reformatted `docs/lab-04/reviewer.md` to use the Lab 2-style peer
review record structure, updated PR #63 with its verified approval and merge,
and added the current PR #64 implementation status. The six selected prompts
in the grading table remain unchanged.

### Prompt 15 - Fix the PR #64 review

**Prompt (verbatim):**

```text
c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-pr64-feature-lab4-2-actions-foundation-348d407.md coder fix following this review make it good and run test
```

**Outcome:** Reviewed the PR #64 findings, identified the incomplete Lab 2/3
regression evidence and the missing database invariant for `completedAt`, and
prepared the implementation fix and verification plan.

### Prompt 16 - Complete and self-review the fix

**Prompt (verbatim):**

```text
Coder fix it c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-pr64-feature-lab4-2-actions-foundation-348d407.md if you finish review yourself once
```

**Outcome:** Added `ActionTaken_completedAt_state_check`, corrected the clean
User Management expectation to the seeded 12 users, recorded Lab 2/3 E2E
coverage, and regenerated the browser evidence. Verification passed with
server 190/190, client 135/135, Playwright 13/13, both builds, client lint,
Prisma validation, migration status and a fresh-database constraint probe.
The repository formatter still reports the pre-existing CRLF baseline
diagnostics; no new whitespace errors were found in the committed diff.

### Prompt 17 - Record the complete prompt history

**Prompt (verbatim):**

```text
after this save the all prompt into docs\lab-04\ai-use.md
```

**Outcome:** Appended the PR #64 implementation and self-review prompts to
this archival log while preserving the six selected key prompts used for the
Lab 4 disclosure table.

### Prompt 18 - Review PR #64 against Issue #55 only

**Prompt (verbatim):**

```text
reviewer review PR#64 feature/lab4-2-actions-foundation following issue#55 only the issue scope
```

**Outcome:** Reviewed the current PR head against Issue #55 only, without
applying requirements from the broader Lab 4 specification.

### Prompt 19 - Record prompts from this review exchange

**Prompt (verbatim):**

```text
save all prompt after this into docs\lab-04\ai-use.md
```

**Outcome:** Added the prompts from this review exchange to the Lab 4 AI-use
log. Continue recording subsequent user prompts in later entries.

### Prompt 20 - Implement the Actions API issue

**Prompt (verbatim):**

```text
coder implement the issue#56 move the kanban and dont open the PR
```

**Outcome:** Implemented the Issue #56 Actions Taken REST API on
`feature/lab4-3-actions-api` without opening a pull request. The implementation
adds ownership-scoped reads, Staff/Administrator writes, active-staff
assignment validation, status/follow-up/result guards, optimistic Ticket and
Action versions, serializable idempotent creation, audit events and focused
API tests. The issue remains in the Kanban `Started` column while it is not
merged.

### Prompt 21 - Fix the Issue #56 review findings

**Prompt (verbatim):**

```text
coder fix following this reviee c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-feature-lab4-3-actions-api-issue56.md
```

**Outcome:** Rejected unsupported query parameters on the action-assignee
endpoint and added API coverage for Administrator creation, Requester create
and edit denial, and stale Action updates that leave the Action, Ticket and
history unchanged. The focused Action API suite passed 14/14 tests; the full
server suite passed 204/204 tests; the server build and changed-file Biome
checks passed.

### Prompt 22 - Fix the remaining Issue #56 review finding

**Prompt (verbatim):**

```text
c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-feature-lab4-3-actions-api-issue56-e712136.md coder fix this and recheck your result again once
```

**Outcome:** Added successful Administrator PATCH coverage asserting the
updated Action response and authenticated Admin audit actor. Rechecked the
review findings; the focused Action API suite passed 15/15, the full server
suite passed 205/205, and the server build and changed-file Biome checks passed.

### Prompt 23 - Complete the Issue #56 review recommendations

**Prompt (verbatim):**

```text
c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-feature-lab4-3-actions-api-issue56.md coder implement the following review do all recommend recheck yourself once
```

**Outcome:** Centralized idempotency replay and payload-conflict handling for
both transaction replays and unique-key race recovery, and added regression
coverage for replaying the winning request after a `P2002` race. The full
server suite passed 206/206, the server build passed, and changed-file Biome
and whitespace checks passed. Rechecked the review's API coverage and
idempotency recommendations.
