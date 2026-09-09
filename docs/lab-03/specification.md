# Lab 3 Sprint Engineering Specification — TokTickIT Auth, Staff Workflow, Admin

Status: Approved contract draft for Sprint 3 | Version: 1.0 | Date: 2026-09-08
Companion documents: `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md` (same folder).
Prior increment: `docs/lab-02/specification.md` (FR-01..15, BR-01..25, AC-01..24). This spec **increases** from Lab 2 — nothing below repeats Lab 2 verbatim; Lab 2 behavior is preserved as regression.

## 1. Sprint Goal

Replace the temporary Development Requester selector with secure JWT-cookie authentication and role-based authorization, add the first operational IT Staff Ticket Queue and Ticket Detail workflow with ownership, IT Priority, permitted status transitions, Public Comments and Internal Notes, and add minimalist Administrator User Management — while keeping all Lab 2 Requester ticket and attachment functions working under the authenticated identity.

## 2. Stakeholder Request Interpretation

The stakeholder wants real users instead of a dev selector. Login must be secure, first-login passwords must be changed before entering the app, and every screen and API must be protected by role and ownership on the backend. Requesters keep Lab 2 capabilities but identified by login, plus public discussion and an appears-resolved signal. IT Staff need a professional queue to find work and a detail screen to own, prioritize, advance, and communicate (publicly and privately). Administrators need one simple screen to manage accounts with safety guards. Visual language stays Zen Green. Intent supplied by stakeholder; precision supplied here.

## 3. Scope

### Included

* Email + password login, logout, current-user retrieval, mandatory first-login password change.
* Role-based navigation and server-side authorization for Requester, IT Staff, Administrator (single role per user).
* Migration from `RequesterUser` + `X-Requester-Id` to `User` + JWT httpOnly cookie; removal of selector and Change Requester.
* Requester regression: create/list/detail/attachments under authenticated identity; Public Comments; appears-resolved signal.
* IT Staff Ticket Queue: search, filters, sorting, pagination, ownership/status display, open-detail action.
* IT Staff Ticket Detail: claim/reassign owner, IT Priority, permitted status changes, Public Comments, Internal Notes, attachment continuity.
* Administrator User Management: list (Name, Email, Role, Status, Edit), search by name/email, optional role filter, create/edit, one-role assignment, activate/deactivate, set new initial password with safety guards.
* Data model + REST API + Zen Green UI extensions + tests + migration/regression evidence per `api-spec.md`, `ui-spec.md`, `tests.md`.

### Excluded (per handout §4.2)

Email invitations, password-reset email, MFA, social login, SSO, self-registration, Requester-created accounts, Actions Taken, SLA/escalation/notifications, dashboards/KPI beyond queue counts, multi-tenant/departments/customer admin, production deployment changes, multiple roles per user, user deletion, bulk/import/export, account-history screens, extended profiles/photos, email delivery of secrets, unlocking/approval workflows, mandatory pagination/multi-sort/multi-filter on admin list.

## 4. Functional Requirements

* **FR-16** The app provides Login (email, password, validation, busy, safe failure) and rejects inactive accounts with the same generic failure (no enumeration detail).
* **FR-17** A user with `mustChangePassword=true` cannot enter normal screens until a valid new password is saved via Change Password (rules, confirmation, continuation).
* **FR-18** The app shell shows authenticated name + role, provides Logout that removes access, and blocks direct access after logout.
* **FR-19** Navigation shows only destinations permitted for the current role; unauthorized routes render forbidden feedback.
* **FR-20** Requester screens (Lab 2) work under authenticated identity; selector and Change Requester are removed; client-supplied identity is ignored.
* **FR-21** Requester Ticket Detail adds Public Comments list + create, and an appears-resolved action.
* **FR-22** Staff Queue lists tickets with search, filters, sorting, pagination, ownership/status/priority badges, and open-detail action with loading/empty/no-results/forbidden/failure states.
* **FR-23** Staff Ticket Detail shows grouped ticket info with only operational fields editable: owner, IT Priority, permitted status, plus Public Comments, Internal Notes (visually distinct), and existing attachments.
* **FR-24** Staff can claim ownership, assign/reassign to active Staff/Admin, set IT Priority, and perform permitted status changes with confirmations where defined.
* **FR-25** Public Comments and Internal Notes are append-only with author/time from backend; empty/whitespace rejected.
* **FR-26** Admin User Management provides list, search, optional role filter, create (name, email, one role, active flag, initial password), edit (name, email, role, activation), and set-new-initial-password, with validation/success/forbidden/safe-failure feedback.

## 5. Business Rules

