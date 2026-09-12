# Lab 3 — Peer Review Record

Version: 2.1 | Date: 2026-09-13 | Companion to `specification.md`.

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Chanon Lhumsa-ard | 67070501059 | [@Snnn3](https://github.com/Snnn3) |
| Peer reviewer | Worawut Sereethai | 67070501040 | [@YummieGG](https://github.com/YummieGG) |

Repositories: mine is [Snnn3/TokTickIT](https://github.com/Snnn3/TokTickIT); my partner's is [YummieGG/toktickit](https://github.com/YummieGG/toktickit). Every feature branch merges into `lab3-staging` and then `main` through a reviewed pull request. Rows are filled as Sprint 3 progresses.

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [#43](https://github.com/Snnn3/TokTickIT/pull/43) (closed unmerged) | feature/lab3-1-contract | Closed by me before review; superseded by #44 on the same branch and base |
| [#44](https://github.com/Snnn3/TokTickIT/pull/44) | feature/lab3-1-contract (contract v1.8) | **CHANGES_REQUESTED ×3** by @YummieGG, every round addressed; **APPROVED** 2026-09-10 16:01 at head `d09355b`, merged into `lab3-staging` 16:04 |
| [#45](https://github.com/Snnn3/TokTickIT/pull/45) | feature/lab3-2-refactor (formatting pass) | **CHANGES_REQUESTED ×1** by @YummieGG at head `8c78ae5`, addressed; **APPROVED** 2026-09-12 12:07 at head `757038c`, merged into `lab3-staging` |
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

**PR #44 — round 3 — @YummieGG, `CHANGES_REQUESTED`**

> **Contract approval status and required evidence are not complete** — `specification.md:3` says `Status: Approved contract`, while `reviewer.md:15` says PR #44 has `CHANGES_REQUESTED ×2` and is awaiting re-review. GitHub still has no approval after the current head. In addition, `ai-use.md:62` leaves `My Reflection` as `TBD`. The contract is labelled approved before the required peer approval is recorded.
>
> **Authenticated reference endpoints are missing from the authorization matrix** — `api-spec.md:44-50` defines `GET /api/reference/categories` and `GET /api/reference/systems` as authenticated endpoints, but the matrix has no row for either.
>
> **PR description is stale relative to the submitted head** — the body still says `Current revision: v1.6` and `head 98249e6`, while the branch is v1.7.
>
> **Logout contract is internally contradictory** — `api-spec.md:26-30` says logout "requires a cookie" but also that it is "idempotent (clears even if absent)", so the implementation cannot determine whether a request without a session returns `401` or a successful clear.

*Response — fix commit `e105a48` (contract v1.8).* All four accepted. The approval point was the most serious: the contract asserted its own approval while this PR carried two unresolved rounds and no recorded approval, which makes the label worthless as evidence. Status is now **Draft — pending peer approval on PR #44**, and the Definition of Done gained an item stating it may only change once an approval is *recorded*, since the reviewer's verdict is the authority and the header is not. `My Reflection` was written, marked as drafted from the session record pending the author's final wording. The reference endpoints gained a matrix row, and a wider gap found while fixing it was closed too — the matrix had never stated unauthenticated behaviour for *any* row, so it now says an unauthenticated caller receives `401 AUTH_REQUIRED` everywhere except login. Logout was pinned to the reviewer's suggested behaviour: no cookie required, always `204`, always a cleared `Set-Cookie`, with API-06 asserting the no-cookie case, because a client whose session has already expired must still be able to reach a clean signed-out state. PR title and description were updated to v1.8 at the current head.

*One point contested rather than accepted.* The review described `docs/lab-03/plan.md` as "a required contract file". Handout §12 lists six required files — `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md` — all of which are present and tracked; the plan is a local working document untracked deliberately in `34b7763`, and no tracked document references it. This was raised on the PR for the reviewer to settle rather than silently actioned either way.

**PR #44 — round 4 — @YummieGG, `APPROVED`, 2026-09-10 16:01**

> Re-reviewed the latest revision against the Lab 03 handout and Issue #35. All previous findings have been addressed:
>
> - The required contract files and review evidence are now consistent.
> - The PR metadata matches the current head.
> - The authorization matrix, logout behavior, and acceptance-test traceability are complete.
> - The AI-use and peer-review records are synchronized.
> - No additional Standards or Spec issues remain in this documentation-only PR.
>
> The contract is complete and ready for implementation.
>
> **Approved.**

*Outcome — no fix commit; the approval landed on the unchanged head `d09355b` (contract v1.8).* The reviewer merged nothing new: rounds 1 to 3 had already been answered by `5734da0`, `98249e6` and `e105a48`, and this round confirmed that the v1.8 set holds together. PR #44 was merged into `lab3-staging` three minutes later, and issue #35 was closed by that merge, which unblocked #36 (the Lab3-02 formatting pass).

This is the approval that the round-3 Definition of Done item was waiting for: the contract may only call itself approved once a peer approval is *recorded*, and the record is this row. The contested point from round 3 — whether `docs/lab-03/plan.md` is a required contract file — was not ruled on separately. The reviewer approved with no further comment on it, so the round-3 position stands by default rather than by decision: the handout's six required files are all tracked, and the plan remains a local working document.

**PR #45 — round 1 — @YummieGG, `CHANGES_REQUESTED`, 2026-09-12 05:55**

> Thank you for the thorough documentation and the transparent explanation regarding the formatting pass and the declared deviation in commit `8c78ae5`.
>
> Overall, the mechanical formatting pass across the 67 files is exceptionally clean: zero behaviour change on product code, verified under whitespace and syntax normalisation; `biome.jsonc` correctly disables both the linter and the assist actions, while `oxlint` remains intact for client linting; and the new Formatting section in `README.md` accurately describes the setup, exclusions and commands.
>
> **Blocking finding — test failure in `e2e/evidence/report-gaps.spec.ts`.** When executing `npx playwright test e2e/evidence`, the test `Part 6 gaps: initial form + 201 proof` fails at line 120:
>
> ```text
> Error: expect(received).toBeGreaterThan(expected)
> Expected: > 1
> Received:   1
>
>   118 |   const catOptions = await page.locator("#category-select option").count();
>   119 |   const sysOptions = await page.locator("#system-select option").count();
> > 120 |   expect(catOptions).toBeGreaterThan(1);
> ```

*Response — fix commit `757038c`.* Accepted. The capture counted the Category and Related System options the moment the Create Ticket form mounted, which is before the reference fetch resolves, so it saw only the placeholder option. It passed on my machine and failed on the reviewer's purely on fetch timing, which makes it a race rather than a disagreement about what the screen should contain. The capture now waits for the reference data to arrive before counting. This is the second flaky evidence assertion the branch repaired — `8c78ae5` had already replaced a hard-coded `Page 1 of 2` with a count derived from the live `total` — and both share one cause: an evidence capture that asserted a value true only of one particular database state.

The declared deviation in `8c78ae5` was accepted rather than split out. The reviewer judged the test-only change acceptable on a formatting branch, so the commit stayed where it was and issue #36 closed with it.

**PR #45 — round 2 — @YummieGG, `APPROVED`, 2026-09-12 12:07**

> All checks and test suites are passing green, and the mechanical formatting pass strictly maintains zero behavior change on product code.
>
> Documentation and tooling configurations conform to Issue #36 acceptance criteria. Ready to merge into `lab3-staging`.
>
> **Approved!**

*Outcome.* Approved at head `757038c` and merged into `lab3-staging`, which closed issue #36 and unblocked #37 (the auth foundation). With #35 and #36 both merged, the ordering constraint that the contract and the format pass must land before any feature branch forks is satisfied, so `feature/lab3-3-auth-foundation` is the first implementation branch to fork from a formatted, contract-approved base.

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
