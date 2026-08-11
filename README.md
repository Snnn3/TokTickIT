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

## Git Flow

- `main` — stable release branch
- `lab1-staging` — Lab 1 integration branch
- `feature/*` — individual issue branches, merged via reviewed Pull Requests

All work happens on feature branches and enters `main` through `lab1-staging`. Peer review is mandatory for every Pull Request (see `docs/lab-01/reviewer.md`).
