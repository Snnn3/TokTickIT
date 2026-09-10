# Lab 3 API Specification — TokTickIT REST Contract

Version: 1.6 | Date: 2026-09-10 | Companion to `specification.md` (FR/BR/AC refs).

## 1. Conventions

* Base URL `/api`. JSON unless multipart is stated. Timestamps ISO-8601 UTC.
* Auth: JWT in httpOnly cookie `toktickit_session` (`HttpOnly`, `SameSite=Lax`, `Secure` in prod, ~8h expiry). Sent automatically by the browser through the Vite proxy; no `Authorization` header, no `X-Requester-Id` (removed).
* JWT claims: `sub` (user id), `role`, `tv` (tokenVersion), `iat`, `exp`. On every authenticated request the middleware loads the user and rejects with `401` if the user is missing, inactive, or `tv` ≠ stored `tokenVersion` (BR-20).
* Password hashing: bcryptjs cost 10–12. Secret `JWT_SECRET` from `server/.env` only, never committed or exposed. `server/.env.example` documents `JWT_SECRET` and `SEED_INITIAL_PASSWORD`, and the README documents the seeded initial password itself, which is the authoritative value (BR-27); the seed uses `SEED_INITIAL_PASSWORD` when present and otherwise that documented constant, so a fresh clone still yields the credentials the E2E specs use.
* Error envelope (all non-2xx): `{ "error": { "code", "message", "details"? } }`. Safe messages only, no stack traces or internals.
* Change-password gate: if `user.mustChangePassword=true`, every endpoint except `GET /api/auth/me`, `POST /api/auth/change-password` and `POST /api/auth/logout` returns `403 PASSWORD_CHANGE_REQUIRED`.
* CSRF (BR-22): `SameSite=Lax` blocks cross-site state-changing requests; CORS is configured **without** `credentials`, so no foreign origin can cause the cookie to be sent; and every non-GET endpoint **that carries a body** requires `Content-Type: application/json` (or `multipart/form-data` where stated), rejecting simple cross-origin form posts with `415`. Requests with no body at all — logout and appears-resolved — are exempt from the content-type check, because a browser sends no `Content-Type` for a body-less `fetch` and requiring one would make logout impossible. No CSRF token is issued.
* The code for an unauthenticated request is **`AUTH_REQUIRED`**, carried over unchanged from Lab 2 so that the adapted Lab 2 suites keep asserting the same value; `INVALID_CREDENTIALS` is reserved for a failed login attempt specifically.
* Status summary: `200` retrieve/update, `201` created, `204` logout, `400` validation/query, `401` unauthenticated, `403` forbidden or change-required, `404` missing, `409` conflict, `410` removed attachment, `413` too large, `415` unsupported type, `422` illegal transition or invalid owner, `429` throttled, `500` safe generic.

## 2. Authentication

### POST /api/auth/login [FR-16, BR-01, BR-21]

* Request: `{ "email": "a@b.com", "password": "secret..." }` — email trimmed and looked up case-insensitively; the **password is trimmed with exactly the same rule used when the hash was created** (BR-07), so whitespace can never cause a permanent lockout.
* Response `200`: `{ "user": { "id", "name", "email", "role": "REQUESTER|IT_STAFF|ADMINISTRATOR", "isActive", "mustChangePassword" } }` + `Set-Cookie: toktickit_session=<jwt>; HttpOnly; SameSite=Lax; Path=/`.
* Errors: `400 VALIDATION_FAILED` missing fields; `401 INVALID_CREDENTIALS` for an unknown email, a wrong password **or** an inactive account — one identical generic message, no enumeration; `429 TOO_MANY_ATTEMPTS` after 5 failures for that email inside a 15-minute rolling window, worded identically to the credential failure; `500 UNEXPECTED`.
* A successful login clears that email's failure counter.

### POST /api/auth/logout [FR-18, FR-30, BR-20]

* Requires a cookie; idempotent (clears even if absent).
* Increments the user's `tokenVersion`, so any other outstanding cookie for that user is invalidated too.
* Response `204` + cleared `Set-Cookie`. No body.

