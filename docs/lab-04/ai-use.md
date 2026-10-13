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

### Prompt 24 - Place the agent setup in `.agents`

**Prompt (verbatim):**

```text
make the agents in .agents
```

**Outcome:** Relocated the setup target from the initially drafted `docs/agents/`
location to the repository's local-only `.agents/` configuration.

### Prompt 25 - Use the `.agents/` folder

**Prompt (verbatim):**

```text
make the folder in .agents/
```

**Outcome:** Reused `.agents/AGENTS.md` and the existing tracker/domain guides,
added the default triage-label mapping and Wayfinder conventions under
`.agents/agents/`, and removed the temporary `docs/agents/` drafts. These
configuration files remain ignored and local-only.

### Prompt 26 - Complete the remaining Issue #56 review and open a PR

**Prompt (verbatim):**

```text
coder it still missing c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-feature-lab4-3-actions-api-issue56-2368b43.md impelment it then review yourself once. after that open the PR
```

**Outcome:** Completed the remaining review finding by rejecting JSON and
unparsed request bodies on all four bodyless Action GET endpoints before
resource lookup. Added route-level regression coverage for JSON and
`text/plain` bodies; the focused API suite passed 24/24 tests, the full server
suite passed 214/214 tests, and the server build, changed-file Biome checks,
and diff checks passed. A separate branch self-review found and drove the
non-JSON body fix. Opened [PR #65](https://github.com/Snnn3/TokTickIT/pull/65)
to merge into `lab4-staging`.

### Prompt 27 - Implement the PR #65 review findings

**Prompt (verbatim):**

```text
c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-pr65-feature-lab4-3-actions-api-f1790d5.md coder read this review and implement following this. and review yourself one time.
```

**Outcome:** Deferred malformed Action-write parsing until after authentication
and role checks; corrected Action read-error precedence; added atomic release of
nonterminal Action assignments when IT Staff become inactive or change roles,
with Action/Ticket versions, Admin audit events and response counts; and tested
an illegal Action transition for zero writes. Full tests passed (223 server,
135 client), the server build and changed-file formatter/whitespace checks
passed. The Standards self-review found no findings. The repository-wide
formatter check still reports existing CRLF formatting differences in other
files.

### Prompt 28 - Fix the remaining PR #65 spec finding and duplication

**Prompt (verbatim):**

```text
coder fix the spec issue c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-pr65-feature-lab4-3-actions-api-issue56-4e829f8.md in this review and delete the duplicatd code smell
```

**Outcome:** Deferred Action GET parsing until after auth/access checks and
Action write parsing until after path, Ticket, self-service and Action checks.
Consolidated Serializable retry behavior and repeated Action test transaction
setup. The full server/client suites passed (233/135), as did the server build,
focused formatter check and whitespace check.

### Prompt 29 - Review Issue #60 requester dashboard against staging

**Prompt (verbatim):**

```text
reviewer review the Issue #60  in the scope of issue in feature/lab4-7-requester-dashboardcompare to origin/lab4-staging the new change is already push
```

**Outcome:** Reviewed pushed head `17ee0f8` against `origin/lab4-staging`
(`5409b44`), limited to Issue #60, with independent Standards and Spec passes.
Saved `.reviews/review-feature-lab4-7-requester-dashboard.md` with a Changes
requested verdict: active My Tickets filters/pagination are lost through
refresh/detail-back, resolved drill-down shows the wrong sorting label,
visible date bounds are raw UTC instead of Bangkok time, and the new requester
performance test reproducibly fails its unequal-fixture query-count assertion.
Server tests passed 360/360; client diagnostic retry passed 191/191 with an
explicit 15-second timeout after default-timeout failures; dashboard E2E passed
13/13. Performance tests passed 4/5, and the failing requester test failed again
in isolation; requester p95 remains unverified. Builds, client lint, changed-file
formatter and whitespace checks passed. No implementation edits, GitHub review,
commit or push were made.

### Prompt 30 - Re-review Issue #60 requester dashboard

**Prompt (verbatim):**

```text
reviewer review the Issue #60  in the scope of issue in feature/lab4-7-requester-dashboardcompare to origin/lab4-staging
```

**Outcome:** Verified that local and remote feature heads remain `17ee0f8`
and the staging base remains `5409b44`, matching the previous review. Found
uncommitted implementation/test corrections and new requester performance
evidence in the working tree. Requested confirmation to include those changes,
because the reviewer guidance excludes uncommitted changes unless explicitly
requested. Preserved all existing changes; no new test run, implementation edit,
commit, push or GitHub review was made.

### Prompt 31 - Re-review the pushed Issue #60 fixes

**Prompt (verbatim):**

```text
i already push the fix
```

**Outcome:** Confirmed the pushed head is now `9388984`, compared its complete
Issue #60 diff against staging `5409b44`, and saved the updated branch review.
The previous filter/pagination persistence, resolved-sort label, Bangkok-bound
display and performance-query comparison findings are resolved. Standards has
only non-blocking notes. Spec still requests changes for rejection of matching
`sort=resolvedAt`, obsolete error-body parsing clearing a newer filtered list,
and missing resolved-time boundary/overflowing attention/resolved tie assertions.
Both behavior findings were independently reproduced without implementation
edits. Server tests passed 360/360; client passed 192/192 with a recorded
15-second timeout, focused thread-worker retry passed 16/16, dashboard E2E
passed 14/14, and real-database performance passed 5/5 (Requester p95 106.65ms,
Staff p95 108.90ms). Builds, client lint, changed-file formatter and whitespace
checks passed. Initial environment setup/worker timeouts are recorded separately
from successful retries. Preserved prior prompt-log changes and archived the
earlier report; no source edit, commit, push or GitHub approval was made.

### Prompt 32 - Re-review Issue #60 after the pushed review fixes

**Prompt (verbatim):**

```text
reviewer review the Issue #60  in the scope of issue in feature/lab4-7-requester-dashboardcompare to origin/lab4-staging
```

**Outcome:** Reviewed pushed head `2dec95f` against staging `5409b44`, limited
to Issue #60, with independent Standards and Spec reviews of all three commits.
All three previous blockers are resolved. The verdict remains Changes requested
for one new P2: an obsolete initial Requester Dashboard response can replace a
newer snapshot and enable Refresh while a later refresh is still pending. This
was independently reproduced in Chromium under the existing development
StrictMode setup with controlled responses. Standards has three optional P3
maintainability suggestions and no hard violations. Focused client tests passed
19/19; full client passed 195/195 with the recorded 15-second timeout; server
isolated retry passed 364/364; dashboard E2E passed 14/14; real-database tests
passed 6/6, including resolved boundaries and exact attention/resolved tie IDs.
Requester p95 was 111.56ms and Staff p95 91.62ms. Builds, client lint, changed-file
formatter and whitespace checks passed. The initial database readiness timeout
is recorded separately. Saved the current review and preserved the previous
report under its commit-suffixed name. Generated evidence was kept isolated and
the managed review checkout archived. No implementation edit, commit, push,
GitHub review or approval was made; existing prompt-log changes were preserved.

### Prompt 33 - Locate the requester dashboard review

**Prompt (verbatim):**

```text
which file i need to read
```

**Outcome:** Linked the current requester dashboard review report, especially
Spec F1 and Where to fix, and the relevant RequesterDashboard.tsx code location.
No additional review, test run or implementation change was made for this prompt.

### Prompt 34 - Re-review Issue #60 after the dashboard race fix

**Prompt (verbatim):**

```text
reviewer review the Issue #60  in the scope of issue in feature/lab4-7-requester-dashboardcompare to origin/lab4-staging
```

**Outcome:** Reviewed pushed head `fdaa916` against staging `5409b44`, covering
all four commits and 25 changed files with independent Standards and Spec passes.
Approved locally within Issue #60 scope: no blocking findings remain. The last
P2 dashboard refresh race is fixed by generation guards and effect cleanup, with
a new StrictMode regression and six independent Chromium stale-response variants
passing. Standards has three optional P3 suggestions; Spec has zero findings.
Focused tests passed 20/20, server 364/364, final client rerun 196/196, dashboard
E2E 14/14 and real-database/performance tests 6/6. The initial full-client run
failed one inherited logout assertion (195/196); its file passed 9/9 separately
and the identical full suite passed without concurrent browser workload. This
failure and the explicit single-thread/15-second test settings are recorded.
Requester p95 was 77.48ms, Staff p95 87.05ms; builds, client lint, changed-file
formatter and whitespace checks passed. Saved the current report, preserved the
previous report as review-feature-lab4-7-requester-dashboard-2dec95f.md, preserved
existing prompt-log changes and archived the isolated evidence checkout. No
implementation edit, commit, push or GitHub approval submission was made.
