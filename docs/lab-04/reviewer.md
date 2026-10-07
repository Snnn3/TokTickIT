# Lab 4 - Peer Review Record

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Chanon Lhumsa-ard | 67070501059 | [@Snnn3](https://github.com/Snnn3) |
| Peer reviewer | Worawut Sereethai | 67070501040 | [@YummieGG](https://github.com/YummieGG) |

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| https://github.com/Snnn3/TokTickIT/pull/63 | feature/lab4-1-contract | Approved - merged into `lab4-staging` on 2026-09-30 |
| https://github.com/Snnn3/TokTickIT/pull/64 | feature/lab4-2-actions-foundation | Approved - merged into `lab4-staging` on 2026-10-01 |
| https://github.com/Snnn3/TokTickIT/pull/65 | feature/lab4-3-actions-api | Changes requested, then approved - merged into `lab4-staging` on 2026-10-05 |
| https://github.com/Snnn3/TokTickIT/pull/66 | feature/lab4-4-ticket-workflow | Approved - merged into `lab4-staging` on 2026-10-07 |

### Reviewer comments I received and how I responded

**PR #63 - feature/lab4-1-contract** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-09-30):** Reviewed the six Lab 4 companion documents against Issue #54 and the Lab 4 handout. The contract, agreed design decisions, authorization matrix, lifecycle rules, and bidirectional mapping of 23 acceptance criteria to 89 planned test pairs were accepted. The reviewer noted that commit `0158b6b` added `CONTEXT.md` and `skills-lock.json`, so the PR description needed that minor correction.
- **My comment (2026-09-30):** Thanked the reviewer, acknowledged the documentation note, and recorded that PR #63 had merged into `lab4-staging`, completing the contract phase and unblocking implementation.
- **Merge:** Merged into `lab4-staging` at `2026-09-30 12:23 UTC`.

**PR #64 - feature/lab4-2-actions-foundation** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-10-01):** Approved the schema constraints, legacy-data preservation, idempotent seed fixtures, migration evidence, and regression suite for Issue #55. The review verified 190 server tests, 135 client tests, and 13 Playwright tests at that time.
- **Merge:** Merged into `lab4-staging` at `2026-10-01 16:16 UTC`.

**PR #65 - feature/lab4-3-actions-api** (MERGED)
- **Reviewer review (YummieGG, CHANGES_REQUESTED, 2026-10-04):** Accepted the Actions Taken API design, authorization/body precedence, optimistic concurrency, and audit logging. Requested a missing `prisma.actionTaken.findMany` mock in the Lab 3 admin deactivation/demotion regression fixture, which otherwise tried to reach PostgreSQL in isolated tests, plus documentation updates.
- **Response (2026-10-05):** Added the Action query stub to the existing regression test and recorded the review response here. The targeted deactivation/demotion cases passed (2/2) without a database connection. The PR comment at the time reported 244/245 server tests passing; the remaining Lab 1 seeded-category test required PostgreSQL.
- **Final GitHub state:** PR #65 is approved and merged into `lab4-staging` at `2026-10-05 09:11 UTC`. Its final approval review text refers to PR #64 and Issue #55, so that text is not treated here as additional PR #65-specific review evidence.

**PR #66 - feature/lab4-4-ticket-workflow** (MERGED)
- **Reviewer review (YummieGG, APPROVED, 2026-10-07):** Approved the Issue #57 workflow and resolution gate. The review verified the complete transition matrix and terminal protection, resolution prerequisites, requester advisory/reopen behavior, optimistic concurrency and conflict recovery, and the related API/client/E2E tests.
- **My comment (2026-10-07):** Thanked the reviewer for the detailed review and help getting PR #66 merged.
- **Merge:** Merged into `lab4-staging` at `2026-10-07 09:15 UTC`.

## Verification for Issue #58

The following results were run on implementation head `fea80f0` on 2026-10-08, before this reviewer-record update:

- Server: `npm test --prefix server` - 18 files, 332 tests passed.
- Client: `npm test --prefix client -- --maxWorkers=1` - 19 files, 158 tests passed.
- Playwright: `npm run test:e2e` - 13 tests passed.
- Client lint, server build, client build, and Prisma Client generation passed.
- `npm run check` failed with 74 repository-wide formatter diagnostics across 121 checked files. The output includes line-ending normalization differences; the check did not modify files, and this repo-wide formatting issue is not resolved by the Issue #58 change.

---

## Pull Requests I reviewed for my partner

No Lab 4 partner PRs have been recorded yet.

### My comments and partner's responses

No Lab 4 partner review comments or responses have been recorded yet.
