# Lab 4 Reviewer Guide and Record

Status: **Draft contract for peer review**<br>
Version: **1.0**<br>
Date: **2026-09-22**<br>
Branch: `feature/lab4-1-contract`<br>
Issue: [#54](https://github.com/Snnn3/TokTickIT/issues/54)

Review all six companion files against [the handout](../../material/SE+Lab+4.pdf)
and [Issue #54](https://github.com/Snnn3/TokTickIT/issues/54).
This is a contract change. Peer approval and merge remain pending; the contract
PR is opened only after the user requested it.

## 1. Source and authority

The PDF requires Requester and Staff dashboards, Administrator action writes,
follow-up/attachment-note fields, database/seed/recovery decisions, test coverage
and Product DoD. Issue #54 adds the locked action statuses, authenticated performer,
active-Staff assignment, completed-result resolution gate, recent7/latest5,
UTC/Bangkok, versions409 and zero-action legacy migration.
The untracked CONTEXT.md glossary is useful terminology but does not override
the handout's explicit Administrator permissions.

## 2. Validation findings and repairs

| Finding from PDF validation | Contract repair | Verification reference |
|---|---|---|
| Requester dashboard prohibited | Own dashboard API/UI, attention/recent/resolved metrics and drill-downs | AC-11; API4-03, C4-02, E4-03 |
| Admin action writes forbidden | Admin performer allowed; assignee remains active Staff only | AC-03/05/10; API4-01, E4-01 |
| Follow-up and attachment-note fields missing | Full model/request/form/conditional rules | AC-06; U4-01, API4-01, C4-01 |
| Staff personal actions/drill-down absent | Current-performer counts/list, filtered queue/actions routes | AC-12; API4-04, E4-03 |
| UUID foreign keys incompatible | Integer keys consistent with existing Ticket/User IDs | AC-02; M4-01 |
| Version/retry contract incomplete | Explicit workflow scope, response versions, transactional replay | AC-14/15; API4-05, E4-04 |
| Seed/recovery/design rationale absent | Repeatable seed, restore procedure, index/type/transaction rationale | AC-21; M4-01/M4-02 |
| Test details and inverse links incomplete | File paths, expected results, Planned status, exact inverse table | D4-01 |
| Invalid command names | Existing check, client lint and test:e2e scripts | tests.md Section6 |
| Conflicting blank-result errors | Normalize blank to null; completion -> ACTION_RESULT_REQUIRED | AC-06/16 |
| Document-only DoD | Product gates, performance, README, visual and final main evidence | AC-18/19/23 |
| Reconstructed selected AI prompts | Six actual prompts; preserve supplied planning-session addendum | ai-use.md |

These are drafting repairs, not evidence that future implementation tests pass.

## 3. Peer checklist

- [ ] All PDF and issue requirements map to FR/BR/AC and planned evidence.
- [ ] Every role/ownership/self-service combination is consistent across files.
- [ ] Admin performer versus Staff-only assignee is unambiguous.
- [ ] Follow-up validation, timestamps, terminal behavior and resolution agree.
- [ ] Existing integer IDs and legacy resolvedAt treatment preserve data.
- [ ] Every metric has predicate, scope, ordering, empty behavior and drill-down.
- [ ] Action reads expose versions needed by writes; all workflow mutation routes
  and account cascades have defined atomicity and safe conflicts.
- [ ] Creation replay handles duplicate clicks and lost network responses.
- [ ] Assignment/deactivation races cannot leave invalid active assignments.
- [ ] Audit history, comments and notes remain append-only and correctly visible.
- [ ] Migration/seed/recovery and performance tests use real isolated databases.
- [ ] AC/test relationships match exactly in both directions.
- [ ] Product DoD covers final tests, README, screenshots, accessibility and main.
- [ ] New design choices (audit trail, optional assignee, replay retention,
  historical completed-action reuse after reopen) are acceptable.

## 4. Review history

| Round | Reviewer | Scope | Result | Evidence |
|---|---|---|---|---|
| 1 | OpenAI Codex (AI assistance, not peer approval) | PDF and Issue54 validation, 2026-09-22 | Changes required | Findings recorded in Section2 |
| 2 | OpenAI Codex (AI assistance, not peer approval) | Contract repair, 2026-09-22 | Fresh AI consistency review found no material contradictions; peer review pending | Six companion documents; 23 ACs and 89 exact forward/reverse pairs checked; local links, versions and npm script names verified |
| Peer1 | Pending | Contract | Pending | Reviewer identity, commit, PR/review URL and timestamp required |

For each real review record the comment/finding, author response, fixing commit,
review URL and approval. Never substitute an AI check for peer approval.
Contract approval and merge must occur before implementation PRs are completed.
Keep Issue54 open until its review/merge acceptance criterion is satisfied.

## 5. Implementation/release evidence template

| Item | Result / evidence |
|---|---|
| Reviewed implementation commit and PR | Pending |
| Server/client unit and API tests | Pending |
| Lint/check and both builds | Pending |
| E2E / Labs1-3 regression | Pending |
| Migration / repeat seed / recovery | Pending |
| Concurrent writes / replay / assignment race | Pending |
| Dashboard SQL count comparisons / performance smoke | Pending |
| Desktop/tablet/mobile visual and accessibility checklist | Pending |
| README setup/demo instructions verified | Pending |
| Peer comments, responses and approval | Pending |
| lab4-staging integration and final main verification | Pending |

Product-completion checkboxes are owned by specification.md Section10 and
must cite this evidence before being checked.