* **BR-01** Only an active user with valid credentials may authenticate; failures — including inactive accounts — return generic `401 INVALID_CREDENTIALS` without distinguishing email vs password vs existence vs active status.
* **BR-02** A user with `mustChangePassword=true` is blocked from all normal APIs (`403 PASSWORD_CHANGE_REQUIRED`) except current-user, change-password, logout.
* **BR-03** Authenticated identity, never client-supplied identity, determines ownership of Requester operations.
* **BR-04** Public Comments visible to Requester, IT Staff, Administrator. Internal Notes visible only to IT Staff and Administrator; Requester access returns `403` with no content.
* **BR-05** A Requester may set appears-resolved flag but cannot set status to Resolved or Closed directly.
* **BR-06** Passwords hashed with bcrypt (cost 10–12), never stored nor returned in plaintext; initial/reset passwords set `mustChangePassword=true`.
* **BR-07** New password must be 8–72 chars after trim, plus confirmation match; initial password must meet same policy at creation.
* **BR-08** JWT in httpOnly cookie (`SameSite=Lax`, `Secure` in prod), ~8h expiry, secret from server env only, never exposed to client or repo. Logout clears cookie. Stateless for lab (no blocklist) — documented assumption.
* **BR-09** Duplicate email rejected (`409 EMAIL_TAKEN`); email uniqueness case-insensitive; invalid role rejected (`400`).
* **BR-10** Each Ticket has zero or one owner, who must be an active IT Staff or Administrator user. Ticket may start unassigned.
* **BR-11** Requested Priority immutable after creation. IT Priority initialized as copy of Requested Priority at creation/migration; editable only by IT Staff or Administrator.
* **BR-12** Required statuses: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled.
* **BR-13** Strict transition matrix enforced server-side; illegal transitions return `422 INVALID_TRANSITION`:
  * New → Open, Cancelled
  * Open → In Progress, Waiting for Requester, Cancelled
  * In Progress → Waiting for Requester, Resolved, Cancelled
  * Waiting for Requester → In Progress, Resolved
  * Resolved → Closed, Reopened
  * Closed → Reopened
  * Reopened → Open, In Progress
  * Cancelled → Reopened
  * Requester appears-resolved sets flag only, never changes status directly.
* **BR-14** Comments/Notes: trimmed 1–2000 chars; whitespace-only rejected (`400`); safe rendering (escaped, preserved whitespace, no raw HTML).
* **BR-15** Admin may not deactivate own account (`409 SELF_DEACTIVATION`); system must retain ≥1 active Administrator (`409 LAST_ADMIN`); deactivation used instead of deletion; no user deletion endpoint.
* **BR-16** Queue query: search case-insensitive substring on number OR summary (≤150 chars); filters `status, categoryId, requestedPriority, itPriority, owner=assigned|unassigned|mine`; sort `updatedAt|createdAt|number` default `updatedAt desc` + number tiebreak; `page≥1`, `pageSize∈{5,10,20}` default 10; invalid params → `400 INVALID_QUERY` with per-param details (same style as Lab 2).
* **BR-17** Lab 2 rules retained as regression: ticket number `TKT-{year}-{seq}`, summary 1–150, description 1–5000, category/system must be active, attachment type/size/count/atomicity/soft-remove semantics unchanged.
* **BR-18** Every protected endpoint distinguishes `401` unauthenticated, `403` forbidden (including change-required), `400/422` validation/transition, `404` missing, `409` conflict, `500` safe generic; existence of another user's protected resource is never leaked beyond 403/404 discipline.

### Authorization matrix

| Operation | Requester (owner only) | IT Staff | Administrator |
|---|---|---|---|
| Login/me/change-password/logout | yes | yes | yes |
| Create/list/own tickets + attachments | yes (own only) | no (use staff endpoints) | no |
| Public Comments read/create | yes (own tickets) | yes (all) | yes (all) |
| Internal Notes read/create | no (403) | yes | yes |
| Queue list / staff detail | no (403) | yes | no — Administrators do not perform IT Staff ticket operations by default |
| Claim/assign owner, IT Priority, status | no | yes | only where explicitly noted (assignable as owner per BR-10; IT Priority per BR-11) — not default ops |
| Appears-resolved signal | yes (own) | no (Staff confirms via status) | no |
| Admin user CRUD + reset-password | no (403) | no (403) | yes (+ BR-15 guards) |

## 6. UI Specification Summary

Full rules in `ui-spec.md`. Summary of increase over Lab 2:

