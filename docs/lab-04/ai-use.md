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
