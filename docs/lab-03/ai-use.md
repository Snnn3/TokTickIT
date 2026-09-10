# AI Use Log — Lab 3

Version: 1.8 | Date: 2026-09-10 | Companion to `specification.md`.

LLMs used:
- **Muse Spark 1.3** (accessed via opencode CLI) — Sprint 3 grilling, spec contract v1.0, and implementation/review loop
- **Claude Opus 5** (accessed via Claude Code CLI) — second grilling pass, contract v1.1–v1.7, peer-review response loop, cross-document consistency audit

> Per labsheet Part 4 this file keeps 6–10 selected key prompts in the grading table plus full verbatim details. Add summaries and final reflection as work progresses.

---

## Selected key prompts (grading table)

| # | Key prompt (verbatim) | Why selected / outcome |
|---|----------------------|------------------------|
| 1 | `read this c:\KMUTT\Y3T1\CPE334\ToktikIT\material\Lab_3_sheet.pdf . understand this lab sheet` | Lab 3 grilling kickoff; extracted 3-role increment and contract requirements |
| 2 | `can you ask me and tell me what you recommend` | Locked D1–D6: JWT httpOnly cookie + bcryptjs, single User, two tables, strict matrix, queue defaults |
| 3 | `the spec should change form lab2 it must increase` | Produced FR/BR/AC delta plan (15→26 FRs, 1→8 statuses, 9→18 endpoints) |
| 4 | `you can make the spec md now` | Wrote `docs/lab-03/specification.md` v1.0 with matrix, authz table, migration, DoD |
| 5 | `create all md must have in this lab` | Wrote `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md` |
| 6 | `understand this project and improve the plan form this pdf @material\Lab_3_sheet.pdf . the plan is already set in @docs/lab-03/plan.md .` | Second grilling pass against v1.0. Surfaced four places where the **handout contradicts itself** (§4.3 vs §4.5 on Administrator authority; the Service Actions tab vs §4.2; mockup password rules vs the length-only policy; "My Queue" vs a shared queue) that v1.0 had silently left unresolved |
| 7 | `ask me the choice question` | Redirected open-ended questioning into structured multiple-choice rounds. Produced 17 locked decisions in five rounds, including Administrator-as-superset, `appearsResolvedAt`, requester reopen, and `tokenVersion` for real session invalidation |
| 8 | `make it to spec in @docs/lab-03\ follow the lab assignment` | Rewrote the contract to v1.1 in the handout's mandated §1–§11 shape rather than a generic template; added FR-27..FR-30, BR-19..BR-28, AC-19..AC-27 |
| 9 | `review spec again. check all spec is it conflict or not .` | Consistency audit asking whether any two normative documents *disagree*, rather than whether each is correct alone. Found 10 contradictions that three prior correctness reviews had all passed, including two half-applied fixes from earlier rounds → v1.7 |
| 10 | `watch the pr#44 it is need to change fix following my friend's comment` | Drove the peer-review response loop: both `CHANGES_REQUESTED` rounds from @YummieGG addressed (v1.5, v1.6), answered on the PR, and recorded in `reviewer.md` |

---

## Prompt details

### Prompt 1–5 — Planning and contract (2026-09-08)

Verbatim prompts as in table above. Outcomes: approved Sprint 3 contract draft before implementation PRs, per labsheet §4.

*Later correction:* prompt 3's recorded targets ("15→26 FRs … 9→18 endpoints") describe the v1.0 delta plan as it stood on 2026-09-08. The merged contract grew past those figures through v1.1–v1.7 to FR-16..FR-30 and roughly 24 endpoints. The row is left as the historical record of what that prompt produced at the time rather than back-edited.

### Prompt 6–7 — Second grilling pass (2026-09-10)

The agent was asked to re-read the labsheet against the existing plan. Rather than accepting v1.0, it identified that the handout is internally inconsistent in four places and that v1.0 had resolved none of them. Prompt 7 then changed the *interaction shape*: instead of prose questions, each decision was put as a multiple-choice question with a recommended option and the trade-off stated.

Five rounds settled 17 decisions. Sixteen followed the agent's recommendation; one was overridden — the decision to let **any authenticated role file a ticket** (the recommendation had been Requester-only). That override then created a new question the agent raised unprompted (whether staff may work a ticket they filed themselves), answered by the self-service ban in BR-25.

### Prompt 8 — Contract rewrite (2026-09-10)

The `to-spec` workflow supplies a generic template; the instruction "follow the lab assignment" took priority, so the contract kept the handout's §1–§11 structure, which is what Part 2 is graded against.

### Prompt 9 — Consistency audit (2026-09-10)

The distinct value of this prompt was the *question asked*. Three earlier review rounds asked "is each document correct?" and reported clean; this asked "do any two documents disagree?" All ten findings passed the first test and failed the second. Two were fixes applied to one document and left un-applied in its twin, including one whose changelog entry claimed a fix that had only half landed.

### Prompt 10 — Peer-review loop (2026-09-10)

Peer review by @YummieGG returned `CHANGES_REQUESTED` twice. Both rounds found defects that all prior agent reviews had missed, and each round found a defect introduced by the previous round's fix. Full detail in `reviewer.md`.

### Attribution decision (2026-09-10)

Asked that commits "not make you co-author", the agent rewrote the two unpushed commits to strip `Co-Authored-By` and session trailers before pushing, and this file remains the sole disclosure channel for AI assistance in this repository. Commits and PR descriptions carry no AI attribution; authorship of the submitted work is the student's.

---

## My Reflection

> Drafted from this sprint's session record and pending my own final wording.

Using a specification agent and a coding agent turned out to be two different skills. The specification work went best when I stopped asking open questions and started asking the agent to put each decision to me as a choice with a recommendation and a stated trade-off. That one change produced seventeen locked decisions in five rounds, and it also exposed something I had not noticed on my own: the lab handout contradicts itself in four places. Section 4.3 says an Administrator is separate from IT Staff ticket work while 4.5 makes an Administrator a valid Ticket Owner; the Ticket Detail mockup shows a Service Actions tab that 4.2 explicitly excludes. My first contract draft had quietly picked one side of each without recording that a choice had even been made. Writing the reasoning down is what made those defensible.

The most useful thing I learned is that reviewing is not one activity. Three agent review rounds asked "is each document correct?" and returned clean. When I then asked a different question — "do any two documents disagree?" — it found ten contradictions that every previous pass had approved, including two cases where a fix had been applied to one document and left un-applied in its twin, with a changelog entry claiming the fix had landed. Changing the question mattered more than running the same review again.

My peer reviewer then found things all of that missed, and in a different category again. He caught a Definition of Done still gating on AC-01..AC-27 one revision after AC-28 was added, so completion could have been reported without ever verifying that requirement, and documentation asserting facts about `.env.example` and the README that simply were not true. Both of his rounds also found defects introduced by the previous round's fix. That is the part I want to remember: an agent is fast at finding what is wrong inside the frame you give it, and much weaker at noticing that the frame itself has drifted from reality. Human review is not a formality on top of AI review; it catches a different class of mistake.

The contract-first order paid for itself. Ownership rules, internal-note visibility, and the fact that a staff member filing their own ticket needed a self-service ban were all settled before a line of Lab 3 code existed. The cost is that the contract went through eight revisions before approval, and I would rather spend that in documents than in migrations. What I would do differently is stop treating a clean review as evidence of correctness, and instead decide in advance which distinct question each review round is meant to answer.
