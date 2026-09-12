# TokTickIT — IT Service Desk

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests.

## Lab 1 — Full-Stack Hello World Starter

Vertical slice: React UI → Express REST API → Prisma ORM → PostgreSQL.

The app shows the app name and a **[Check System]** button. When clicked, it calls the real API and displays the system status and the four supported request categories loaded from PostgreSQL.

**Implemented (Lab 1):**

- `GET /api/health` health check endpoint
- Prisma `Category` model with migration and idempotent seed (Account and Access, Hardware, Software, Network)
- `GET /api/categories` endpoint reading categories from PostgreSQL through Prisma
- React page with loading, success, and error states (Bootstrap styled)
- Automated tests: Supertest (API) + Vitest (UI)

## Tech Stack

| Layer    | Technology                            |
| -------- | ------------------------------------- |
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend  | Node.js + Express + TypeScript        |
| Database | PostgreSQL (Docker) + Prisma          |
| Testing  | Vitest + Supertest                    |

## Repository Structure

```
toktickit/
├── client/
│   ├── src/
│   └── tests/
│       └── lab-01/
├── server/
│   ├── prisma/
│   ├── src/
│   └── tests/
│       └── lab-01/
├── docs/
│   └── lab-01/
│       ├── ai_use.md
│       ├── reviewer.md
│       └── tests.md
├── docker-compose.yml
├── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20+
- Docker (PostgreSQL runs in a container via docker-compose)
- npm

## Setup

1. Start the PostgreSQL database with Docker:
   ```bash
   docker compose up -d db
   ```

2. Clone the repository and install dependencies:
   ```bash
   npm install --prefix client
   npm install --prefix server
   ```

3. Configure the backend environment:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your PostgreSQL credentials
   ```

4. Create the database and run migrations + seed:
   ```bash
   npm --prefix server run prisma:migrate
   npm --prefix server run prisma:seed
   ```

## Run Locally

```bash
npm run dev          # starts client (Vite :5173) and server (:3000) concurrently
```

Then open http://localhost:5173 and click [Check System]. The Vite dev server proxies `/api` requests to the backend at `http://localhost:3000`.

## REST API

| Endpoint        | Response                                        |
| --------------- | ----------------------------------------------- |
| `GET /api/health`    | `200 {"status":"ok","service":"TokTickIT API"}` |
| `GET /api/categories` | `200 [{"id":1,"name":"Account and Access"},{"id":2,"name":"Hardware"},{"id":3,"name":"Software"},{"id":4,"name":"Network"}]` |

## Test

```bash
npm run test         # runs server + client test suites
```

See `docs/lab-01/tests.md` for the full test list (API-01, API-02, UI-01, UI-02, UI-03).

## Formatting

