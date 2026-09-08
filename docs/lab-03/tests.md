# Lab 3 Test Plan and Results

Version: 1.0 | Date: 2026-09-08 | Companion to `specification.md` (AC refs) and `api-spec.md`.

## 1. Test Strategy

Test DD first: this plan authored with the specification BEFORE implementation; red tests per issue, minimal implementation to green (TDD). Levels: Unit, API/integration (Supertest + test DB), UI component/style (Vitest + Testing Library + jsdom), Responsive (viewport assertions), Security/authorization (direct API + route guards), Migration/regression (seed counts + Lab 2 suite still green), E2E (Playwright chromium). Covers valid/invalid login, inactive, password boundaries, logout, role nav, queue queries, ownership, IT Priority, status matrix, comments/notes visibility, admin safety, and safe failures. Final statuses filled during execution.

## 2. Planned Tests

| ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| U-01 | Unit | BR-07 | Password policy trim + 8/72 boundaries | 7/73 rejected, 8/72 accepted | server/tests/lab-03/auth.api.test.ts (helpers) | TBD |
| U-02 | Unit | BR-13 | Transition matrix helper | Legal pass, illegal rejected | server/tests/lab-03/staff-ticket-detail.api.test.ts (helpers) | TBD |
| API-01 | API | AC-01 | Valid login | 200 user + httpOnly cookie set | server/tests/lab-03/auth.api.test.ts | TBD |
| API-02 | API | AC-02 | Invalid credentials | 401 INVALID_CREDENTIALS generic | server/tests/lab-03/auth.api.test.ts | TBD |
| API-03 | API | AC-02 | Inactive account login | 403 safe, no enumeration | server/tests/lab-03/auth.api.test.ts | TBD |
| API-04 | API | AC-03 | Change-required gate | Normal API 403 PASSWORD_CHANGE_REQUIRED until change | server/tests/lab-03/auth.api.test.ts | TBD |
| API-05 | API | AC-03 | Password change boundaries | Short/mismatch 400; valid clears flag | server/tests/lab-03/auth.api.test.ts | TBD |
| API-06 | API | AC-06 | Logout + me | Logout 204 clears; me 401 after | server/tests/lab-03/auth.api.test.ts | TBD |
| API-07 | API | AC-04 | Auth identity over client id | Other requesterId ignored, own data only | server/tests/lab-03/authorization.api.test.ts | TBD |
| API-08 | API | AC-04/05 | Requester blocked from notes/staff/admin | 403 with no content leak | server/tests/lab-03/authorization.api.test.ts | TBD |
| API-09 | API | AC-05 | Staff/Admin notes access | 200 with content | server/tests/lab-03/comments-notes.api.test.ts | TBD |
| API-10 | API | AC-08 | Queue search/filter/sort/page | Correct slice + metadata | server/tests/lab-03/staff-queue.api.test.ts | TBD |
| API-11 | API | AC-08 | Queue invalid params | 400 INVALID_QUERY per-param details | server/tests/lab-03/staff-queue.api.test.ts | TBD |
| API-12 | API | AC-09 | Claim/assign/reassign owner | Valid persists; inactive/wrong-role 422 | server/tests/lab-03/staff-ticket-detail.api.test.ts | TBD |
| API-13 | API | AC-10 | IT Priority update | Staff persists; Requester 403 | server/tests/lab-03/staff-ticket-detail.api.test.ts | TBD |
| API-14 | API | AC-11 | Status transitions | Legal 200; illegal 422; Requester Resolved 403 | server/tests/lab-03/staff-ticket-detail.api.test.ts | TBD |
| API-15 | API | AC-07 | Appears-resolved signal | Owner flag set; repeat 409 | server/tests/lab-03/comments-notes.api.test.ts | TBD |
| API-16 | API | AC-12 | Comment/note validation | Empty/over-limit 400; author/time server-set | server/tests/lab-03/comments-notes.api.test.ts | TBD |
| API-17 | API | AC-13/14 | Admin list/search/filter + create | Correct subset; dup email 409 | server/tests/lab-03/users-admin.api.test.ts | TBD |
| API-18 | API | AC-15/16 | Admin guards + reset | Self/last-admin 409; reset sets flag | server/tests/lab-03/users-admin.api.test.ts | TBD |
| API-19 | API | AC-17 | Migration + regression | Counts preserved; Lab 2 suite green | server/tests/lab-03/authorization.api.test.ts + lab-02 rerun | TBD |
| C-01 | UI | AC-01/02 | Login form | Inline errors; no submit when invalid; safe banner on 401 | client/.../lab-03/Login.test.tsx | TBD |
| C-02 | UI | AC-03 | Change-password gate | Gate renders; mismatch blocked; success continues | client/.../lab-03/ChangePassword.test.tsx | TBD |
| C-03 | UI | AC-08 | Queue wiring | Debounced search, filters, pagination rendered | client/.../lab-03/StaffTicketQueue.test.tsx | TBD |
| C-04 | UI | AC-09/10/11 | Detail ops | Owner/priority/status controls call PATCH; illegal shows message | client/.../lab-03/StaffTicketDetail.test.tsx | TBD |
| C-05 | UI | AC-12 | Comments vs notes styling | Distinct surfaces; notes hidden for Requester | client/.../lab-03/StaffTicketDetail.test.tsx | TBD |
| C-06 | UI | AC-13/14/15 | UserManagement | Search/filter/create/edit/reset + guard messages | client/.../lab-03/UserManagement.test.tsx | TBD |
| S-01 | Style | ui-spec 1 | Zen Green + badges | Tokens, focus, badge labels present | client/.../lab-03/*.test.tsx | TBD |
| R-01 | Responsive | AC-18 | No mobile scroll | scrollWidth ≤ innerWidth at 1366/768/375 | e2e/lab-03/*.spec.ts | TBD |
| E-01 | E2E | AC-01/03/06 | Auth + first-login + logout | Gate enforced; logout blocks direct access | e2e/lab-03/authentication.spec.ts | TBD |
| E-02 | E2E | AC-07/08/09/10/11/12 | Staff flow end-to-end | Queue → detail → own/prioritize/advance/comment/note | e2e/lab-03/staff-ticket-flow.spec.ts | TBD |
| E-03 | E2E | AC-13/14/15/16 | Admin flow end-to-end | Search/filter/create/edit/reset + guards + forbidden for others | e2e/lab-03/user-administration.spec.ts | TBD |

Client test folder: `client/src/__tests__/lab-03/` (normalized per Lab 2 A9). Server: `server/tests/lab-03/`. E2E: `e2e/lab-03/`.

## 3. Acceptance-Criterion Traceability

| AC | Tests |
|---|---|
| AC-01 | API-01, C-01, E-01 |
| AC-02 | API-02, API-03, C-01 |
| AC-03 | API-04, API-05, C-02, E-01 |
| AC-04 | API-07, API-08 |
| AC-05 | API-08, API-09 |
| AC-06 | API-06, E-01 |
| AC-07 | API-15, E-02 |
| AC-08 | API-10, API-11, C-03 |
| AC-09 | API-12, C-04 |
| AC-10 | API-13, C-04 |
| AC-11 | API-14, C-04 |
| AC-12 | API-16, C-05 |
| AC-13 | API-17, C-06, E-03 |
| AC-14 | API-17, C-06 |
| AC-15 | API-18, C-06, E-03 |
| AC-16 | API-18, E-03 |
| AC-17 | API-19 |
| AC-18 | S-01, R-01, E-01/02/03 |

## 4. Responsive and Visual Checklist

Per screen (Login, Change Password, Queue, Staff Detail, Users) at 1366×768, 768×1024, 375×667: tokens match; editable vs readonly distinct; public vs internal unmistakable; validation placement; button/busy states; badges consistent; no clipping/overlap/scroll; empty vs no-results vs forbidden distinct; keyboard-only pass. Evidence: `artifacts/lab-03/screenshots/*`.

## 5. Test Commands

```bash
cd server && npm test                    # full server suite
cd server && npx vitest run tests/lab-03 # Lab 3 only
cd client && npm test                    # client suite
npx playwright test e2e/lab-03           # E2E (seeded DB running)
```

Seed precondition: `docker compose up -d db`, then from `server/`: `npx prisma migrate reset --force` + `npm run db:seed` before API/E2E runs.

## 6. Final Results

TBD — fill after implementation on final `main` branch. No skipped/disabled tests allowed.

## 7. Known Limitations

TBD — record any manual-only captures (e.g. backend-down banner) here, as in Lab 2 §7.
