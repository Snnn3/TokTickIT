# Lab 3 Sprint Engineering Specification — TokTickIT Auth, Staff Workflow, Admin

Status: **Draft — pending peer approval on PR #44** | Version: 1.8 | Date: 2026-09-10
Companion documents: `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md` (same folder).
Prior increment: `docs/lab-02/specification.md` (FR-01..15, BR-01..25, AC-01..24). This spec **increases** from Lab 2 — nothing below repeats Lab 2 verbatim; Lab 2 behavior is preserved as regression.

**Identifier convention:** Lab 3 continues the FR sequence (FR-16 onward) but restarts BR and AC numbering at 01, so `BR-04` and `AC-17` name different rules in the two increments. Throughout the Lab 3 documents an unqualified `BR-nn` or `AC-nn` always means the Lab 3 rule; a Lab 2 rule is always written out as `Lab 2 BR-nn`.

**Changes in v1.1** (resolving contradictions in the handout and gaps found in review): Administrator is now a superset of IT Staff (D2); `appearsResolved` boolean replaced by a clearable timestamp (D3); Requester may reopen their own Resolved ticket (D4); session invalidation via `tokenVersion` (D5); password complexity per the §8.1 mockup (D6); Resolution Summary required to resolve (D11); ticket filing opened to all roles with a self-service ban (D18); plus login throttling, CSRF posture, claim-auto-open, and the deactivation cascade.

**Changes in v1.2** (addressing peer-review findings F1–F11 against v1.1): Public Comments moved off the `/api/staff/` prefix so a requester of any role can reach them; BR-25 narrowed to mutations so the staff detail of a self-filed ticket still loads; BR-28 added to retire — rather than skip — the Lab 2 tests that assert removed behaviour; BR-10 and BR-24 reconciled over terminal tickets; password trim made symmetric between set and verify; the untested server-side `confirm` flag dropped; a reset seam specified for the login throttle; AC-27 added so FR-19 is actually verified; the seeded-password source made single and authoritative; email case-normalisation added to the migration; and BR-19 given real content instead of a placeholder.

**Changes in v1.3** (addressing second-round review findings F12–F24 against v1.2): the v1.2 BR-25 wording was itself wrong — "mutating endpoints only" would have let a staff member read the Internal Notes on a Ticket they filed, so the exemption is now scoped to the staff-detail read alone. The BR-28 retirement list was incomplete and is replaced by a three-group disposition (retired / adapted / unchanged) covering every Lab 2 file. A `GET /api/staff/assignees` endpoint is added, without which IT Staff had no way to populate the Owner select, since the user list is Administrator-only. Case-insensitive email uniqueness is now enforced on the write paths rather than only during migration. `AUTH_REQUIRED` is pinned as the unauthenticated error code so the adapted Lab 2 suites keep passing. `ownedOpenTicketCount` is added to the user list so the deactivation dialog can name a count before the change. The stray `confirm?` field is removed from the §8 summary, the queue index is corrected to match the unfiltered default, the Requester landing route is defined, and an identifier convention resolves the Lab 2 / Lab 3 `BR`/`AC` numbering collision.

**Changes in v1.4** (addressing third-round review findings F25–F37 against v1.3): the BR-28 disposition was still wrong — two client tests that pass a `requesterId` prop were filed as unchanged, and the four adapted server suites also need 14 Prisma stubs re-pointed, which is the same failure that retires another file. The CSRF content-type rule is exempted for body-less requests, since it would otherwise have made logout impossible. Reopening now clears the Resolution Summary, so a second resolution cycle cannot reuse the explanation the Requester already rejected. Role demotion cascades like deactivation, since a demoted owner breaks the same invariant. A wrong current password returns `403` rather than `401`, which a client interceptor would read as an expired session. BR-19 carves out `ownedOpenTicketCount`, BR-15 gains an explicit check order and a second seeded Administrator so `LAST_ADMIN` is reachable at all, the change-password field names are reconciled between the two documents, the Users table gains its Reset action, the Internal Notes refusal keeps the error envelope while carrying no note data, and AC-28 closes the FR-30 clause that shipped unverified.

