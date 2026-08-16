# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | App foundation — serves the TokTickIT API service | Pass |
| 2 | Supertest | GET /api/health returns 200, status=ok | Pass |
| 3 | Supertest | GET /api/categories returns 4 seeded categories in id order | Pass |
| 4 | Vitest | Heading renders | Pass |
| 5 | Vitest | Success state shows Online + category list | Pass |
| 6 | Vitest | Error state shows Offline + message | Pass |

Paste your passing terminal output / screenshot below.

## Server Test

![alt text](Screenshot\client_test.png)

## Client Test

![alt text](Screenshot\server_test.png)