### GET /api/auth/me [FR-18]

* Response `200`: same `user` shape as login. `401` without/invalid/expired cookie or on `tokenVersion` mismatch.

### POST /api/auth/change-password [FR-17, BR-07, BR-20]

* Request: `{ "currentPassword"?: string, "newPassword": "...", "confirmPassword": "..." }`. `currentPassword` is required unless `mustChangePassword=true` (first login).
* Rules (BR-07): trimmed, ≥8 characters, ≤72 bytes, at least one uppercase, one lowercase, one digit and one non-alphanumeric character; confirmation must match; the new password must differ from the current one.
* On success clears `mustChangePassword`, increments `tokenVersion`, and issues a fresh cookie so the caller stays signed in while other sessions die.
* Response `200`: `{ "changed": true, "mustChangePassword": false }`.
* Errors: `400 VALIDATION_FAILED` with `details[]` naming each unmet rule; `400 PASSWORD_UNCHANGED`; `403 CURRENT_PASSWORD_INVALID` when `currentPassword` is wrong — **not** `401`, which BR-18 reserves for an absent or invalid session and which any client interceptor would read as an expired login, bouncing the user out of the form mid-edit; `401` only when the cookie itself is missing or stale; `500`.

## 3. Ticket endpoints for the requesting user (any authenticated role) [FR-27]

All endpoints below require the auth cookie. Identity comes from the JWT, never from the body or query. Same payloads and limits as Lab 2 (`specification.md` BR-17). Any role may file and manage their own tickets; ownership is by `requesterId` matching the authenticated user.

```text
GET    /api/reference/categories
GET    /api/reference/systems
POST   /api/tickets                 multipart, atomic, 201 + TKT-{year}-{seq}
GET    /api/tickets                 own list ?search&categoryId&priority&status&sort&order&page&pageSize
GET    /api/tickets/:id             own detail + public comments + resolutionSummary (never notes)
POST   /api/tickets/:id/attachments multipart single file
GET    /api/attachments/:id
GET    /api/attachments/:id/download  410 once removed
DELETE /api/attachments/:id          {reason 1..300}
```

* `GET /api/tickets` now accepts any of the 8 statuses in its `status` filter (Lab 2 accepted only `NEW`).
* `401` no/invalid cookie; `403` not the requester; `404` unknown id. Another user's ticket never reveals more than the 403/404 discipline allows.

### POST /api/tickets/:id/appears-resolved [FR-21, BR-05, D3]

* The authenticated user must be the ticket's requester. Body: `{}`.
* Sets `appearsResolvedAt` to the current time. Never changes status.
* Response `200`: `{ "appearsResolvedAt": "<ts>" }`.
* Errors: `403` not the requester; `404` unknown id; `409 ALREADY_SIGNALLED` if already set and not since cleared; `422` if the ticket is Closed or Cancelled.

### POST /api/tickets/:id/reopen [FR-21, BR-13, D4]

* The authenticated user must be the ticket's requester and the ticket must be `RESOLVED`.
* Response `200`: `{ "status": "REOPENED" }`. Clears `appearsResolvedAt` **and `resolutionSummary`**, so the next resolution cycle cannot present the previous cycle's explanation as its answer.
* Errors: `403` not the requester; `404`; `422 INVALID_TRANSITION` from any status other than Resolved — notably from Closed, which is terminal.
* Staff reopen the same ticket through `PATCH /api/staff/tickets/:id/status`.

## 4. Staff queue and detail (IT_STAFF and ADMINISTRATOR)

Administrator is a superset of IT Staff here (D2). Every endpoint in this section enforces BR-25 — if the authenticated user is the ticket's own requester the request fails with `403 SELF_SERVICE_FORBIDDEN` — with **one exemption only**: `GET /api/staff/tickets/:id` succeeds and returns the ticket without its internal notes. That single exemption exists because the queue defaults to every ticket, so a staff member's own filed ticket appears there and its Open action must lead somewhere useful rather than to a forbidden page. The internal-notes read is **not** exempt.

### GET /api/staff/tickets [FR-22, BR-16]

