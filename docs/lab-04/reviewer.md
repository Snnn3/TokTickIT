# Lab 4 - Peer Review Record

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Chanon Lhumsa-ard | 67070501059 | [@Snnn3](https://github.com/Snnn3) |
| Peer reviewer | Worawut Sereethai | 67070501040 | [@YummieGG](https://github.com/YummieGG) |

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| https://github.com/Snnn3/TokTickIT/pull/63 | feature/lab4-1-contract | Approved - merged into `lab4-staging` on 2026-09-30 |
| https://github.com/Snnn3/TokTickIT/pull/64 | feature/lab4-2-actions-foundation | Open; peer review pending; targets `lab4-staging` |
| https://github.com/Snnn3/TokTickIT/pull/65 | feature/lab4-3-actions-api | Changes requested 2026-10-04; regression-test fix and peer-review record updated locally 2026-10-05; re-review pending; targets `lab4-staging` |

### Reviewer comments I received and how I responded

**PR #63 - feature/lab4-1-contract** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-09-30):** Reviewed the six Lab 4 companion documents against Issue #54 and the Lab 4 handout. The contract, agreed design decisions, authorization matrix, lifecycle rules, and bidirectional mapping of 23 acceptance criteria to 89 planned test pairs were accepted. The reviewer noted that commit `0158b6b` added `CONTEXT.md` and `skills-lock.json`, so the PR description needed that minor correction.
- **My comment (2026-09-30):** Thanked the reviewer, acknowledged the documentation note, and recorded that PR #63 had merged into `lab4-staging`, completing the contract phase and unblocking implementation.
- **Merge:** Merged into `lab4-staging` at `2026-09-30 12:23 UTC`.

**PR #64 - feature/lab4-2-actions-foundation** (OPEN)
- **Implementation:** Added the Actions Taken schema and migration, stable seed fixtures, append-only audit events, restrictive history-preserving foreign keys, repeat-seed handling, and real disposable migration/restore evidence for Issue #55.
- **Peer review:** Pending. The PR targets `lab4-staging`; Issue #55 is in the Kanban `PR Review` column.

**PR #65 - feature/lab4-3-actions-api** (OPEN)
- **Reviewer review (YummieGG, CHANGES_REQUESTED, 2026-10-04):** Accepted the Actions Taken API design, authorization/body precedence, optimistic concurrency, and audit logging. Requested a missing `prisma.actionTaken.findMany` mock in the Lab 3 admin deactivation/demotion regression fixture, which otherwise tried to reach PostgreSQL in isolated tests, plus documentation updates.
- **Response (2026-10-05):** Added the Action query stub to the existing regression test and recorded this review and response here. The targeted deactivation/demotion cases pass (2/2) without a database connection. Full server tests report 244/245 passing; the remaining failure is the documented Lab 1 seeded-category test because PostgreSQL is unavailable. Server build and focused formatter check pass. The PR remains open pending peer re-review; no approval or merge is claimed.

---

## Pull Requests I reviewed for my partner

No Lab 4 partner PRs have been recorded yet.

### My comments and partner's responses

No Lab 4 partner review comments or responses have been recorded yet.
