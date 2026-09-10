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
attribute sorting) are disabled in `biome.jsonc`, so the tool never rewrites code for a lint
rule and never reorders source. The client keeps `oxlint` as its linter:

```bash
npm run lint --prefix client
```

Generated and binary paths are excluded from formatting: `node_modules/`, `dist/`, the npm
lockfiles, `artifacts/`, `e2e/evidence/` and the Prisma migration SQL.

## Git Flow

- `main` — stable release branch
- `lab1-staging` — Lab 1 integration branch
- `feature/*` — individual issue branches, merged via reviewed Pull Requests

All work happens on feature branches and enters `main` through `lab1-staging`. Peer review is mandatory for every Pull Request (see `docs/lab-01/reviewer.md`).

## Lab 2 — Requester Ticket Flow

Requester-scoped ticket creation, listing, detail view, and attachment lifecycle. Test identity is carried by the `X-Requester-Id` header (real auth arrives in Lab 3).

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

### Lab 3 status (in progress)

Lab 3 replaces the development requester selector with real authentication. The engineering
contract is in `docs/lab-03/` and is the source of truth; **the Lab 2 sections below describe
the currently shipped behaviour and are superseded as each Lab 3 slice merges**:

- Identity moves from the `X-Requester-Id` header to a signed, http-only session cookie, so
  every Lab 2 endpoint below keeps its path and payload but changes how the caller is identified.
- `GET /api/requesters` and the Requester Selection screen are removed.
- `e2e/lab-02/` is retired; browser regression moves to `e2e/lab-03/`.
- New environment keys `JWT_SECRET` and `SEED_INITIAL_PASSWORD` are documented in
  `server/.env.example`.

**Seeded local-development credentials (Lab 3).** Every seeded and migrated account uses the
initial password **`ChangeMe!2026`** and is forced to change it at first sign-in. This value is
a documented lab convenience for local development only — it is never a real secret, and it is
overridden by `SEED_INITIAL_PASSWORD` when that variable is set. Seeded sign-in addresses follow
the pattern shown by `npm run db:seed` output.

Run and test commands for Lab 3 are added to this README as each slice lands; until then the
Lab 2 commands below are the ones that work.

### REST API (Lab 2, superseded by Lab 3 auth)

All endpoints below require `X-Requester-Id: <active requester id>`; missing/unknown/inactive returns `401 AUTH_REQUIRED`. Errors use the envelope `{ "error": { "code", "message", "details" } }`. Lab 1 endpoints (`GET /api/health`, `GET /api/categories`) remain available.

| Endpoint | Description |
| -------- | ----------- |
| `GET /api/requesters` | List active requesters for the selector (name asc) |
| `GET /api/reference/categories` | List active categories (name asc) |
| `GET /api/reference/systems` | List active related systems (name asc) |
| `POST /api/tickets` | Create ticket with optional attachments (`multipart/form-data`), returns `201` with `TKT-{year}-{seq}` number |
| `GET /api/tickets` | Owned paginated list with search/filter/sort (`search`, `categoryId`, `priority`, `status`, `sort`, `order`, `page`, `pageSize` 5/10/20) |
| `GET /api/tickets/:id` | Owned ticket detail with attachment metadata (`403` cross-requester, `404` unknown) |
| `POST /api/tickets/:id/attachments` | Add one attachment to an owned ticket (`201`; `409 LIMIT_REACHED` past 5 active) |
| `GET /api/attachments/:id` | Owned attachment metadata |
| `GET /api/attachments/:id/download` | Stream active attachment bytes (`410 REMOVED` after soft-remove) |
| `DELETE /api/attachments/:id` | Soft-remove with required `reason` 1..300 chars (`409 ALREADY_REMOVED` on repeat) |

Upload rules: jpeg/png/webp/pdf only, each max 5 MB, max 5 files per ticket; creation is all-or-nothing.

### Screens

- Requester Selection (dev-only selector, not a login screen)
- Create Ticket (read-only System strip, Classification, Details, Attachments, Submit/Cancel)
- My Tickets (search, category/priority/status filters, sort, pagination, empty vs no-results states)
- Ticket Detail + Attachment section (read-only ticket card, add/download/soft-remove with reason)

Screenshots: `artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/{desktop,tablet,mobile}.png` (viewports 1366x768, 768x1024, 375x667); selector states in `artifacts/lab-02/screenshots/requester-selection/`; submission proofs (Parts 6/7/8) in `artifacts/lab-02/evidence/`.

### Test

```bash
cd server && npm test                    # full server suite
cd server && npx vitest run tests/lab-02 # Lab 2 only: 31 tests, 6 files
cd client && npm test                    # 42 tests, 11 files
npx playwright install chromium          # first time only
npx playwright test e2e/lab-02           # 3 tests (E-01, E-02, R-01 & E-03) - retired once Lab 3 lands, superseded by e2e/lab-03
npx playwright test e2e/evidence         # submission evidence captures (report figures)
```

Seed precondition: rebuild the dev DB with `npx prisma migrate reset --force` plus `npm run db:seed` (from `server/`, container `toktickit-db` running) before API/E2E runs. Lab 1 `API-02.categories` fails only when this seed step is skipped, which is a documented precondition, not a code defect.

### Docs

- `docs/lab-02/specification.md` — scope, BR/AC-01..AC-24, Definition of Done
- `docs/lab-02/api-spec.md` — REST contract (paths, payloads, statuses, ownership)
- `docs/lab-02/ui-spec.md` — Zen Green tokens, components, screens, responsive rules
- `docs/lab-02/tests.md` — test plan, AC traceability, commands, final results
- `docs/lab-02/plan.md` — delivery plan and submission evidence map
- `docs/lab-02/reviewer.md` — reviews given/received
- `docs/lab-02/ai-use.md` — AI use log