* Delete Requester Selection screen and session chip; add Login, Change Password gate, role-aware shell (name + role badge + Logout), role-specific nav (Requester: My Tickets/Create; Staff: Queue; Admin: Users).
* Requester screens unchanged except identity source + added comments section + appears-resolved button with confirm + success states.
* New Staff Queue: toolbar (search debounced, status/category/req-priority/IT-priority/owner filters, sort, clear), desktop table (Number, Created, Summary, Category, Req Priority, IT Priority, Status, Owner, Updated, Open) vs mobile cards, pagination bar, empty vs no-results distinct.
* New Staff Detail: System/Classification/Description groups (mostly read-only), operational card (owner select, IT Priority select, status select + confirm), Public Comments vs Internal Notes visually distinct (different surface + label + warning on private), attachments carried over read/attach/download/remove.
* New Admin Users: table Name/Email/Role/Status/Edit, search input, role filter select, Create + Edit dialogs, reset-password dialog, guards messaging, responsive stack on mobile.
* Reuse Zen Green tokens, badges (add IT Priority + Role + 8 statuses), editable vs read-only shading, validation placement, focus, 44px touch targets, no horizontal scroll.

## 7. Data Changes

PostgreSQL via Prisma, additive migration preserving Ticket/Attachment data:

| Model | Key fields |
|---|---|
| User *(new)* | id PK, name VarChar(120), email VarChar(255) unique, passwordHash text, role enum, isActive bool, mustChangePassword bool, createdAt, updatedAt |
| Ticket *(evolved)* | += ownerId FK→User? (nullable), itPriority enum, appearsResolved bool default false, appearsResolvedAt?, status enum expanded to 8 values |
| PublicComment *(new)* | id PK, ticketId FK→Ticket cascade, authorId FK→User, body text (1..2000), createdAt; index (ticketId, createdAt) |
| InternalNote *(new)* | same shape as PublicComment; index (ticketId, createdAt) |
| Category, RelatedSystem, Attachment | unchanged; bytea rationale carried from Lab 2 |

Relationships: one Requester User → many submitted Tickets; one Ticket → zero/one owner (Staff/Admin); one Ticket → many PublicComments; one Ticket → many InternalNotes; each entry → one author. Enums: `Role {REQUESTER, IT_STAFF, ADMINISTRATOR}`, `TicketPriority {LOW, MEDIUM, HIGH}` reused for both priorities, `TicketStatus {NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED}`.

Migration strategy: create tables/enums, backfill Users from `RequesterUser` (role REQUESTER, initial password, `mustChangePassword=true`), add prescribed Staff/Admin seeds, set `Ticket.ownerId=null`, `itPriority=requestedPriority`, re-point `requesterId` to new User ids preserving ownership, verify counts, then drop old table. Seed idempotent via upsert on email; local-only passwords documented, no real secrets in repo.

Seed minimums: 4 active + 1 inactive Requesters, 3 active + 1 inactive Staff, 1 active Admin, realistic tickets across statuses/priorities/assigned-unassigned, sample comments/notes without sensitive data.

## 8. API Contract

Summary — exact shapes in `api-spec.md`. Base `/api`, JSON unless multipart, same error envelope as Lab 2.

```text
POST /api/auth/login                  {email,password} -> 200 {user} + httpOnly cookie
POST /api/auth/logout                 -> 204 + clear cookie
GET  /api/auth/me                     -> 200 {user}
POST /api/auth/change-password        {current?,new,confirm} -> 200 (clears flag)
GET  /api/tickets  (auth, Requester)  owned list (Lab 2 query style preserved)
POST /api/tickets (auth, Requester)   create under auth identity
GET  /api/tickets/:id ...             owned detail + comments (no notes)
POST /api/tickets/:id/appears-resolved  Requester own only -> sets flag
GET  /api/staff/tickets               queue ?search&status&categoryId&requestedPriority&itPriority&owner&sort&order&page&pageSize
GET  /api/staff/tickets/:id           full detail incl. notes for Staff/Admin
PATCH /api/staff/tickets/:id/owner    {ownerId|null} Staff/Admin only
PATCH /api/staff/tickets/:id/priority {itPriority} Staff/Admin only
PATCH /api/staff/tickets/:id/status   {status} matrix-enforced
GET/POST /api/staff/tickets/:id/comments  public (Requester own + Staff/Admin)
GET/POST /api/staff/tickets/:id/notes     Staff/Admin only
GET  /api/admin/users?search&role     Admin only
POST /api/admin/users                 {name,email,role,isActive,initialPassword}
PATCH /api/admin/users/:id            {name,email,role,isActive}
POST /api/admin/users/:id/reset-password {newPassword} -> sets flag
GET  /api/reference/categories|systems (auth; Lab 2 unchanged)
POST /api/tickets/:id/attachments + GET|DELETE /api/attachments/:id(+/download) (auth, Requester own; Lab 2 limits/atomicity/410 preserved)
```

Auth: JWT httpOnly cookie required (except login); `401` missing/invalid/expired/inactive, `403` forbidden/change-required. Statuses include `400 VALIDATION_FAILED`, `400 INVALID_QUERY`, `422 INVALID_TRANSITION`, `409 EMAIL_TAKEN/LIMIT_REACHED/ALREADY_REMOVED/LAST_ADMIN/SELF_DEACTIVATION`, `410 REMOVED` (attachments preserved).

