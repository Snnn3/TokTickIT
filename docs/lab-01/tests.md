# Tests — Lab 1

All tests are run with `npm test` at the repository root (Vitest for API and UI tests,
Supertest for HTTP endpoints).

| Test ID | Test File | Tool | Test Description |
| ------- | --------- | ---- | ---------------- |
| API-01 | `server/tests/lab-01/API-01.health.test.ts` | Supertest | Health endpoint returns 200 and expected JSON |
| API-02 | `server/tests/lab-01/API-02.categories.test.ts` | Supertest | Categories endpoint returns the four seeded categories |
| UI-01 | `client/tests/lab-01/UI-01.heading-renders.test.tsx` | Vitest | TokTickIT heading renders |
| UI-02 | `client/tests/lab-01/UI-02.check-system.test.tsx` | Vitest | Loading state changes to category list |
| UI-03 | `client/tests/lab-01/UI-03.error-state.test.tsx` | Vitest | API failure displays a useful error message |
