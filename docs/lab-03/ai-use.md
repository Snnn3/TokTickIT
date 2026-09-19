# AI Use Log — Lab 3

Version: 2.6 | Date: 2026-09-19 | Companion to specification.md.

LLMs used:
- Muse Spark 1.3 (accessed via opencode CLI) — planning, contract drafting and implementation support
- Claude Opus 5 (accessed via Claude Code CLI) — consistency checks, review responses and verification support
- OpenAI Codex (GPT-5) — implementation, browser-test evidence, documentation updates and Git workflow support

Only the six selected key prompts are retained here, following the Lab 2
grading-table format. Historical session detail remains recoverable from Git
history.

## Selected key prompts (grading table — 6 prompts)

| # | Key prompt (verbatim) | Why selected / outcome |
|---|----------------------|------------------------|
| 1 | read this c:\KMUTT\Y3T1\CPE334\ToktikIT\material\Lab_3_sheet.pdf . understand this lab sheet | Started the Lab 3 requirements and delivery workflow from the handout. |
| 2 | can you ask me and tell me what you recommend | Turned open design questions into recommended choices with explicit trade-offs and locked decisions. |
| 3 | make it to spec in @docs/lab-03\ follow the lab assignment | Produced the Lab 3 contract documents in the handout's required structure. |
| 4 | review spec again. check all spec is it conflict or not . | Performed a cross-document consistency audit and resolved contradictions across the contract set. |
| 5 | c:\KMUTT\Y3T1\CPE334\ToktikIT\.reviews\review-feature-lab3-7-user-management.md coder implement following this | Applied peer-review findings to the user-management slice and verified the resulting PR before merge. |
| 6 | coder answer my peer comment thank you to him and move kanban close issue#41 then implement following the issue#42 not open pr | Thanked the reviewer, closed #41, updated Kanban, and implemented #42 with authenticated E2E journeys, responsive evidence and no PR opened. |

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
