# AI Use — Lab 1

**Tool:** opencode (CLI coding agent) with **DeepSeek V4 Flash** (`opencode/deepseek-v4-flash-free`)

I used the opencode coding agent to help implement the TokTickIT Lab 1 vertical slice. All
specifications, code, tests, and Git operations were reviewed and approved by me before
submission. The prompts below are the actual prompts I gave the agent during this lab.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| ----------- | ------------------ | ------------- |
| Plan Lab 1 Implementation | "understand this pdf file" → followed by "Yes. and the 4 issues must be do in linear one by one and i must need my friend review pr." | The agent extracted the full lab requirements from the PDF and produced a phase-by-phase plan with the four issues in linear order and a peer-review gate after every PR. Asking for the review requirement up front saved re-planning later. |
| Set Up Full-Stack Project | "Let do it." (approving the proposed Phase 0 plan: git init, GitHub Project board with the 6 required statuses, four Issues in Backlog, then Issue 1 foundation work) | The agent set up the repository, created the Kanban project with the exact status order (Backlog → Specified → Started → PR Review → Fixing → Done) via GitHub CLI, and scaffolded client/server with Vitest + Supertest. It asked for my PostgreSQL password before wiring Prisma, which kept credentials out of the repo. |
| Reset Local PostgreSQL Password | "i think i forget it. i might 1234" (the postgres password was forgotten) | Instead of guessing endlessly, the agent edited pg_hba.conf to temporary trust auth, reset the password, and restored the config — with me doing the two admin service restarts. Clear step-by-step handoff for the privileged parts. |
| Fix Initial Commit & Ignore PDFs | "i want you to fix the first commit i think it might no commit anything first and add git ignore of pdf file" | The agent rewrote history (git filter-branch) to remove the PDF from the initial commit, added `*.pdf` to .gitignore, and force-pushed all branches. I learned that force-push rewrites what reviewers see, so the old PR was closed and a fresh PR created. |
| Restructure History & Dockerize DB | "can you delete the first commit because gitinorge and readme should init in issue 1 and can we use docker. i want you to save my prompt to md too i need it to complete ai_use.md" | The agent squashed everything into a single Issue-1 root commit so README/.gitignore originate in Issue 1, and added docker-compose.yml for PostgreSQL. Port 5433 was taken by another project, so it moved to 5434 without being asked — a good catch. |
| Implement Health Check (Issue 2) | _(to be filled in during Issue 2)_ | |
| Implement Category Feature (Issue 3) | _(to be filled in during Issue 3)_ | |
| Build and Test Check System UI (Issue 4) | _(to be filled in during Issue 4)_ | |
| Review Final Lab 1 Work | _(to be filled in during final review)_ | |

## Reflection

The biggest lesson so far: prompts that name the exact contract (statuses, branch names,
acceptance criteria, port, folder structure) produced correct output in one shot, while loose
requests (like "understand this pdf") needed a follow-up prompt to pin down the workflow (linear
issues, peer review per PR). I will keep including acceptance criteria verbatim in prompts for
Issues 2-4.
