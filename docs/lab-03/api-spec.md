# Lab 3 API Specification — TokTickIT REST Contract

Version: 1.0 | Date: 2026-09-08 | Companion to `specification.md` (FR/BR/AC refs).

## 1. Conventions

* Base URL `/api`. JSON unless multipart stated. Timestamps ISO-8601 UTC.
* Auth: JWT in httpOnly cookie `toktickit_session` (`SameSite=Lax`, `HttpOnly`, `Secure` in prod, ~8h expiry). Sent automatically by browser via Vite proxy; no `Authorization` header, no `X-Requester-Id` (removed).
* Password hashing: bcryptjs cost 10–12. Secret `JWT_SECRET` from `server/.env` only, never committed or exposed.
* Error envelope (all non-2xx): `{ "error": { "code", "message", "details"? } }`. Safe messages only, no stacks or internals.
* Gate: if `user.mustChangePassword=true`, all endpoints except `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/logout` return `403 PASSWORD_CHANGE_REQUIRED`.
* Status summary: `200` retrieve/update, `201` created, `204` logout, `400` validation/query, `401` unauthenticated, `403` forbidden/change-required, `404` missing, `409` conflict, `410` removed attachment, `413` too large, `415` unsupported type, `422` illegal transition, `500` safe generic.

## 2. Authentication

### POST /api/auth/login [FR-16, BR-01]

* Request: `{ "email": "a@b.com", "password": "secret..." }` (email trimmed, case-insensitive lookup).
* Response `200`: `{ "user": { "id", "name", "email", "role": "REQUESTER|IT_STAFF|ADMINISTRATOR", "isActive", "mustChangePassword" } }` + `Set-Cookie: toktickit_session=<jwt>; HttpOnly; SameSite=Lax; Path=/`.
* Errors: `400 VALIDATION_FAILED` missing fields; `401 INVALID_CREDENTIALS` bad credentials or inactive account (same generic message for unknown email, wrong password, or inactive account — no enumeration); `500 UNEXPECTED`.

### POST /api/auth/logout [FR-18]

* Requires cookie (idempotent: clears even if absent).
* Response `204` + `Set-Cookie` cleared. No body.

### GET /api/auth/me [FR-18]

* Response `200`: same `user` shape as login. `401` without/invalid/expired cookie.

### POST /api/auth/change-password [FR-17, BR-07]

* Request: `{ "currentPassword"?: string, "newPassword": "...", "confirmPassword": "..." }` (`currentPassword` required unless `mustChangePassword=true` on first login).
* Rules: trimmed 8–72 chars, confirm match.
* Response `200`: `{ "changed": true, "mustChangePassword": false }` (flag cleared).
* Errors: `400` policy/confirm failure; `401` unauthenticated; `403 PASSWORD_CHANGE_REQUIRED` handled by allowing this endpoint; `500`.

## 3. Lab 2 continuation (Requester, authenticated)

All endpoints below require auth cookie + Requester role; identity comes from JWT, never from body/query. Same payloads and limits as Lab 2 (`specification.md` BR-17).

```text
GET    /api/reference/categories
GET    /api/reference/systems
POST   /api/tickets                 multipart, atomic, 201 + TKT-{year}-{seq}
GET    /api/tickets                 owned list ?search&categoryId&priority&status&sort&order&page&pageSize
GET    /api/tickets/:id             owned detail + public comments (never notes)
POST   /api/tickets/:id/attachments multipart single file
GET    /api/attachments/:id
GET    /api/attachments/:id/download  410 once removed
DELETE /api/attachments/:id          {reason 1..300}
```

