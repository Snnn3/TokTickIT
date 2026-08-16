# Lab 1 — AI Use and Reflection

**LLM/agent used:** opencode (CLI coding agent) with DeepSeek V4 Flash, plus Antigravity IDE with Claude Opus 4.6 (Thinking)

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Plan Lab 1 workflow from lab sheet PDF and set up GitHub Project board | Used the extracted lab-sheet requirements to plan Issues 1–4 in that linear order, then set up the GitHub Project board (Backlog → Specified → Started → PR Review → Fixing → Done) and created the four issues. |
| 2 | Scaffold full-stack project foundation (Phase 0 plan) | Initialized repository, created `main` and `lab1-staging` branches, and scaffolded client, server, Prisma, test frameworks, and documentation. |
| 3 | Remove committed PDF from git history and ignore `*.pdf` | Purged PDF from git history using `git filter-branch`, added `*.pdf` to `.gitignore`, and force-pushed clean branches. |
| 4 | Rebase history to start at Issue 1, dockerize PostgreSQL (port 5434), and save prompt logs | Squashed history into a clean Issue-1 root commit, created `docker-compose.yml`, updated `.env` configuration, and initialized prompt tracking. |
| 5 | Implement Issue 2: health check endpoint, Supertest test, and system check UI | Built `GET /api/health` API with test `API-01`, configured Vite proxy, and created the Check System UI with loading and status indicators. |
| 6 | Implement Issue 3: Prisma Category model, migration, and idempotent seed | Created Category schema & migration, implemented idempotent seeding using `upsert` for 4 categories, and verified no duplicates on re-run. |
| 7 | Implement Issue 4: categories endpoint, category list UI, and Vitest tests | Built `GET /api/categories` with test `API-02`, updated Check System UI to display categories, and added Vitest `UI-02` and `UI-03` tests. |
| 8 | Audit project against Lab 1 specification requirements | Verified all 4 issues against acceptance criteria, confirmed test coverage, and updated documentation in README. |

## Reflection
Planning my work beforehand made my prompts much clearer, ensuring the agent understood my exact goals and criteria. Using two different agents allowed me to cross-check the implementation against the lab specifications to ensure the work was correct. One key place I had to correct the agent was when it initially included the lab sheet PDF in git commits, requiring me to instruct it to purge the file via `git filter-branch` and clean up the commit history.