Query params:

| Param | Rules |
|---|---|
| search | string ≤150, contains on number OR summary, case-insensitive |
| status | one of the 8 statuses |
| categoryId | positive int |
| requestedPriority | LOW\|MEDIUM\|HIGH |
| itPriority | LOW\|MEDIUM\|HIGH |
| owner | assigned\|unassigned\|mine |
| sort | updatedAt\|createdAt\|number (default updatedAt) |
| order | asc\|desc (default desc, number tiebreak) |
| page | int ≥1 (default 1) |
| pageSize | 5\|10\|20 (default 10) |

* **No filter is applied by default** — the unfiltered queue returns every ticket including unassigned ones (BR-16).
* Invalid value → `400 INVALID_QUERY` with per-param `details[] {field, parameter, issue}`, matching the Lab 2 style.
* Response `200`: `{ "tickets": [{id, number, summary, categoryId, categoryName, requestedPriority, itPriority, status, requester: {id,name}, owner: {id,name}|null, appearsResolvedAt|null, createdAt, updatedAt}], "page", "pageSize", "total", "totalPages" }`.
* `403` for a Requester-role user.

### GET /api/staff/tickets/:id [FR-23]

* Response `200`: full ticket + `requester{id,name}` + `owner{id,name}|null` + `itPriority` + `appearsResolvedAt` + `resolutionSummary` + `attachments[]` metadata + `publicComments[]` + `internalNotes[]`.
* When the caller is the ticket's own requester, the response is still `200` but `internalNotes` is omitted entirely and the payload carries `"selfService": true` so the client can render the read-only explanation panel instead of the operational card.
* Errors: `400 INVALID_ID`; `403` Requester role; `404`.

### GET /api/staff/assignees [FR-24, BR-10]

* Returns the users who may legally be set as a Ticket Owner: `{ "assignees": [{id, name, role}] }`, active IT Staff and Administrators only, name-ascending.
* Exists because the Owner select on the staff detail screen is used by IT Staff, who cannot call `GET /api/admin/users` — that route is Administrator-only, so without this endpoint FR-24's reassign flow would be unimplementable for the very role that performs it.
* `403` for a Requester-role user.

### PATCH /api/staff/tickets/:id/owner [FR-24, BR-10, BR-23]

* Request: `{ "ownerId": number|null }` — null unassigns; an id must belong to an **active** IT_STAFF or ADMINISTRATOR user.
* **Claim side effect (BR-23):** if the ticket was unowned and its status was `NEW`, the same operation also sets status to `OPEN`. Reassignment, unassignment and claims from any other status leave status untouched.
* Response `200`: `{ "owner": {id,name}|null, "status": "<current status>" }`.
* Errors: `400` bad id; `422 INVALID_OWNER` inactive or wrong-role target; `403`; `404`.

### PATCH /api/staff/tickets/:id/priority [FR-24, BR-11]

* Request: `{ "itPriority": "LOW|MEDIUM|HIGH" }`.
* Response `200`: `{ "itPriority": "..." }`. Requester role → `403`. Requested Priority is never writable.

### PATCH /api/staff/tickets/:id/status [FR-24, FR-28, BR-13, BR-26]

* Request: `{ "status": "<one of 8>", "resolutionSummary"?: "1..2000" }`.
* Enforces the transition matrix in `specification.md` BR-13. Confirmation for `CLOSED` and `CANCELLED` is a **client-side dialog only** (`ui-spec.md` §7) — the server takes no `confirm` field, because a server-side flag with no business rule, acceptance criterion or test behind it would fail requests no test predicted.
* A transition to `RESOLVED` requires a non-empty trimmed `resolutionSummary`, either supplied in this request or already stored on the ticket.
* Any successful status transition clears `appearsResolvedAt`.
* Response `200`: `{ "status": "...", "resolutionSummary": "..."|null }`.
* Errors: `422 INVALID_TRANSITION` illegal target or a transition out of a terminal status; `400 RESOLUTION_SUMMARY_REQUIRED`; `403` Requester role, or own-requested ticket per BR-25; `404`.