The whole repository - server, client, `e2e/` and the root config files - is formatted by
[Ultracite](https://www.ultracite.ai/), a preset over the [Biome](https://biomejs.dev/)
formatter. Configuration lives in `biome.jsonc` at the repository root.

```bash
npm run check   # verify formatting; fails if any file is unformatted
npm run fix     # reformat in place
```

Biome is used as a formatter only. Its linter and its assist actions (import ordering, key and
attribute sorting) are disabled in `biome.jsonc`, so the tool does not rewrite code for a lint
rule and does not reorder source. One exception is already in the history: `ultracite init`
sorted the keys of the three `package.json` files during setup, before assist was switched off.
Values are unchanged and npm ignores key order, but the sort is visible in the diff. The client
keeps `oxlint` as its linter:

```bash
npm run lint --prefix client
```

Generated, vendored and binary paths are excluded from formatting: `node_modules/`, `dist/`,
the npm lockfiles, `artifacts/`, `client/public/` and the Prisma migration SQL. Every
hand-written file in a language Biome formats is inside the formatter, including the Playwright
specs under `e2e/`. Biome formats neither Markdown nor the Prisma schema language, so the
documents under `docs/`, this README and `server/prisma/schema.prisma` are outside it and are
kept tidy by hand.

## Git Flow

- `main` — stable release branch
- `lab1-staging` — Lab 1 integration branch
- `feature/*` — individual issue branches, merged via reviewed Pull Requests

All work happens on feature branches and enters `main` through `lab1-staging`. Peer review is mandatory for every Pull Request (see `docs/lab-01/reviewer.md`).

## Lab 2 — Requester Ticket Flow

Requester-scoped ticket creation, listing, detail view, and attachment lifecycle. Lab 2 shipped
with identity carried by an `X-Requester-Id` header; from Lab 3 onward the same screens and
endpoints run under a real session cookie, as the Lab 3 section below describes.

### Prerequisites

- Node.js 20+, npm
- Docker (PostgreSQL container `toktickit-db` via `docker compose up -d db`, host port 5434)

### Setup

```bash
docker compose up -d db
npm install --prefix server
npm install --prefix client
cp server/.env.example server/.env
npm --prefix server run prisma:migrate
npm --prefix server run db:seed
```

Fresh/reset dev DB (documented precondition before test runs):

```bash
cd server && npx prisma migrate reset --force && npm run db:seed
```

Seed provides 4 categories, 7 systems, and 4 active + 1 inactive requesters.

### Run Locally

```bash
npm run dev --prefix server   # Express API at http://localhost:3000
npm run dev --prefix client   # Vite UI at http://localhost:5173 (proxies /api to :3000)
```

### Lab 3 - Authentication and roles (in progress)

Lab 3 replaces the development requester selector with real email-and-password
authentication and three roles. The engineering contract in `docs/lab-03/` is the source of
truth. **The auth foundation has landed, so the Lab 2 sections below are superseded where they
describe identity:**

- Identity is a signed, http-only session cookie, not the `X-Requester-Id` header. Every Lab 2
  endpoint keeps its path and payload; only how the caller is identified changed.
- `RequesterUser` became `User`, carrying a role, an activation flag, a forced-password-change
  flag and a token version. `GET /api/requesters` and the Requester Selection screen are gone.
- Every screen has a real, deep-linkable address behind a route guard.
- `e2e/lab-02/` is retired along with its evidence-capture specs, all of which drove the
  selector; browser regression moves to `e2e/lab-03/` in a later slice. See `e2e/README.md`.
  The Lab 2 figures they produced remain committed under `artifacts/lab-02/`.
- The staff queue, staff detail and administrator screens arrive in later slices. Their routes
  and role guards exist and are enforced; the screens themselves are placeholders.

### Setup (Lab 3)

```bash
docker compose up -d db
npm install --prefix server
npm install --prefix client
cp server/.env.example server/.env   # then set your own JWT_SECRET
npm --prefix server run prisma:migrate
npm --prefix server run db:seed
```

`JWT_SECRET` signs the session cookie and must be set, or the server refuses to issue one.
Generate a local value with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Run order matters.** The migration cannot run bcrypt, so it carries existing development
requesters over with a placeholder password hash that nothing can match. `db:seed` writes the
real hash. Migrate, then seed.

Fresh or reset development database:

```bash
cd server && npx prisma migrate reset --force && npm run db:seed
```

The seed is idempotent and reaches the minimums the specification requires: four active and one
inactive Requester, three active and one inactive IT Staff member, and two active
Administrators. Re-running it restores every account to the documented initial password and
bumps each token version, which signs out any session issued beforehand.

### Seeded local-development credentials

Every seeded and migrated account signs in with the initial password **`ChangeMe!2026`** and is
forced to change it at first sign-in. This value is a documented lab convenience for local
development only. It is never a real secret, and `SEED_INITIAL_PASSWORD` overrides it.

| Role | Sign-in address |
| ---- | --------------- |
| Requester | `anucha.wongchai@example.com` (plus three more active, one inactive) |
| IT Staff | `kittipong.saelim@example.com` (plus two more active, one inactive) |
| Administrator | `apinya.ratchada@example.com`, `thanakorn.wattana@example.com` |

A password must be at least 8 characters after trimming, at most 72 bytes, and contain an upper
case letter, a lower case letter, a digit and a special character. The change-password screen
shows the rules as a checklist that updates as you type.

Each role lands on its own screen after signing in: a Requester on `/tickets`, IT Staff on
`/staff/queue`, and an Administrator on `/admin/users`.

### Authentication API (Lab 3)

| Endpoint | Description |
| -------- | ----------- |
| `POST /api/auth/login` | `{email, password}` returns `200` with the user plus an http-only session cookie. `401 INVALID_CREDENTIALS` for an unknown email, a wrong password **or** an inactive account, worded identically in all three cases. `429 TOO_MANY_ATTEMPTS` after 5 failures for one address inside 15 minutes, worded the same again |
| `POST /api/auth/logout` | Always `204` with a cleared cookie, with or without a session. Bumps the token version, so the previous cookie is refused if replayed |
| `GET /api/auth/me` | `200` with the current user; `401 AUTH_REQUIRED` without a valid session |
| `POST /api/auth/change-password` | `{currentPassword?, newPassword, confirmPassword}` returns `200`. The current password is required except on a first login. A wrong one answers `403 CURRENT_PASSWORD_INVALID`, not `401`. Success clears the forced-change flag, bumps the token version and re-issues the cookie, so other devices are signed out and this one is not |

While an account carries an initial password, every endpoint except those three answers
`403 PASSWORD_CHANGE_REQUIRED`. An unauthenticated request to any protected endpoint answers
`401 AUTH_REQUIRED`, the same code Lab 2 used.

### Migration evidence

`server/prisma/migration-evidence/` holds the procedure and the recorded run proving the
migration preserved every ticket, ticket number, attachment byte and requester relationship.

### Test (Lab 3)

```bash
cd server && npm test                    # 73 tests, 10 files (Prisma stubbed, no DB needed)
cd server && npx vitest run tests/lab-03 # Lab 3 only
cd server && npx vitest run tests/lab-02 # Lab 2 regression
cd client && npm test                    # 73 tests, 13 files
npm run lint --prefix client             # oxlint
npm run check                            # repository formatting
```

### REST API (Lab 2 paths, now behind the session cookie)



All endpoints below require the session cookie from `POST /api/auth/login`; a missing, expired
or invalidated session returns `401 AUTH_REQUIRED`, and an account still carrying an initial
password returns `403 PASSWORD_CHANGE_REQUIRED`. Ownership is the authenticated user, never a
value the client sends. Errors use the envelope `{ "error": { "code", "message", "details" } }`.
Lab 1 endpoints (`GET /api/health`, `GET /api/categories`) remain available without a session,
because the Lab 1 suite asserts that and BR-28 keeps every Lab 1 test unchanged.

| Endpoint | Description |
| -------- | ----------- |
| `GET /api/reference/categories` | List active categories (name asc) |
| `GET /api/reference/systems` | List active related systems (name asc) |
| `POST /api/tickets` | Create ticket with optional attachments (`multipart/form-data`), returns `201` with `TKT-{year}-{seq}` number |
| `GET /api/tickets` | Owned paginated list with search/filter/sort (`search`, `categoryId`, `priority`, `status`, `sort`, `order`, `page`, `pageSize` 5/10/20). `status` now accepts any of the eight values, not just `NEW` |
| `GET /api/tickets/:id` | Owned ticket detail with attachment metadata (`403` cross-requester, `404` unknown) |
| `POST /api/tickets/:id/attachments` | Add one attachment to an owned ticket (`201`; `409 LIMIT_REACHED` past 5 active) |
| `GET /api/attachments/:id` | Owned attachment metadata |
| `GET /api/attachments/:id/download` | Stream active attachment bytes (`410 REMOVED` after soft-remove) |
| `DELETE /api/attachments/:id` | Soft-remove with required `reason` 1..300 chars (`409 ALREADY_REMOVED` on repeat) |

Upload rules: jpeg/png/webp/pdf only, each max 5 MB, max 5 files per ticket; creation is all-or-nothing.

### Screens

- Login and the mandatory Change Password gate with a live rule checklist (Lab 3)
- Authenticated shell: role-filtered navigation, the signed-in name with a role badge, Logout
- Create Ticket (read-only System strip, Classification, Details, Attachments, Submit/Cancel)
- My Tickets (search, category/priority/status filters, sort, pagination, empty vs no-results states)
- Ticket Detail + Attachment section (read-only ticket card, add/download/soft-remove with reason)

Screenshots: `artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/{desktop,tablet,mobile}.png` (viewports 1366x768, 768x1024, 375x667); selector states in `artifacts/lab-02/screenshots/requester-selection/`; submission proofs (Parts 6/7/8) in `artifacts/lab-02/evidence/`.

### Test

The Lab 2 server and client suites still run, adapted to the session cookie; see the Lab 3 test
commands above. The Lab 2 Playwright suite and its evidence captures are retired, because they
drove the selector end to end. See `e2e/README.md`. The figures they produced remain under
`artifacts/lab-02/`.

Seed precondition: rebuild the dev DB with `npx prisma migrate reset --force` plus
`npm run db:seed` (from `server/`, container `toktickit-db` running) before API runs. Lab 1
`API-02.categories` fails only when this seed step is skipped, which is a documented
precondition, not a code defect.

### Docs

- `docs/lab-02/specification.md` — scope, BR/AC-01..AC-24, Definition of Done
- `docs/lab-02/api-spec.md` — REST contract (paths, payloads, statuses, ownership)
- `docs/lab-02/ui-spec.md` — Zen Green tokens, components, screens, responsive rules
- `docs/lab-02/tests.md` — test plan, AC traceability, commands, final results
- `docs/lab-02/plan.md` — delivery plan and submission evidence map
- `docs/lab-02/reviewer.md` — reviews given/received
- `docs/lab-02/ai-use.md` — AI use log
