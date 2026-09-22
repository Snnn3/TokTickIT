# Lab 4 Engineering Specification - Actions Taken and Role Dashboards

Status: **Draft contract for peer review**<br>
Version: **1.0**<br>
Date: **2026-09-22**<br>
Branch: `feature/lab4-1-contract`<br>
Issue: [#54](https://github.com/Snnn3/TokTickIT/issues/54)

Sources: Lab 4 handout, Issue #54, and the existing
Lab 3 contract. Companions: [API](api-spec.md), [UI](ui-spec.md),
[tests](tests.md), [reviewer](reviewer.md), [AI use](ai-use.md).
This revision repairs the PDF-validation findings while retaining draft version
1.0. Peer approval and merge are still pending.

## 1. Sprint goal

Complete the service-desk workflow with traceable Actions Taken, explicit
resolution checks, dashboards for each role, and verified Labs 1-3 regression,
responsive behavior, accessibility, and safe failures.

## 2. Stakeholder interpretation

The Ticket Owner coordinates the whole request. Other permitted staff can record
work, its result, follow-up needs, and attachment notes on that Ticket.
Requesters need their own attention/recent-work summary; Staff need operational
counts and their own actions. Dashboards link to details and never replace them.

## 3. Scope

Included: Actions Taken model/API/UI; full Ticket lifecycle; Requester and
Staff dashboards (Administrator reuses Staff); migration, idempotent demo seed,
concurrency, authorization, performance smoke, regression and final evidence.

Preserve Labs 1-3 authentication, password gate, requester filing/list/detail,
attachment atomicity and soft removal, public comments, private append-only
notes, Staff queue/ownership/priorities, and Administrator safety guards.
Lab 1 health/categories compatibility remains. Existing features are not retired.
Tests whose assertions expressly exclude Actions Taken or Dashboard navigation
must be adapted to the additive UI, alongside resolution and version fixtures;
their original permission and behavior assertions remain.

Excluded: SLA clocks/escalation/on-call; external notifications; inventory,
purchasing/cost accounting; billing/payroll; multi-level approvals/signatures;
custom BI/report builders/export warehouses; multi-tenancy/cloud operations;
action deletion, automatic Ticket resolution, and fabricated historical actions.
No new authentication or account-management feature is introduced.

## 4. Functional requirements

Lab 4 continues FR numbering; BR-30 onward continues Lab 3. AC IDs are local
to Lab 4.

- **FR-31** A Ticket has zero-to-many Actions Taken; each action belongs to one Ticket.
- **FR-32** IT Staff and Administrators create/update permitted actions; authenticated creator attribution is immutable and independent of owner/assignee.
- **FR-33** Actions expose description, result, create date/time, follow-up flag/note, attachment notes, assignee, status and version.
- **FR-34** Only active IT Staff may be assigned; deactivation/demotion handles existing assignments.
- **FR-35** Action lifecycle and meaningful-result validation are enforced by the backend.
- **FR-36** Formal resolution requires permitted Staff/Admin, a completed action with a result, and a non-empty Resolution Summary; requester feedback remains advisory.
- **FR-37** Requesters receive ownership-scoped dashboard metrics and recent/attention-required Tickets.
- **FR-38** Staff/Admin receive operational metrics, recent Tickets and current-user Actions Taken with drill-down.
- **FR-39** Workflow edits reject stale versions atomically with 409; repeat action creation is safely handled.
- **FR-40** Migration preserves all legacy data and zero-action Tickets; repeatable seeds and recovery are verified.
- **FR-41** Backend role/ownership/self-service checks protect all new operations.
- **FR-42** All prior regression behavior survives the documented additive adaptations.
- **FR-43** New screens cover create/view/edit/read-only, loading, empty, validation, success, busy, forbidden, conflict, not-found and safe failure.
- **FR-44** Zen Green, keyboard accessibility, responsive layouts, performance smoke and release evidence meet the Product DoD.

## 5. Business rules

- **BR-30** Each action has exactly one immutable Ticket relation; zero actions is valid.
- **BR-31** performedById comes from the authenticated IT_STAFF or ADMINISTRATOR creator. It cannot be submitted or changed. Being Ticket Owner is not required.
- **BR-32** assigneeId is nullable; non-null assignment requires active IT_STAFF. Admin performers are allowed, Admin assignees are not. Deactivation or role change away from IT_STAFF clears that user's assignments on PLANNED/IN_PROGRESS actions transactionally, increments affected action and parent versions, and appends audit events. Terminal actions retain historical assignee attribution, which may later be inactive or have another role.
- **BR-33** Action transitions are PLANNED -> IN_PROGRESS/CANCELLED and IN_PROGRESS -> COMPLETED/CANCELLED. COMPLETED/CANCELLED are immutable. Same-status field edits are permitted on nonterminal actions. Create starts PLANNED.
- **BR-34** title is trimmed 1-120, details (Action Description) 1-2000, result nullable or trimmed 1-2000, followUpNote/attachmentNotes nullable or trimmed 1-2000. followUpRequired is boolean, default false; true requires a non-empty note. All timestamps are server-generated UTC; createdAt is the handout's Action create date/time. No backdating input. Blank nullable notes normalize to null; blank result normalizes to null before completion validation.
- **BR-35** Entering RESOLVED requires a completed action with non-empty result and trimmed resolutionSummary 1-2000. Missing result prerequisite -> 400 ACTION_RESULT_REQUIRED; missing summary -> 400 RESOLUTION_SUMMARY_REQUIRED. Omitted summary preserves a valid stored value; explicitly blank/null is rejected. If both prerequisites fail, result is checked first.
- **BR-36** Appears-resolved never transitions a Ticket or creates an action. Reopening clears the summary and advisory timestamp; old actions remain historical. A historical completed action still satisfies the action prerequisite after reopening, but a fresh summary is required.
- **BR-37** Dashboard queries use authenticated identity and a single consistent database snapshot. Recent is the inclusive rolling 168-hour interval ending at asOf; lists contain latest five by their defined timestamp DESC, id DESC. Detailed queries use the same asOf/from bounds.
- **BR-38** Persist/return UTC ISO-8601 instants; display Asia/Bangkok. Dashboard recent Tickets use updatedAt; recent resolved uses resolvedAt; recent actions use createdAt. These timestamps serve different stated meanings rather than silently using creation time for updated work.
- **BR-39** Ticket workflow edits require expectedVersion. Action creates require expectedTicketVersion; action edits require both expectedVersion and expectedTicketVersion. Compare and increment inside one transaction. Any mismatch -> 409 STALE_WRITE without partial writes or audit events. Exact scope and returned versions are in api-spec.md.
- **BR-40** Migration is additive and creates no historical actions. Legacy resolved Tickets remain valid without actions; the gate applies to new transitions into RESOLVED.
- **BR-41** Requester reads are own-only. Staff/Admin may read all action history, but cannot perform staff mutations on their self-requested Tickets (403 SELF_SERVICE_FORBIDDEN). Requesters never create/update actions.
- **BR-42** Safe errors contain code/message/optional field details, never secrets or hidden content. Unknown/read-only fields are rejected, not trusted.
- **BR-43** Action creation/completion does not automatically change Ticket status. All action writes require a parent outside RESOLVED/CLOSED/CANCELLED. Audit events are append-only; edits never overwrite the historical event trail. Public comments/internal notes retain their existing append-only rules.
- **BR-44** Creation has a client-generated Idempotency-Key. A successful same-actor/same-key/same-payload replay returns the original creation response without another action, including after a lost response. Reusing the key with another payload returns 409 IDEMPOTENCY_CONFLICT.
- **BR-45** Resolving does not require all other actions to finish. Remaining actions become read-only until the Ticket is reopened; this is an explicit scope decision.
- **BR-46** Reference lists show active eligible assignees. Assignment eligibility and user-state changes serialize transactionally to prevent an inactive assignment race.

### Ticket transition matrix

Staff below includes Administrator and excludes the Ticket requester. Any
unlisted edge, including a same-status status request, returns 422 INVALID_TRANSITION.

| From | Targets | Authorized actor / conditions |
|---|---|---|
| NEW | OPEN, CANCELLED | Staff; claiming an unowned NEW Ticket also opens it atomically |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED | Staff |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | Staff; RESOLVED requires BR-35 |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED | Staff; RESOLVED requires BR-35 |
| RESOLVED | CLOSED | Staff |
| RESOLVED | REOPENED | Own requester of any role, or Staff; clears summary/signal |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED | Staff |
| CLOSED | none | Terminal |
| CANCELLED | none | Terminal |

### Action transition matrix

| From | Targets | Condition |
|---|---|---|
| create | PLANNED | Staff/Admin, valid parent, eligible optional assignee |
| PLANNED | IN_PROGRESS, CANCELLED | Versions current |
| IN_PROGRESS | COMPLETED, CANCELLED | COMPLETED requires trimmed result |
| COMPLETED | none | Immutable |
| CANCELLED | none | Immutable |

### Authorization matrix

Every protected row requires an active authenticated session and completion of
the Lab 3 password-change gate. UI hiding never replaces server authorization.

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Own dashboard / own Ticket list/create/detail/attachments | Own only | Own requester scope | Own requester scope |
| Staff dashboard, queue and staff detail | Forbidden | All Tickets | All Tickets |
| Read actions and their public audit history | Own Ticket | All Tickets | All Tickets |
| Create/edit/transition/assign action | Forbidden | Except self-requested | Except self-requested |
| Be newly assigned an action | No | Active only | No |
| Claim/assign Ticket owner, priority, staff status | Forbidden | Except self-requested | Except self-requested |
| Be assigned Ticket owner | No | Active only | Active only |
| Appears-resolved / requester reopen | Own only | Own requester scope | Own requester scope |
| Public comment read/create | Own only | All Tickets | All Tickets |
| Internal note read/create | Forbidden | Except self-requested | Except self-requested |
| Read eligible action/Ticket assignees | Forbidden | Yes | Yes |
| User list/create/edit/reset, existing safety guards | Forbidden | Forbidden | Yes |
| Auth/me/change-password/logout | Existing Lab 3 rules | Existing Lab 3 rules | Existing Lab 3 rules |

## 6. UI summary

Requester and Staff dashboards have role navigation, metric-card links and
latest-five lists. Ticket Detail adds Action Taken list/create/edit/history with
all handout fields; requester view is read-only. Reuse Zen Green and show explicit
feedback states, keyboard focus and mobile cards. See ui-spec.md for exact
routes, controls, drill-downs and visual evidence.

## 7. Data, migration and seed

Existing Ticket/User IDs remain positive integers. ActionTaken.id and its
Ticket/User foreign keys are integers too. Fields: ticketId, title, details,
result?, performedById, assigneeId?, status, followUpRequired=false,
followUpNote?, attachmentNotes?, version=1, createdAt, updatedAt, completedAt?.
Limits/nullability follow BR-34. completedAt is set exactly once on completion.

Ticket adds version Int default 1 and resolvedAt nullable UTC timestamp.
Entry into RESOLVED sets resolvedAt; reopen clears it; closing preserves it.
Existing RESOLVED/CLOSED rows get null resolvedAt because a true resolution time
is unknown. They count in status totals but not recent-resolved until a later
real resolution. Existing updatedAt is preserved and remains eligible for
recent-updated metrics. No IDs, credentials, bytes, comments or notes change.

ActionEvent is an append-only record with integer id/actionId, actorId,
event type, prior/new action versions, timestamp and before/after public action
snapshots. Creation and each edit/transition/cascade append an event in the
same transaction. There is no update/delete API. Creator attribution remains
unchanged when a different actor edits. Idempotent replay appends nothing.

ActionCreationRequest stores actorId/key (unique pair), ticketId, canonical
payload fingerprint and original response. Retain for the lab dataset lifetime;
never store credentials. Audit/fingerprint storage contains action fields only.

**Database decisions and reasons:**

1. Retain integer foreign keys to preserve the existing Prisma relations and
   avoid rewriting prior identities. Restrict parent/user deletion to retain
   history; user deactivation remains the supported operation.
2. A separate ActionTaken table and ActionEvent table keep mutable work state
   separate from append-only evidence and enforce the one-parent relation.
3. Version comparisons and all related updates occur transactionally, preventing
   stale resolution/assignment races. Parent Tickets are locked in ascending ID
   order during multi-Ticket cascades to avoid inconsistent lock ordering.
4. Index actions by (ticketId, createdAt, id), (performedById, createdAt, id)
   and (assigneeId, status); index Tickets by (requesterId, updatedAt, id),
   (requesterId, resolvedAt, id), ownerId/status and existing queue indexes.
   These match dashboard ownership/time predicates and avoid loading full collections.

**Migration/recovery:** Back up an isolated Lab 3 database; inventory all earlier
tables and attachment SHA-256 hashes. Apply the additive migration and compare
all legacy columns/rows/hashes, new version=1, zero actions/events. Test recovery
by restoring the backup into a separate disposable database and verifying the
same inventory and Lab 3 reads. No destructive down migration against user data.
For post-upgrade failures, stop writes and prefer a forward fix; restoring an old
backup would lose newer writes and must not be represented as lossless rollback.

**Seed:** Extend server/prisma/seed.ts with stable fixture keys and upserts.
Running twice must preserve counts and relationships and must not append duplicate
audit events or rewrite unrelated users. Provide all eight Ticket statuses,
all priorities, assigned/unassigned ownership, zero/one/many actions, each action
status, active/inactive Staff, Staff/Admin performers, follow-up examples, an
empty requester and a populated requester. Set timestamps relative to a
documented fixture clock, with records inside/outside/exactly on the 7-day edge.
Seeded demo actions are explicitly new fixtures, not legacy backfill.

## 8. API summary

api-spec.md defines action list/detail/audit and create/edit, assignee lookup,
Requester/Staff dashboard endpoints, filtered drill-downs, version additions
to existing Ticket routes, exact validation, responses and safe conflict codes.

## 9. Acceptance criteria

| ID | Observable acceptance criterion |
|---|---|
| AC-01 | Six documents agree on roles, fields, routes, rules and errors; all issue/PDF requirements have traceable tests. |
| AC-02 | Integer relations support zero/one/many actions and migration preserves all legacy rows and attachment bytes without invented actions. |
| AC-03 | Staff and Admin create actions with authenticated immutable performer; ownership and self-service rules block forbidden writes. |
| AC-04 | Every action transition, terminal immutability and unchanged Ticket status are verified. |
| AC-05 | Only active Staff can be newly assigned; deactivation/demotion safely clears active work, preserves terminal history and rejects assignment races. |
| AC-06 | All action fields, lengths, follow-up conditional validation and completion-result errors match the API. |
| AC-07 | Only permitted Staff/Admin can resolve with a completed result and valid summary; every Ticket transition edge is enforced. |
| AC-08 | Omitted valid summary is preserved; reopen clears it and resolvedAt; a fresh summary is required on the next resolution. |
| AC-09 | Requester appears-resolved remains advisory and own-only. |
| AC-10 | Every authorization row, including own-history isolation and private notes, is enforced by the backend. |
| AC-11 | Requester dashboard shows only authenticated ownership, including empty, recent, attention and resolved data. |
| AC-12 | Staff/Admin metrics, current-user actions, latest-five lists and all drill-downs match database queries and the common snapshot window. |
| AC-13 | UTC persistence, Bangkok display, seven-day edges and deterministic ties are verified. |
| AC-14 | Every versioned Ticket workflow route rejects stale edits without partial changes and returns usable current versions. |
| AC-15 | Action/parent versions, create replay and assignment cascades are atomic; concurrent requests cannot silently overwrite work. |
| AC-16 | Validation/auth/forbidden/missing/conflict/failure responses are safe and deterministic, including direct API bypass attempts. |
| AC-17 | Action list/create/view/edit/read-only covers all feedback states; recoverable errors retain entered values. |
| AC-18 | Both dashboards and Action Taken screens pass responsive, accessibility, visual and performance-smoke checks. |
| AC-19 | Labs 1-3 regression passes after documented additive UI/version/resolution fixture adaptations, without deleting coverage. |
| AC-20 | Peer approval and contract merge are recorded before implementation PRs are completed. |
| AC-21 | Idempotent seed and backup/restore recovery pass against real database fixtures. |
| AC-22 | Action audit history, comments and notes remain append-only, deterministically ordered and visible only to authorized roles. |
| AC-23 | Product release evidence includes clean console/links, current README, test/build outputs and final reviewed integration. |

## 10. Definition of Done

Contract delivery:
- [x] Six draft files, requirements, matrices, exact API/UI and test plan exist.
- [ ] Independent peer approval is recorded in reviewer.md.
- [ ] Contract is merged before implementation PRs are completed.

Product completion (future implementation; do not check without evidence):
- [ ] AC-01 through AC-23 pass with exact test paths and recorded results.
- [ ] Actions Taken and both role dashboards work with correct authorization.
- [ ] Whole Ticket/action matrices, resolution and advisory feedback pass.
- [ ] Idempotency, concurrency, inactive assignments and safe failure pass.
- [ ] Migration preservation, repeat seed and restore verification pass.
- [ ] Labs 1-3 regression, server/client tests, lint/check, builds and E2E pass.
- [ ] Performance-smoke query evidence and dashboard/database count comparisons exist.
- [ ] Desktop/tablet/mobile screenshots and accessibility checklist are complete.
- [ ] No broken links, placeholder controls, unexpected console errors, clipping or overflow remain.
- [ ] README setup, seed, migration/recovery, tests and demonstration steps are current.
- [ ] Peer review records identity, PR links, findings, responses and approvals.
- [ ] Feature branches merge into lab4-staging, then main; final tests run from main and Kanban reflects completed work.
- [ ] Final report has Answer Part 1 through Answer Part 9, readable evidence and working links; AI disclosure selects 6-10 actual prompts.

## 11. Assumptions and decisions

Issue #54 locks statuses, actor/assignee separation, 7 days/latest five,
timezone, version conflicts and zero historical actions. The handout explicitly
permits Admin action writes and requires Requester dashboards; any narrower
glossary wording must not override those requirements. Optional assignee, server
create time, audit trail, replay retention, resolvedAt handling and remaining
unfinished actions are draft design choices for peer approval, not claims that
the handout mandates their exact implementation.
