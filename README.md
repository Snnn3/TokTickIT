# TokTickIT — IT Service Desk

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests.

## Lab 1 — Full-Stack Hello World Starter

Vertical slice: React UI → Express REST API → Prisma ORM → PostgreSQL.

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend  | Node.js + Express + TypeScript      |
| Database | PostgreSQL + Prisma                 |
| Testing  | Vitest + Supertest                  |

## Repository Structure

```
toktickit/
├── client/
├── server/
│   ├── prisma/
│   ├── src/
│   └── tests/
│       └── lab-01/
├── docs/
│   └── lab-01/
│       ├── ai_use.md
│       └── reviewer.md
├── docker-compose.yml
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

3. Create the database and run migrations + seed:
   ```bash
   npm --prefix server run prisma:migrate
   npm --prefix server run prisma:seed
   ```

## Run Locally

```bash
npm run dev          # starts client (Vite :5173) and server (:3000) concurrently
```

Then open http://localhost:5173 and click [Check System].

## Test

```bash
npm run test         # Vitest + Supertest suite
```

## Git Flow

- `main` — stable release branch
- `lab1-staging` — Lab 1 integration branch
- `feature/*` — individual issue branches, merged via reviewed Pull Requests