**Changes in v1.5** (addressing peer review by @YummieGG on PR #44): the Definition of Done still gated on AC-01..AC-27 after v1.4 added AC-28, so completion could have been reported without verifying FR-30's password-change clause. `GET /api/staff/assignees` had no authorization-matrix row despite being a protected operation. The terminal-owner exception was buried in BR-10 with no decision justifying it, and is now **D22**. Four acceptance criteria were mapped to tests whose stated expectations did not actually reach the criterion: AC-14's `mustChangePassword` on create, AC-16's next-login gate after a reset, AC-17's preservation of ticket numbers and attachment bytes, and AC-18's distinct empty / no-results / forbidden / failure states, which now has its own test row S-02.

**Changes in v1.6** (addressing the second peer review by @YummieGG on PR #44): the contract claimed `server/.env.example` already documented the Lab 3 keys and that the README held the seeded credentials — neither was true, so both files are now updated and the seeded initial password is written down. v1.5 also introduced a contradiction while fixing an earlier point: it put byte-preservation assertions on API-26, a test the strategy section says runs against a stubbed Prisma client and therefore cannot prove anything about real rows. Preservation evidence is now **M-01**, a real-database procedure, API-26 is scoped to post-migration behaviour, and AC-17 traces to M-01. §6 now states exactly what evidence must be pasted in rather than a bare TBD.

**Changes in v1.7** (internal-consistency audit across all six documents): ten contradictions between documents that each looked correct alone. Two were half-applied fixes from earlier rounds — BR-22 still demanded a JSON content type on every state-changing request while `api-spec.md` exempted body-less ones, and only the requester-facing reopen cleared the Resolution Summary while a staff reopen through the status PATCH did not. The CSRF exemption is now stated by request shape rather than an endpoint list that had already drifted. D10 no longer claims Cancelled is reachable from Resolved, which the BR-13 matrix forbids. BR-19 now permits all three fields the API actually returns instead of one. The BR-24 role-demotion cascade reaches the API contract, AC-21 and API-21 rather than existing only as a business rule. The BR-25 blanket claim is scoped to ticket-addressed routes, since the queue and the assignee list cannot obey it. The requester ticket detail now exposes `appearsResolvedAt`, without which the badge `ui-spec.md` requires could not survive a reload. The Owner filter exposes the `assigned` value it validates. AC-27 and AC-28 are back in order in both §9 and the traceability table.

**Changes in v1.8** (addressing the third peer review by @YummieGG on PR #44): the header claimed **Approved** while the PR carried two unresolved `CHANGES_REQUESTED` rounds and no approval — the status is now Draft, and the Definition of Done gains an explicit item requiring a recorded peer approval before it changes, so the label can never again run ahead of the reviewer's verdict. The two authenticated reference endpoints had no authorization-matrix row, and the matrix never stated what an unauthenticated caller receives; both are fixed. The logout contract said a cookie was required *and* that it was idempotent when absent, which left the implementer unable to choose between `401` and `204`; it now pins `204` unconditionally, with the reason, and API-06 asserts it.

## 1. Sprint Goal

Replace the temporary Development Requester selector with secure JWT-cookie authentication and role-based authorization, add the first operational IT Staff Ticket Queue and Ticket Detail workflow with ownership, IT Priority, permitted status transitions, Public Comments and Internal Notes, and add minimalist Administrator User Management — while keeping all Lab 2 Requester ticket and attachment functions working under the authenticated identity.

## 2. Stakeholder Request Interpretation

The stakeholder wants real users instead of a dev selector. Login must be secure, first-login passwords must be changed before entering the app, and every screen and API must be protected by role and ownership on the backend. Requesters keep Lab 2 capabilities but identified by login, plus public discussion and an appears-resolved signal. IT Staff need a professional shared queue to find work and a detail screen to own, prioritize, advance, and communicate — publicly and privately. Administrators need one simple screen to manage accounts with safety guards. Visual language stays Zen Green. Intent supplied by stakeholder; precision supplied here.

## 3. Scope

### Included

* Email + password login, logout, current-user retrieval, mandatory first-login password change.
* Role-based navigation and server-side authorization for Requester, IT Staff, Administrator (single role per user).
* Migration from `RequesterUser` + `X-Requester-Id` to `User` + JWT httpOnly cookie; removal of selector and Change Requester.
* Requester regression: create/list/detail/attachments under authenticated identity; Public Comments; appears-resolved signal; reopen own Resolved ticket.
* IT Staff Ticket Queue: search, filters, sorting, pagination, ownership/status display, open-detail action.
* IT Staff Ticket Detail: claim/reassign owner, IT Priority, permitted status changes, Resolution Summary, Public Comments, Internal Notes, attachment continuity.
* Administrator User Management: list (Name, Email, Role, Status, Edit), search by name/email, optional role filter, create/edit, one-role assignment, activate/deactivate, set new initial password with safety guards.
* Data model + REST API + Zen Green UI extensions + tests + migration/regression evidence per `api-spec.md`, `ui-spec.md`, `tests.md`.

### Excluded (per handout §4.2)

Email invitations, password-reset email, MFA, social login, SSO, self-registration, Requester-created accounts, **Actions Taken / Service Actions**, SLA/escalation/notifications, dashboards/KPI beyond queue counts, multi-tenant/departments/customer admin, production deployment changes, multiple roles per user, user deletion, bulk/import/export, account-history screens, extended profiles/photos, email delivery of secrets, account unlocking/approval workflows, mandatory pagination/multi-sort/multi-filter on the admin list.

## 4. Functional Requirements

* **FR-16** The app provides Login (email, password, validation, busy, safe failure) and rejects inactive accounts with the same generic failure (no enumeration detail).
* **FR-17** A user with `mustChangePassword=true` cannot enter normal screens until a valid new password is saved via Change Password (rules, live checklist, confirmation, continuation).
* **FR-18** The app shell shows authenticated name + role, provides Logout that removes access, and blocks direct access after logout.
* **FR-19** Navigation shows only destinations permitted for the current role; unauthorized routes render forbidden feedback and are enforced server-side regardless.
* **FR-20** Requester screens (Lab 2) work under authenticated identity; selector and Change Requester are removed; client-supplied identity is ignored.
* **FR-21** Requester Ticket Detail adds Public Comments list + create, an appears-resolved action, and a reopen action on own Resolved tickets.
* **FR-22** Staff Queue lists **all** tickets with search, filters, sorting, pagination, ownership/status/priority badges, and open-detail action with loading/empty/no-results/forbidden/failure states.
* **FR-23** Staff Ticket Detail shows grouped ticket info with only operational fields editable: owner, IT Priority, permitted status, Resolution Summary, plus Public Comments, Internal Notes (visually distinct), and existing attachments.
* **FR-24** Staff can claim ownership, assign/reassign to active Staff/Admin, set IT Priority, and perform permitted status changes with confirmations where defined.
* **FR-25** Public Comments and Internal Notes are append-only with author/time from backend; empty/whitespace rejected.
* **FR-26** Admin User Management provides list, search, optional role filter, create (name, email, one role, active flag, initial password), edit (name, email, role, activation), and set-new-initial-password, with validation/success/forbidden/safe-failure feedback.
* **FR-27** Any authenticated user, regardless of role, may file and manage their own Tickets using the Requester screens; no user may perform IT Staff operations on a Ticket they themselves requested.
* **FR-28** Resolving a Ticket requires a non-empty Resolution Summary, which is visible to the Requester on the Ticket Detail screen.
* **FR-29** The system limits repeated failed login attempts per email address and returns a rate-limited response indistinguishable in wording from a credential failure.
* **FR-30** Logout, account deactivation, and password change immediately invalidate all outstanding sessions for the affected user.

## 5. Business Rules

* **BR-01** Only an active user with valid credentials may authenticate; failures — including inactive accounts — return generic `401 INVALID_CREDENTIALS` without distinguishing email vs password vs existence vs active status.
* **BR-02** A user with `mustChangePassword=true` is blocked from all normal APIs (`403 PASSWORD_CHANGE_REQUIRED`) except current-user, change-password, logout.
* **BR-03** Authenticated identity, never client-supplied identity, determines ownership of Requester operations.
* **BR-04** Public Comments visible to the Requester, IT Staff and Administrator. Internal Notes visible only to IT Staff and Administrator; Requester access returns `403` with no content.
* **BR-05** A Requester may set the appears-resolved signal but cannot set status to Resolved or Closed directly.
* **BR-06** Passwords hashed with bcrypt (cost 10–12), never stored nor returned in plaintext; initial/reset passwords set `mustChangePassword=true`.
* **BR-07** A password must be **at least 8 characters and at most 72 bytes** after trim and must contain at least one uppercase letter, one lowercase letter, one digit, and one non-alphanumeric character; confirmation must match. The same policy applies to initial passwords set by an Administrator. The 72-byte ceiling is the bcrypt input limit. The **identical trim is applied when verifying a password at login**, so a password stored with surrounding whitespace stripped can never lock its owner out at sign-in.
* **BR-08** JWT in httpOnly cookie (`SameSite=Lax`, `Secure` in prod), ~8h expiry, secret from server env only, never exposed to client or repo. Logout clears the cookie **and** invalidates the token per BR-20.
* **BR-09** Duplicate email rejected (`409 EMAIL_TAKEN`); invalid role rejected (`400`). Email uniqueness is case-insensitive, which a plain unique index on Postgres text does not give: every write path lower-cases the address before storing and the uniqueness constraint is enforced on that lower-cased value. Without this, `Foo@x.com` would insert alongside `foo@x.com`, no conflict would be raised, and the case-insensitive login lookup would then match two rows.
* **BR-10** Each Ticket has zero or one owner, who must be an **active** IT Staff or Administrator user **at the moment of assignment**. A Ticket may start unassigned. The active-owner invariant is asserted for non-terminal Tickets only (**D22**): a Closed or Cancelled Ticket keeps its historical owner for the record even after that user is deactivated or demoted, since BR-24 releases only non-terminal work. This is a deliberate, documented departure from a literal reading of handout §4.5, justified in D22.
* **BR-11** Requested Priority is immutable after creation. IT Priority is initialized as a copy of Requested Priority at creation and migration; editable only by IT Staff or Administrator.
* **BR-12** Required statuses: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled. **Closed and Cancelled are terminal.**
* **BR-13** Strict transition matrix enforced server-side; illegal transitions return `422 INVALID_TRANSITION`. "Staff" below means an IT Staff or Administrator user who is **not** the Ticket's Requester (BR-25):

  | From | Permitted target | Who |
  |---|---|---|
  | New | Open, Cancelled | Staff |
  | Open | In Progress, Waiting for Requester, Cancelled | Staff |
  | In Progress | Waiting for Requester, Resolved, Cancelled | Staff |
  | Waiting for Requester | In Progress, Resolved, Cancelled | Staff |
  | Resolved | Closed | Staff |
  | Resolved | Reopened | **the Ticket's Requester (own only)**, or Staff |
  | Reopened | In Progress, Waiting for Requester, Cancelled | Staff |
  | Closed | — (terminal) | — |
  | Cancelled | — (terminal) | — |

  A Requester attempting any transition other than Resolved → Reopened on their own Ticket returns `403`. A reopen attempted from Closed returns `422 INVALID_TRANSITION`. The appears-resolved signal never changes status.
* **BR-14** Comments/Notes: trimmed 1–2000 chars; whitespace-only rejected (`400`); safe rendering (escaped, preserved whitespace, no raw HTML).
* **BR-15** An Administrator may not deactivate their own account (`409 SELF_DEACTIVATION`); the system must retain ≥1 active Administrator (`409 LAST_ADMIN`); deactivation is used instead of deletion; no user-deletion endpoint exists. **Check order is self-deactivation first, last-administrator second**, so an Administrator deactivating themselves always sees `SELF_DEACTIVATION` even when they are simultaneously the last one. `LAST_ADMIN` therefore guards two distinct paths: deactivating a *different* Administrator who is the last active one, and changing the last active Administrator's role away from ADMINISTRATOR.
* **BR-16** Queue query: search case-insensitive substring on number OR summary (≤150 chars); filters `status, categoryId, requestedPriority, itPriority, owner=assigned|unassigned|mine`; sort `updatedAt|createdAt|number` default `updatedAt desc` with number tiebreak; `page≥1`, `pageSize∈{5,10,20}` default 10; invalid params → `400 INVALID_QUERY` with per-param details (same style as Lab 2). **The queue defaults to all tickets**; `owner=mine` is an opt-in filter, never the default, so unassigned work stays visible.
* **BR-17** Lab 2 rules retained as regression: ticket number `TKT-{year}-{seq}`, summary 1–150, description 1–5000, category/system must be active, attachment type/size/count/atomicity/soft-remove semantics unchanged.
* **BR-18** Every protected endpoint distinguishes `401` unauthenticated, `403` forbidden (including change-required), `400/422` validation/transition, `404` missing, `409` conflict, `429` throttled, `500` safe generic; the existence of another user's protected resource is never leaked beyond the 403/404 discipline.
* **BR-19** No response body ever contains a password, a password hash, a token version, or the signing secret. The user shape returned by any endpoint is limited to id, name, email, role and activation state, plus the password-change flag for the current user only. Three additions to that shape are permitted, all of them derived operational data rather than account credentials: `ownedOpenTicketCount` on the Administrator user list (BR-24), `unassignedTicketCount` on the response to an Administrator update that triggered a cascade (BR-24), and `mustChangePassword` on a user an Administrator has just created or reset — the Administrator must be able to confirm the forced change was applied, so the flag is visible to them for that user and not only for themselves. This rule holds for error responses and validation details as well, so a rejected request cannot echo a submitted password back to the client or into a server log.
* **BR-20** Every `User` carries an integer `tokenVersion`, embedded in the JWT at issue and compared against the stored value on every authenticated request; a mismatch returns `401`. Logout, Administrator deactivation, and any password change increment it, so outstanding cookies for that user stop working immediately. This is what makes logout and deactivation real rather than cosmetic.
* **BR-21** Failed login attempts are throttled per email address: after 5 failures within a 15-minute rolling window, further attempts return `429 TOO_MANY_ATTEMPTS` with the same generic wording as a credential failure. The window is held in server memory and expires on its own — no lockout state is persisted and no unlock workflow exists, since account unlocking is excluded from Lab 3. The counter sits behind an injectable clock and exposes a test-only reset, because every failed-login test shares one in-process server and a module-level counter would otherwise leak between tests.
* **BR-22** CSRF is addressed by three properties, documented rather than tokenised: the session cookie is `SameSite=Lax`, which blocks cross-site state-changing requests; CORS is configured without `credentials`, so no other origin can cause the cookie to be sent; and every state-changing endpoint **that carries a body** requires a JSON content type, rejecting simple cross-origin form posts. Requests with no body are exempt, because a browser sends no `Content-Type` for a body-less `fetch` and requiring one would make logout unreachable. A double-submit token is deliberately not implemented.
* **BR-23** Claiming an **unowned** Ticket whose status is New transitions it to Open in the same operation. Reassignment, unassignment, and claims of Tickets in any other status never change status.
* **BR-24** Deactivating a user unassigns them from every non-terminal Ticket they own (`ownerId` set to null) and increments their `tokenVersion` per BR-20, so no **non-terminal** Ticket is ever owned by an inactive user (BR-10) and no deactivated user retains a live session. The identical cascade runs when an Administrator changes a user's role **out of** IT Staff or Administrator: a demoted owner is equally ineligible under BR-10, would disappear from the assignee list while still displayed as the selected owner, and would be refused on the staff routes for work still assigned to them.
* **BR-25** No user may perform IT Staff operations — claim, assign, IT Priority, status transition, Internal Notes — on a Ticket where they are the Requester; such attempts return `403 SELF_SERVICE_FORBIDDEN`. They retain the ordinary Requester capabilities on that Ticket, including Public Comments, appears-resolved and reopen. **Reading is not restricted**: a staff user may open the staff detail screen for a Ticket they filed and sees it with the operational controls disabled and Internal Notes omitted, so that the Open action on a queue that defaults to all tickets never leads to a dead end.
* **BR-26** A transition to Resolved requires a non-empty trimmed Resolution Summary (1–2000 chars), supplied with the transition or already stored; a missing summary returns `400 RESOLUTION_SUMMARY_REQUIRED`. The summary is visible to the Requester. Reopening clears it, so a Ticket that has been reopened always needs a **fresh** summary before it can be resolved again — otherwise the second cycle would silently reuse the first cycle's explanation, which the Requester has already rejected by reopening.
* **BR-27** Users migrated from `RequesterUser` are created with role REQUESTER, a hashed shared local-development password documented in the README and seed, and `mustChangePassword=true`, so no migrated account can be used without an immediate password change. The password is a documented lab convenience, never a real secret, and never a value used outside this repository. **The README is the single authoritative source for its value**; the seed reads `SEED_INITIAL_PASSWORD` when set and otherwise falls back to that documented constant, so a fresh clone with no local environment file still produces the credentials the E2E specs sign in with.
* **BR-28** Lab 2 tests fall into three groups under this migration. **Retired** tests assert behaviour the sprint deletes outright — the development-requester listing endpoint and the Requester Selection screen — and are themselves deleted rather than skipped, so the "no skipped or disabled tests" rule in §10 stays literally true. **Adapted** tests keep their subject and their assertions but need a mechanical edit because the identity mechanism beneath them changed: the Lab 2 server suites swap the `X-Requester-Id` header for the session cookie, and the Lab 2 client suites swap the requester provider for the authentication provider. **Unchanged** tests are everything else. AC-17 asserts all three: every retired test is gone, every adapted test passes after its mechanical edit, and every unchanged test passes untouched. `tests.md` records which file sits in which group and why.

### Authorization matrix

Administrator is a **superset** of IT Staff for Ticket operations. The handout's §4.3 note that Administrators need not perform IT Staff work is honoured as a *navigation* choice (the Admin's default landing screen is User Management, not the queue), not as a permission restriction — this reading is required to satisfy §4.5, which makes an Administrator a valid Ticket Owner, and BR-04, which grants Administrators Internal Note visibility.

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Login / me / change-password / logout | yes | yes | yes |
| Reference data: `GET /api/reference/categories`, `GET /api/reference/systems` | yes | yes | yes |
| Create Ticket + own list/detail/attachments | yes (own only) | yes (own only) | yes (own only) |
| Public Comments read/create | own tickets | all | all |
| Appears-resolved signal | own tickets | own tickets (as requester) | own tickets (as requester) |
| Reopen from Resolved | own tickets | yes | yes |
| Internal Notes read/create | no (`403`) | yes, except own-requested (BR-25) | yes, except own-requested (BR-25) |
| Queue list / staff detail | no (`403`) | yes | yes |
| List assignable owners (`GET /api/staff/assignees`) | no (`403`) | yes | yes |
| Claim / assign owner, IT Priority, status | no (`403`) | yes, except own-requested (BR-25) | yes, except own-requested (BR-25) |
| Be assigned as Ticket Owner | no | yes (if active) | yes (if active) |
| Admin user CRUD + reset-password | no (`403`) | no (`403`) | yes (+ BR-15 guards) |

The matrix covers authenticated callers. **An unauthenticated caller receives `401 AUTH_REQUIRED` on every row above except login**, including the reference endpoints — those return active categories and systems, which are internal service-desk configuration rather than public data, so they are authenticated like everything else. Only `POST /api/auth/login` is reachable without a session.

## 6. UI Specification Summary

Full rules in `ui-spec.md`. Summary of the increase over Lab 2:

* Delete the Requester Selection screen and dev chip; add Login, the Change Password gate, a role-aware shell (name + role badge + Logout), and role-filtered navigation. **Client routing moves to react-router** with real URLs and route guards, so every screen is deep-linkable for E2E and screenshot evidence and no screen is reachable by URL without the corresponding server-side check also passing.
* Requester screens keep Lab 2 layout; identity now comes from the shell. Detail adds Public Comments, the appears-resolved action, the reopen action on Resolved, and a read-only Resolution Summary when present. **Create Ticket and My Tickets are available to every role** (FR-27).
* New Staff Queue: toolbar (debounced search; status, category, requested-priority, IT-priority and owner filters; sort; clear), desktop table vs mobile cards, pagination bar, distinct empty vs no-results states. Defaults to all tickets.
* New Staff Detail: read-only grouped information, an operational card (owner select, IT Priority select, status select with confirmation, Resolution Summary), and visually unmistakable Public Comments vs Internal Notes. **No Service Actions tab** — that feature is excluded from Lab 3.
* New Admin Users screen: table, search, role filter, create/edit dialogs, reset-password dialog, guard messaging, responsive stacking.
* Reuse Zen Green tokens and add badges for the 8 statuses, IT Priority, Role, and account status; preserve editable vs read-only shading, validation placement, focus, 44px touch targets, and no horizontal scroll.

## 7. Data Changes

PostgreSQL via Prisma, additive migration preserving Ticket and Attachment data:

| Model | Key fields |
|---|---|
| User *(new)* | id PK, name VarChar(120), email VarChar(255) unique (case-insensitive), passwordHash text, role enum, isActive bool default true, mustChangePassword bool default true, **tokenVersion int default 0**, createdAt, updatedAt |
| Ticket *(evolved)* | += ownerId FK→User? (nullable), itPriority enum, **appearsResolvedAt DateTime?**, **resolutionSummary text?**, status enum expanded to 8 values; index on (updatedAt desc) for the queue, because D12 makes the default queue unfiltered and a composite index leading with `status` cannot serve an unpredicated `ORDER BY updatedAt DESC` |
| PublicComment *(new)* | id PK, ticketId FK→Ticket cascade, authorId FK→User, body text (1..2000), createdAt; index (ticketId, createdAt) |
| InternalNote *(new)* | same shape as PublicComment; index (ticketId, createdAt) |
| Category, RelatedSystem, Attachment | unchanged; bytea rationale carried from Lab 2 |

There is **no `appearsResolved` boolean**: the nullable `appearsResolvedAt` timestamp is the single source of truth, null meaning not signalled. It records when the Requester signalled and is cleared by any Staff status transition, so the flag cannot go stale across a reopen cycle.

Relationships: one User → many requested Tickets; one Ticket → zero or one owner (active Staff/Admin); one Ticket → many PublicComments; one Ticket → many InternalNotes; each entry → one author. Enums: `Role {REQUESTER, IT_STAFF, ADMINISTRATOR}`, `TicketPriority {LOW, MEDIUM, HIGH}` reused for both priorities, `TicketStatus {NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED}` (expanded from the single-value Lab 2 enum).

Migration strategy: create tables and enums; **normalise every `RequesterUser.email` to lower case and abort with a listed collision report if two rows normalise to the same address** — the Lab 2 unique index is case-sensitive while `User.email` is not, so this check must run before the backfill rather than surfacing as a failed insert mid-transaction; backfill Users from `RequesterUser` (role REQUESTER, shared documented local password, `mustChangePassword=true` per BR-27); add the prescribed Staff and Admin seeds; set `Ticket.ownerId=null` and `itPriority=requestedPriority`; re-point `Ticket.requesterId` to the new User ids preserving ownership; verify row counts before and after; then drop `RequesterUser`. Seeds are idempotent via upsert on email; passwords are local-only and documented, with no real secrets in the repository.

Seed minimums (handout §5.3): 4 active + 1 inactive Requesters, 3 active + 1 inactive IT Staff, **2 active Administrators** (the handout requires at least one; a second is needed because with only one Administrator every last-admin scenario is also a self-deactivation, leaving `409 LAST_ADMIN` unreachable on the deactivation path), realistic Tickets spread across all 8 statuses, both priorities, and assigned/unassigned ownership, plus sample Public Comments and Internal Notes containing no sensitive information.

## 8. API Contract

Summary — exact shapes in `api-spec.md`. Base `/api`, JSON unless multipart, same error envelope as Lab 2.

```text
POST /api/auth/login                      {email,password} -> 200 {user} + httpOnly cookie   (429 when throttled)
POST /api/auth/logout                     -> 204 + clear cookie + bump tokenVersion
GET  /api/auth/me                         -> 200 {user}
POST /api/auth/change-password            {currentPassword?, newPassword, confirmPassword} -> 200, clears flag, bumps tokenVersion

GET  /api/reference/categories|systems    (auth; Lab 2 unchanged)
POST /api/tickets                         multipart, atomic, 201 + TKT-{year}-{seq}  (any authenticated role)
GET  /api/tickets                         own list (Lab 2 query style preserved)
GET  /api/tickets/:id                     own detail + public comments + resolutionSummary (never notes)
POST /api/tickets/:id/attachments         multipart single file
GET|DELETE /api/attachments/:id(+/download)  Lab 2 limits, atomicity and 410 preserved
POST /api/tickets/:id/appears-resolved    own ticket -> sets appearsResolvedAt
POST /api/tickets/:id/reopen              own ticket, Resolved only -> Reopened

GET  /api/staff/tickets                   queue ?search&status&categoryId&requestedPriority&itPriority&owner&sort&order&page&pageSize
GET  /api/staff/tickets/:id               full detail incl. internal notes
GET  /api/staff/assignees                 active IT Staff + Admin users, to populate the Owner select
PATCH /api/staff/tickets/:id/owner        {ownerId|null}   claim of a New unowned ticket also sets Open
PATCH /api/staff/tickets/:id/priority     {itPriority}
PATCH /api/staff/tickets/:id/status       {status, resolutionSummary?}  matrix-enforced; confirmation is client-side only
GET|POST /api/tickets/:id/comments        public (the ticket's requester, any role + Staff/Admin all)
GET|POST /api/staff/tickets/:id/notes     Staff/Admin only, never the ticket's own requester

GET  /api/admin/users?search&role         Admin only
POST /api/admin/users                     {name,email,role,isActive,initialPassword}
PATCH /api/admin/users/:id                {name,email,role,isActive}   deactivation OR demotion cascades per BR-24
POST /api/admin/users/:id/reset-password  {newPassword} -> sets flag + bumps tokenVersion
```

All `/api/staff/*` endpoints require IT Staff or Administrator and enforce BR-25, with **exactly one read exemption**: `GET /api/staff/tickets/:id` succeeds for a Ticket you filed and returns it with Internal Notes omitted. Every other `/api/staff/*` route, the Internal Notes read included, still refuses that Ticket's own requester. Public Comments deliberately live under `/api/tickets/` rather than `/api/staff/`, because the ticket's own requester uses them whatever their role. Auth: JWT httpOnly cookie required except on login; `401` missing/invalid/expired/version-mismatch/inactive, `403` forbidden or change-required. Statuses include `400 VALIDATION_FAILED`, `400 INVALID_QUERY`, `400 RESOLUTION_SUMMARY_REQUIRED`, `422 INVALID_TRANSITION`, `409 EMAIL_TAKEN / LAST_ADMIN / SELF_DEACTIVATION / ALREADY_SIGNALLED`, `429 TOO_MANY_ATTEMPTS`, `410 REMOVED` (attachments preserved).

## 9. Acceptance Criteria

Every AC maps to ≥1 test in `tests.md`.

* **AC-01** Given active credentials, when login succeeds, then an httpOnly cookie is set and the permitted identity + role are returned.
* **AC-02** Given invalid credentials or an inactive account, when login is attempted, then a generic `401 INVALID_CREDENTIALS` safe failure is returned with no enumeration.
* **AC-03** Given `mustChangePassword=true`, when login succeeds, then normal screens and APIs stay blocked until a valid new password is saved.
* **AC-04** Given an authenticated Requester, when the client supplies another identity, then the backend still applies the authenticated identity and never returns another user's data.
* **AC-05** Given a Requester, when an Internal Note endpoint is requested, then `403` is returned with no note content.
* **AC-06** Given logout, when a subsequent protected call or direct navigation is attempted, then `401` / redirect to Login results, **and the pre-logout cookie is rejected even if replayed**.
* **AC-07** Given a Requester's own ticket, when appears-resolved is triggered, then `appearsResolvedAt` is set and the status never becomes Resolved or Closed by the Requester.
* **AC-08** Given a Staff queue query, valid or invalid, when requested, then the correct slice + `{page,pageSize,total,totalPages}` or `400 INVALID_QUERY` is returned, and the unfiltered default includes unassigned tickets.
* **AC-09** Given Staff, when claiming or reassigning an owner to an inactive or non-staff user, then the request is rejected; a valid assignment persists, and claiming an unowned New ticket also sets Open.
* **AC-10** Given Staff, when setting IT Priority, then it persists; a Requester attempt is rejected.
* **AC-11** Given an illegal status transition, or a Requester attempting Resolved/Closed, when requested, then `422`/`403`; a legal transition persists.
* **AC-12** Given an empty or whitespace comment or note, when posted, then `400`; valid entries record author and time from the backend and render safely.
* **AC-13** Given an Admin list, when searched or filtered, then the correct subset is returned; a non-Admin gets `403`.
* **AC-14** Given an Admin create with a duplicate email or bad role, when submitted, then `409`/`400`; a valid create sets the change-required flag.
* **AC-15** Given an Admin self-deactivation or last-admin removal, when attempted, then `409` and state is unchanged.
* **AC-16** Given a reset password, when the next login occurs, then the change-required gate is enforced.
* **AC-17** Given existing Lab 2 tickets and attachments, when migrated, then ownership, numbers and bytes are preserved and every Lab 2 test not retired under BR-28 still passes as regression.
* **AC-18** Given desktop, tablet and mobile, when each Lab 3 screen renders, then responsive rules are met with no horizontal scroll and distinct empty/no-results/forbidden/failure states.
* **AC-19** Given a password failing any complexity rule, when submitted at change or admin-create time, then `400` naming the unmet rule; a compliant password is accepted.
* **AC-20** Given 5 failed logins for one email inside the window, when a 6th is attempted, then `429` with wording identical to a credential failure.
* **AC-21** Given an active session, when an Administrator deactivates that user **or changes their role out of a staff role**, then the user's next request returns `401` and their non-terminal tickets become unassigned; both triggers behave identically.
* **AC-22** Given a Requester's own Resolved ticket, when reopen is requested, then the status becomes Reopened; the same request on another user's ticket returns `403` and on a Closed ticket returns `422`.
* **AC-23** Given a transition to Resolved with no Resolution Summary, when requested, then `400 RESOLUTION_SUMMARY_REQUIRED`; with a summary it persists and is visible to the Requester.
* **AC-24** Given a user who is the Requester of a ticket, when they attempt any staff operation on it, then `403 SELF_SERVICE_FORBIDDEN`, while their Requester actions on the same ticket still succeed.
* **AC-25** Given an IT Staff or Administrator user, when they create a ticket, then it succeeds and appears in their own ticket list.
* **AC-26** Given a migrated Lab 2 requester, when they log in with the documented initial password, then login succeeds and the change-password gate is enforced before any other screen.
* **AC-27** Given each of the three roles, when the authenticated shell renders, then only that role's permitted destinations appear in the navigation, and hand-navigating to a route outside the role renders forbidden feedback while the underlying API refuses the request independently.
* **AC-28** Given a user signed in on two devices, when they change their password on one, then the other device's next request is refused while the device that performed the change stays signed in.

## 10. Definition of Done

Product (checked before completion is reported):

* [ ] All included scope implemented; no excluded feature present (specifically: no Service Actions tab, no user deletion, no admin pagination).
* [ ] Every AC-01..AC-28 satisfied with passing automated evidence.
* [ ] No test skipped or disabled; suite green from the documented commands on `main`.
* [ ] Data model matches §7 (schema + applied migration + idempotent seed, ownership preserved, seed minimums met).
* [ ] API conforms to `api-spec.md` (paths, shapes, cookies, authorization, safe errors).
* [ ] UI conforms to `ui-spec.md` (tokens, badges, states, responsive, accessibility).
* [ ] Migration and regression evidence recorded (counts before/after, Lab 2 suite still green).
* [ ] No secret, real password or `JWT_SECRET` value committed; `server/.env.example` documents the new keys.
* [ ] README setup, run and test instructions current, including seeded credentials, with the retired `e2e/lab-02` command removed and a note recording that Lab 2 browser evidence is superseded by `e2e/lab-03` — otherwise the final `main` reads as though graded Lab 2 evidence went missing.

Delivery:

* [ ] Issues tracked on the Kanban board Backlog → Specified → Started → PR Review → Fixing → Done.
* [ ] Feature branches only; peer-reviewed PRs into `lab3-staging`; release PR to `main` approved.
* [ ] Contract docs version-controlled and merged **before** implementation PRs (handout Part 2 evidence).
* [ ] Peer approval recorded on PR #44 and this document's status changed from Draft to Approved. Until that happens the contract is not approved, whatever this file's header says — the reviewer's verdict on the PR is the authority, not the label.
* [ ] `reviewer.md` complete with reviews given and received, links and approvals.
* [ ] Submission PDF using the literal headings "Answer Part 1" through "Answer Part 9" with working links.

## 11. Assumptions and Decisions

| # | Decision / Assumption | Justification |
|---|---|---|
| D1 | JWT in an httpOnly cookie, not a bearer header or DB session | Vite-proxy friendly, safer than localStorage against XSS, logout clears the cookie |
| D2 | **Administrator is a superset of IT Staff** for ticket operations; separation is navigational | The only reading that satisfies §4.5 (Admin can own tickets) and BR-04 (Admin sees Internal Notes) without documented deviations; §4.3 explicitly defers to the approved matrix |
| D3 | **`appearsResolvedAt` timestamp, no boolean** | One source of truth, gives an audit trail and a queue badge for free, and is clearable so it cannot go stale across a reopen |
| D4 | **Requester may reopen own ticket from Resolved only** | BR-05 forbids only Resolved and Closed; keeps Closed terminal and staff-owned, and yields a genuine ownership authorization test |
| D5 | **`tokenVersion` column for session invalidation** | One integer and one comparison turns logout, deactivation and password change into real invalidations; without it a deactivated user keeps an 8-hour session |
| D6 | **Password complexity per the §8.1 mockup** with a live checklist | The checklist is graded screenshot evidence; four regexes give clean boundary tests |
| D7 | Lint/format pass is scoped to formatting only and lands before feature branches fork | A repo-wide reformat after divergence would conflict with six branches for zero rubric value |
| D8 | **react-router with route guards** | Real URLs make E2E specs and the four screenshot directories tractable; a guard component is the natural place to prove authorization is not just hidden buttons |
| D9 | **Migrated users share one documented local-dev password + forced change** | Reproducible, seedable, idempotent, demoable, and testable as the §5.2 migration evidence |
| D10 | **Cancelled is staff-only, reachable from any non-terminal state except Resolved, and is itself terminal** | Keeps the Requester's write surface to exactly what §4.3 enumerates; allows cancelling duplicates discovered mid-work. Resolved is excluded because work already resolved is closed or reopened, never cancelled — BR-13's Resolved row is the authority |
| D11 | **Resolution Summary is a real field, required to resolve; no Service Actions tab** | The field appears in the §8.4 mockup and gives the Resolved transition content; Service Actions is excluded by §4.2 |
| D12 | **Shared queue defaulting to all tickets**, `owner=mine` opt-in | §4.3 describes a shared queue where staff "find work"; defaulting to mine would hide exactly the unassigned tickets needing a claim |
| D13 | **In-memory, self-expiring login throttle** | Satisfies the §4.4 login-attempt rule without persisted lockout state, which would require the unlock workflow §4.2 excludes |
| D14 | **CSRF answered by SameSite=Lax + non-credentialed CORS + JSON-only mutations** | Closes the actual vector at no cost; a double-submit token would add a cookie, a header, middleware and tests for a threat already blocked |
| D15 | **TokTickIT is the canonical product name** | Matches the shipped Lab 2 UI and four existing test assertions plus all lowercase identifiers; the handout mockups' "TikTockIT" is illustrative art |
| D16 | **Claiming an unowned New ticket sets it to Open** | Keeps New meaning genuinely unhandled so the New filter is useful; one narrow rule, one test |
| D17 | **Deactivation unassigns the user's non-terminal tickets** | Required to keep BR-10 true (owners must be active); pairs with D5 so deactivation kills the session and releases the work in one action |
| D18 | **Any authenticated user may file tickets, but no self-service on own tickets** | IT staff have their own IT problems; the self-service ban is what makes that safe, preventing file-claim-close with nobody else involved |
| D19 | bcryptjs rather than native bcrypt | Pure JS, no native build step on win32, course-friendly |
| D20 | Two tables for comments and notes rather than one with a flag | Table-level authorization cannot leak through a forgotten filter predicate |
| D21 | Timestamps UTC ISO-8601; seeds local-only | Consistent ordering; no secrets in the repository |
| D22 | **A Closed or Cancelled Ticket keeps its owner even after that user is deactivated or demoted**, so the active-owner rule of handout §4.5 is asserted for non-terminal Tickets only | §4.5 describes ownership of *live* work. Scrubbing the owner from terminal Tickets would destroy the record of who actually handled them, which the Requester can still see on a Closed Ticket and which any later audit depends on. The alternative — blocking deactivation until every historical Ticket is reassigned — is an administrative dead end, since bulk operations are excluded (§4.2). D17's cascade therefore releases non-terminal work only, and BR-10, BR-24 and the migration all scope the invariant the same way |
