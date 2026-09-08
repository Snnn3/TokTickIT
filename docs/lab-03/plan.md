# Lab 3 Execution Plan — TokTickIT Auth, Staff Workflow, Admin

Version: 1.1 | Updated: 2026-09-08 | Owner: student (Snnn3), drafted with AI agent
Source: `material/Lab_3_sheet.pdf` (CPE 334, Lab 3) + student-approved decisions + `specification.md` v1.0.
Tracker: GitHub issues #35–#42 on Kanban project 1 (see `.agents/AGENTS.md` + `.agents/agents/issue-tracker.md`).

## 1. Sprint Goal

Replace the dev selector with JWT-cookie auth + 3 roles, ship staff queue/detail and minimalist admin users, keep Lab 2 green as regression.

## 2. Locked Decisions (student-approved)

| ID | Decision |
|---|---|
| D1 | JWT in httpOnly cookie (`SameSite=Lax`, ~8h), secret in `server/.env` only; logout clears cookie; stateless for lab |
| D2 | bcryptjs cost 10–12; password 8–72 chars; comment/note 1–2000 trimmed |
| D3 | Single `User` model + additive migration from `RequesterUser`, ownership preserved, old table dropped after verify |
| D4 | Two tables `PublicComment` / `InternalNote` (table-level authz); append-only |
| D5 | Strict 8-status matrix; Requester only appears-resolved flag, never Resolved/Closed |
| D6 | Queue defaults mirror Lab 2 style: search number+summary, filters status/category/req-priority/IT-priority/owner, sort updatedAt desc, pageSize 10 default {5,10,20} |

## 3. Stack

Server Express 5 + Prisma 6 + PG (host 5434) + bcryptjs + jsonwebtoken + cookie-parser. Client React + Vite + Testing Library. E2E Playwright. New deps: `bcryptjs`, `jsonwebtoken`, `cookie-parser` (+ types).

## 4. Branch / Workflow Model

```text
main
 └── lab3-staging
      ├── feature/lab3-1-contract          (docs, DONE)
      ├── feature/lab3-2-refactor          (Ultracite, zero behavior change, old-lab green)
      ├── feature/lab3-3-auth-foundation
      ├── feature/lab3-4-requester-regression
      ├── feature/lab3-5-staff-queue
      ├── feature/lab3-6-staff-operations
      ├── feature/lab3-7-user-management
      └── feature/lab3-8-e2e-visual
 └── release PR: lab3-staging -> main
```

Rules: never on main/staging directly; peer-reviewed PRs; Kanban Backlog → Specified → Started → PR Review → Fixing → Done.

## 5. Issues and Deliverables

| Ticket | Title | Key deliverables | Blocked by |
|---|---|---|---|
| #35 | Engineering contract | docs/lab-03 contract files (this PR) | None |
| #36 | Refactor | Ultracite config + full format/lint, zero behavior change, all old-lab tests green | #35 |
| #37 | Auth foundation | User model + migration + seed, login/logout/me/change-password, gate middleware, tests | #36 |
| #38 | Requester regression | Remove selector, AuthContext/shell, owned tickets under JWT, comments, appears-resolved | #37 |
| #39 | Staff queue | Queue API + responsive UI + tests | #37 |
| #40 | Staff operations | Owner/priority/status + detail UI + comments/notes + tests | #39 |
| #41 | User management | Admin API + UI + guards + tests | #37 |
| #42 | E2E + visual + release | Playwright 3 specs, screenshots, staging→main green | #38, #40, #41 |

Work the frontier: any ticket whose blockers are done. Details in the linked GitHub issues.

## 6. Test-First Discipline

Per ticket: failing tests first, minimal implementation, refactor green. Server `server/tests/lab-03/`, client `client/src/__tests__/lab-03/`, E2E `e2e/lab-03/`. Every AC maps to ≥1 test; no skipped/disabled.

## 7. Submission Evidence Map (60 pts)

Parts 1–9 per labsheet §14: git flow + reviewer.md, Spec DD, Test DD + traceability + green output, ai-use.md + reflection, login/password UI, queue UI, detail UI + authz evidence, admin UI + guards, Zen Green + responsive screenshots.

## 8. Notes / Risks

* Tracker labels/projects pending `/setup-matt-pocock-skills`; local tickets are source of truth until GitHub publish.
* Stateless JWT logout documented as lab assumption.
* Seeds local-only; no secrets in repo.