## 9. Acceptance Criteria

Every AC maps to ≥1 test in `tests.md`.

* **AC-01** Given active credentials, when login succeeds, then httpOnly cookie is set and permitted identity + role returned.
* **AC-02** Given invalid credentials or inactive account, when login attempted, then generic `401 INVALID_CREDENTIALS` safe failure with no enumeration.
* **AC-03** Given `mustChangePassword=true`, when login succeeds, then normal screens/APIs stay blocked until valid new password saved.
* **AC-04** Given authenticated Requester, when client supplies another identity, then backend still applies auth identity and never returns another's data.
* **AC-05** Given Requester, when Internal Note endpoint requested, then `403` with no note content.
* **AC-06** Given logout, when subsequent protected call or direct navigation attempted, then `401`/login redirect.
* **AC-07** Given Requester own ticket, when appears-resolved triggered, then flag set; status never becomes Resolved/Closed by Requester.
* **AC-08** Given Staff queue query valid/invalid, when requested, then correct slice + `{page,pageSize,total,totalPages}` or `400 INVALID_QUERY`.
* **AC-09** Given Staff, when claiming/reassigning owner to inactive/non-staff or self-assign invalid, then rejection; valid assign persists.
* **AC-10** Given Staff, when setting IT Priority, then persisted; Requester attempt rejected.
* **AC-11** Given illegal status transition or Requester attempt at Resolved/Closed, when requested, then `422/403`; legal transition persists.
* **AC-12** Given empty/whitespace comment/note, when posted, then `400`; valid entries record author/time from backend and render safely.
* **AC-13** Given Admin list, when searched/filtered, then correct subset; non-Admin gets `403`.
* **AC-14** Given Admin create with duplicate email or bad role, when submitted, then `409/400`; valid create sets change-required flag.
* **AC-15** Given Admin self-deactivate or last-admin removal, when attempted, then `409` and state unchanged.
* **AC-16** Given reset-password, when next login occurs, then change-required gate enforced.
* **AC-17** Given existing Lab 2 tickets/attachments, when migrated, then ownership, numbers, and bytes preserved and Lab 2 AC-01..24 still pass as regression.
* **AC-18** Given desktop/tablet/mobile, when each Lab 3 screen renders, then responsive rules met with no horizontal scroll and distinct empty/no-results/forbidden/failure states.

## 10. Definition of Done

Product (checked before completion reported):

* [ ] All included scope implemented; no excluded feature present.
* [ ] Every AC-01..AC-18 satisfied with passing automated evidence.
* [ ] No test skipped/disabled; suite green from documented commands on `main`.
* [ ] Data model matches §7 (schema + applied migration + idempotent seed, ownership preserved).
* [ ] API conforms to `api-spec.md` (paths, shapes, cookies, authz, safe errors).
* [ ] UI conforms to `ui-spec.md` (tokens, badges, states, responsive, a11y).
* [ ] Migration/regression evidence recorded (counts before/after, Lab 2 suite still green).
* [ ] README setup/run/test instructions current.

Delivery:

* [ ] Issues on Kanban Backlog→Specified→Started→PR Review→Fixing→Done.
* [ ] Feature branches only; peer-reviewed PRs into `lab3-staging`; release PR to `main` approved.
* [ ] Contract docs version-controlled before implementation PRs.
* [ ] `reviewer.md` with reviews given/received, links, approvals.
* [ ] Submission PDF with Answer Parts 1–9 and working links.

## 11. Assumptions and Decisions

| # | Decision / Assumption | Justification |
|---|---|---|
| D1 | JWT in httpOnly cookie (not bearer header, not DB session) | Vite proxy friendly, XSS-safer than localStorage, logout = clear cookie; adequate for lab without blocklist |
| D2 | bcryptjs cost 10–12 | Pure-JS, no native build on win32, course-friendly |
| D3 | Single User model, additive migration, drop old table after verify | Preserves ownership, one identity source, satisfies BR-03 |
| D4 | Two tables for comments/notes | Table-level authz, no filter-bug leak; matches BR-04 |
| D5 | Strict matrix + appears-resolved flag | Satisfies BR-05; Staff retains resolve/close responsibility |
| D6 | Queue defaults mirror Lab 2 style | Consistent INVALID_QUERY handling, avoids mega-grid |
| D7 | Password 8–72, comment/note 1–2000 trimmed | Justified limits; enforced FE+BE; safe rendering |
| D8 | Admin minimalist (no pagination/multi-sort) | Per handout exclusion; keeps screen simple |
| D9 | Timestamps UTC, ISO-8601; seeds local-only | Consistent ordering; no secrets in repo |