## 5. Comments and notes [FR-25, BR-04, BR-14]

### GET/POST /api/tickets/:id/comments (public)

This route sits under `/api/tickets/`, **not** `/api/staff/`, because the ticket's own requester uses it whatever their role — putting it behind the staff prefix would have made the staff role check and the requester's core commenting flow contradict each other.

* GET `200`: `{ "comments": [{id, body, author: {id, name, role}, createdAt}] }` ascending by time. The ticket's requester is allowed on their own ticket regardless of role; IT Staff and Administrators on all tickets.
* POST: `{ "body": "1..2000 trimmed" }` → `201` with the single created comment. Empty or whitespace-only → `400`. Author and timestamp are always set by the backend, never accepted from the client.
* Public Comments are exempt from BR-25 — a staff member who filed a ticket still comments on it as its requester.

### GET/POST /api/staff/tickets/:id/notes (internal, IT Staff and Administrator only)

* Same shapes as comments. A Requester-role user receives `403` carrying the standard error envelope and **no note data of any kind** — the envelope is still required (§1), but the body must never reveal whether notes exist, how many there are, or any fragment of their content. A staff user who is the ticket's own requester also receives `403` per BR-25.
* Both collections are append-only; no PUT or DELETE exists in Lab 3.

## 6. Admin users [FR-26, BR-09, BR-15, BR-24]

All endpoints require the ADMINISTRATOR role; any other role → `403`.

### GET /api/admin/users

* Query: `?search=<name-or-email substring>&role=REQUESTER|IT_STAFF|ADMINISTRATOR` (both optional, case-insensitive search).
* Response `200`: `{ "users": [{id, name, email, role, isActive, ownedOpenTicketCount}] }` sorted name-ascending. No pagination in Lab 3 (excluded by §8.5).
* `ownedOpenTicketCount` is the number of non-terminal Tickets that user currently owns. It is present so the deactivation confirmation dialog can name the count **before** the change is made (`ui-spec.md` §8); the post-cascade `unassignedTicketCount` below reports what actually happened.

### POST /api/admin/users

* Request: `{ "name": "1..120", "email": "valid", "role": "one of 3", "isActive": bool default true, "initialPassword": "per BR-07" }`.
* The email is trimmed and lower-cased before storage and before the uniqueness check (BR-09), so `Foo@x.com` collides with an existing `foo@x.com` and returns `409 EMAIL_TAKEN` rather than creating a second row the case-insensitive login lookup would then match twice.
* Creates the user with `mustChangePassword=true` and `tokenVersion=0`. Response `201`: the user shape plus the flag. The password is never echoed.
* Errors: `400 VALIDATION_FAILED` (including each unmet password rule); `409 EMAIL_TAKEN`.

### PATCH /api/admin/users/:id

* Request: `{ "name"?, "email"?, "role"?, "isActive"? }`.
* **Deactivation cascade (BR-24):** setting `isActive:false` unassigns that user from every non-terminal ticket they own and increments their `tokenVersion`, ending their sessions immediately.
* Guards: `409 SELF_DEACTIVATION` deactivating your own account; `409 LAST_ADMIN` deactivating or role-changing the last active Administrator; `409 EMAIL_TAKEN`.
* Response `200`: the updated user shape plus `{ "unassignedTicketCount": n }` when a cascade occurred.

### POST /api/admin/users/:id/reset-password

* Request: `{ "newPassword": "per BR-07" }` → sets the hash, sets `mustChangePassword=true`, increments `tokenVersion`.
* Response `200`: `{ "reset": true, "mustChangePassword": true }`. No email delivery (excluded by §4.2).

## 7. Ownership and authorization model

Middleware verifies the JWT, loads the active User, checks `tokenVersion`, then applies the change-password gate. Requester-scoped queries are constrained through `{ requesterId: user.id }`; staff-scoped queries are open but role-checked and then BR-25-checked. Direct ids belonging to another user behave as `403`/`404` and never reveal note bodies, password hashes, or `tokenVersion` values. No endpoint returns `passwordHash` or `tokenVersion` in any response shape.
