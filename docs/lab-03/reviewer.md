# Lab 3 — Peer Review Record

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Chanon Lhumsa-ard | 67070501059 | [@Snnn3](https://github.com/Snnn3) |
| Peer reviewer | Worawut Sereethai | 67070501040 | [@YummieGG](https://github.com/YummieGG) |

Repositories: mine is [Snnn3/TokTickIT](https://github.com/Snnn3/TokTickIT); my partner's is [YummieGG/toktickit](https://github.com/YummieGG/toktickit). Every feature branch merges into `lab3-staging` and then `main` through a reviewed pull request. Rows are filled as Sprint 3 progresses.

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [#43](https://github.com/Snnn3/TokTickIT/pull/43) (closed unmerged) | feature/lab3-1-contract | Closed by me before review; superseded by #44 on the same branch and base |
| [#44](https://github.com/Snnn3/TokTickIT/pull/44) | feature/lab3-1-contract (contract v1.7) | **CHANGES_REQUESTED ×2** by @YummieGG; both rounds addressed, awaiting re-review |
| TBD | feature/lab3-2-refactor | TBD |
| TBD | feature/lab3-3-auth-foundation | TBD |
| TBD | feature/lab3-4-requester-regression | TBD |
| TBD | feature/lab3-5-staff-queue | TBD |
| TBD | feature/lab3-6-staff-operations | TBD |
| TBD | feature/lab3-7-user-management | TBD |
| TBD | feature/lab3-8-e2e-visual | TBD |

### Reviewer comments I received and how I responded

**PR #44 — round 1 — @YummieGG, `CHANGES_REQUESTED`, 2026-09-10 07:53**

> I found a few specification and test-traceability issues that should be resolved before implementation begins. The main concerns are an incomplete Definition of Done, an authorization-matrix gap, an undocumented ownership exception, and several acceptance criteria whose planned tests do not yet cover the full behavior.
>
> **Include AC-28 in the Definition of Done** — `specification.md:219` defines AC-28 for password-change session invalidation, and `tests.md:128` maps it to API-06. However, the Definition of Done only requires `AC-01..AC-27` at `specification.md:227`.
>
> **Add `/api/staff/assignees` to the authorization matrix** — `api-spec.md:109` defines the protected `GET /api/staff/assignees` endpoint, but the authorization matrix in `specification.md:109-120` has no explicit row for this operation.
>
> **Document the terminal-owner exception explicitly** — `specification.md:71` allows an inactive user to remain the historical owner of Closed or Cancelled tickets, while Lab 03 §4.5 states that a Ticket Owner must be an active IT Staff or Administrator. The existing D17 only justifies unassigning non-terminal tickets.
>
> **Make AC traceability assertions complete** — AC-18, AC-14, AC-16 and AC-17 are mapped to test IDs, but the expected results do not cover the full acceptance criteria.

*Response — fix commit `5734da0` (contract v1.5).* All four accepted. The Definition of Done now gates on `AC-01..AC-28`; this was a real process hole, since AC-28 was added in v1.4 and the gate that enforces it was left behind in the same revision. The assignee listing gained a matrix row for all three roles including the `403` for Requesters. The terminal-owner exception became **D22**, with both rejected alternatives recorded — scrubbing the owner off a Closed ticket destroys the record of who handled it, and blocking deactivation until every historical ticket is reassigned is a dead end because bulk operations are excluded by §4.2. The four traceability gaps were closed by strengthening API-18 (`mustChangePassword` on create), API-19 (the reset user's *next login* is actually refused, not merely that the flag was written), API-26 (ticket numbers and attachment bytes, not just ownership) and a new row **S-02** for the empty / no-results / forbidden / failure states that token and scroll-width assertions never reached.

**PR #44 — round 2 — @YummieGG, `CHANGES_REQUESTED`, 2026-09-10 10:26**

> **Bootstrap documentation does not match the Lab 03 authentication contract** — `api-spec.md:10` and `specification.md:104,236-237` say that `server/.env.example` documents `JWT_SECRET` and `SEED_INITIAL_PASSWORD`, and that the README is the authoritative source for seeded credentials. However, `server/.env.example:1-7` contains neither variable, while `README.md:149-188` still documents the Lab 2 `X-Requester-Id` selector and `e2e/lab-02` commands.
>
> **Migration preservation evidence is not executable yet** — `tests.md:15-21` says API tests use a stubbed Prisma client and that real migration evidence must come from a real database. Nevertheless, `API-26` requires proving that ticket numbers and attachment bytes remain identical before and after migration. A mocked Prisma test cannot prove preservation in the actual migration.
>
> **PR metadata is stale relative to the v1.5 contract** — the PR title and description still identify the change as contract v1.3 and list only AC-01..AC-27 and D1..D21.

*Response — fix commit `98249e6` (contract v1.6).* All three accepted. `server/.env.example` gained non-secret placeholders for both keys, and the README gained a Lab 3 status block naming the seeded initial password, marking the Lab 2 REST and E2E sections superseded. One deviation was raised for the reviewer to judge: Lab 3 run/test commands were **not** added to the README, because those slices are unimplemented and documenting them would replace one false claim with another; #42 already carries the DoD item requiring the README be current before release. The migration point was self-inflicted — v1.5 attached byte-preservation assertions to API-26, a test the strategy section itself says runs against a stub — so preservation became **M-01**, a real-database procedure, with API-26 rescoped to post-migration behaviour and AC-17 tracing to M-01. PR title, description and this file were brought up to date.

**Internal consistency audit (self-initiated, not a peer round) — fix commit `b614162` (contract v1.7).** A cross-document sweep asking whether any two normative documents disagree, rather than whether each is correct alone, found ten contradictions. Two were half-applied fixes from earlier rounds: BR-22 still demanded a JSON content type on every state-changing request while `api-spec.md` exempted body-less ones, and only the requester-facing reopen cleared the Resolution Summary while a staff reopen through the status PATCH did not. Recorded here because it explains the v1.7 bump between peer rounds.

## Pull Requests I reviewed for my partner

| PR | Branch | My verdict |
|----|--------|------------|
| [YummieGG/toktickit#45](https://github.com/YummieGG/toktickit/pull/45) | lab3-1-engineering-contract → lab3-staging | **APPROVED** 2026-09-10 07:02; merged by author 07:04 |
| TBD | TBD | TBD |

### My comments and partner's responses

**YummieGG/toktickit#45 — "Lab3 1 engineering contract and remove unrelated PR-24 files" — reviewed 2026-09-10 07:02, verdict APPROVED**

Reviewed against the CPE 334 Lab 3 handout. All four engineering contract documents — `specification.md`, `api-spec.md`, `ui-spec.md` and `tests.md` — were present, complete and mutually consistent, covering the handout's required sections. The PR also removed unrelated files that had been carried in from PR-24, which was the right call: keeping the contract PR limited to contract artifacts makes the Part 2 evidence (that the specification predated implementation) legible.

Verdict: approved with no blocking findings. Merged by the author two minutes later.

*Partner response:* none required — the review raised no blocking items.