* `401` no/invalid cookie; `403` wrong role or not owner (never leak other owner's existence beyond 403/404 discipline); `404` unknown id.

### POST /api/tickets/:id/appears-resolved [FR-21, BR-05]

* Requester owns ticket only. Body: `{}`.
* Response `200`: `{ "appearsResolved": true, "appearsResolvedAt": "<ts>" }`.
* Errors: `403` not owner/wrong role; `404`; `409 ALREADY_SIGNALLED` repeat; Staff/Admin use status endpoints instead.

## 4. Staff queue and detail (IT_STAFF; ADMINISTRATOR only where explicitly noted — Administrators do not perform IT Staff ticket operations by default)

Administrators do not perform IT Staff ticket operations by default; Admin access applies only where explicitly noted below (owner/priority/status, comments/notes).

### GET /api/staff/tickets [FR-22, BR-16]

Query params:

| Param | Rules |
|---|---|
| search | string ≤150, contains on number OR summary, case-insensitive |
| status | one of 8 statuses |
| categoryId | positive int |
| requestedPriority | LOW\|MEDIUM\|HIGH |
| itPriority | LOW\|MEDIUM\|HIGH |
| owner | assigned\|unassigned\|mine |
| sort | updatedAt\|createdAt\|number (default updatedAt) |
| order | asc\|desc (default desc) |
| page | int ≥1 (default 1) |
| pageSize | 5\|10\|20 (default 10) |

* Invalid value → `400 INVALID_QUERY` with per-param `details`.
* Response `200`: `{ "tickets": [{id, number, summary, categoryId, categoryName, requestedPriority, itPriority, status, owner: {id,name}|null, createdAt, updatedAt}], "page", "pageSize", "total", "totalPages" }`.
* `403` Requester.

### GET /api/staff/tickets/:id [FR-23]

* Response `200`: full ticket + `requester{id,name}` + `owner{id,name}|null` + `itPriority` + `appearsResolved*` + `attachments[]` metadata + `publicComments[]` + `internalNotes[]` (notes only for Staff/Admin).
* Errors: `400 INVALID_ID`, `403` Requester, `404`.

### PATCH /api/staff/tickets/:id/owner [FR-24, BR-10]

* Request: `{ "ownerId": number|null }` (null = unassign; id must be active IT_STAFF/ADMINISTRATOR).
* Response `200`: `{ "owner": {id,name}|null }`.
* Errors: `400` bad id, `422` inactive/wrong-role owner, `403` Requester, `404`.

### PATCH /api/staff/tickets/:id/priority [FR-24, BR-11]

* Request: `{ "itPriority": "LOW|MEDIUM|HIGH" }`.
* Response `200`: `{ "itPriority": "..." }`. Requester → `403`.

### PATCH /api/staff/tickets/:id/status [FR-24, BR-12/13]

* Request: `{ "status": "<one of 8>" }`, optional `{ "confirm": true }` for Closed/Cancelled.
* Enforces matrix in `specification.md` BR-13; illegal → `422 INVALID_TRANSITION`; missing confirm where required → `400 CONFIRM_REQUIRED`.
* Response `200`: `{ "status": "..." }`.

## 5. Comments and notes [FR-25, BR-04/14]

### GET/POST /api/staff/tickets/:id/comments (public)

* GET: `200 { "comments": [{id, body, author: {id,name}, createdAt}] }` asc by time. Requester allowed on own tickets; Staff/Admin all.
* POST: `{ "body": "1..2000 trimmed" }` → `201` same shape single. Empty/whitespace → `400`. Author/time set by backend.

### GET/POST /api/staff/tickets/:id/notes (internal, Staff/Admin only)

* Same shapes as comments. Requester → `403` with no body content. Both append-only; no PUT/DELETE in Lab 3.

## 6. Admin users [FR-26, BR-09/15]

All require ADMINISTRATOR role; non-Admin → `403`.

### GET /api/admin/users

* Query: `?search=<name-or-email substring>&role=REQUESTER|IT_STAFF|ADMINISTRATOR` (both optional).
* Response `200`: `{ "users": [{id, name, email, role, isActive}] }` name-asc. No pagination in Lab 3.

### POST /api/admin/users

* Request: `{ "name": "1..120", "email": "valid", "role": "one of 3", "isActive": bool default true, "initialPassword": "8..72" }`.
* Creates with `mustChangePassword=true`. Response `201`: user shape + flag.
* Errors: `400` validation/role; `409 EMAIL_TAKEN`.

### PATCH /api/admin/users/:id

* Request: `{ "name"?, "email"?, "role"?, "isActive"? }`.
* Guards: `409 SELF_DEACTIVATION` own deactivation; `409 LAST_ADMIN` removing last active admin; `409 EMAIL_TAKEN`.
* Response `200`: updated user shape.

### POST /api/admin/users/:id/reset-password

* Request: `{ "newPassword": "8..72" }` → sets hash + `mustChangePassword=true`.
* Response `200`: `{ "reset": true, "mustChangePassword": true }`. No email delivery.

## 7. Ownership model

Middleware verifies JWT → loads active User or `401`. Every ticket/attachment/comment/note query constrained through `{requesterId: user.id}` for Requesters, open (with role check) for Staff/Admin. Direct ids of another Requester's resources behave as `403`, never revealing note bodies or user hashes.
