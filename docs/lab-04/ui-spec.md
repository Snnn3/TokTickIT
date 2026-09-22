# Lab 4 UI Specification

Status: **Draft contract for peer review**<br>
Version: **1.0**<br>
Date: **2026-09-22**<br>
Branch: `feature/lab4-1-contract`<br>
Issue: [#54](https://github.com/Snnn3/TokTickIT/issues/54)

Companions: [specification](specification.md), [API](api-spec.md), [tests](tests.md).
Reuse the Lab 3 Zen Green tokens, shell, badges, inputs, cards and feedback.
Wire fields and permissions exactly to the API; UI guards are not authorization.

## 1. Routes and navigation

| Route | Audience | Purpose |
|---|---|---|
| /dashboard/requester | Every role in requester capacity | Only own Ticket summary |
| /dashboard/staff | IT Staff / Administrator | Operational summary and current-user actions |
| /staff/actions | IT Staff / Administrator | Paginated current-performer action drill-down |
| /staff/tickets/:id | IT Staff / Administrator | Ticket workflow, actions and history |
| /tickets/:id | Own requester scope | Read-only actions plus existing requester workflow |

Requester landing becomes /dashboard/requester; Staff landing becomes
/dashboard/staff; Admin retains /admin/users. All roles retain My Tickets and
Create Ticket. Staff/Admin navigation includes Staff Dashboard and My Dashboard;
Requester sees My Dashboard only. Active-page indication is explicit.
Existing queue, users, auth/password, attachments, comments and notes stay available.

Direct unauthorized route navigation renders Forbidden; expired sessions use
the existing login continuation. Self-filed Staff/Admin Tickets are readable,
with staff mutations disabled and internal notes omitted per Lab 3.

## 2. Dashboard cards, lists and drill-downs

Requester cards: My Open Tickets, Waiting for Me, Recently Updated,
Recently Resolved. Lists: Tickets Needing Attention, Recently Updated Tickets,
Recently Resolved Tickets.

Staff/Admin cards: Open Tickets, Unassigned Tickets, My Owned Tickets,
My Active Actions. Lists: Recently Updated Tickets and My Recent Actions.
"My Actions" means recorded by the current user, not assigned to them; show
this helper text so Admin performers and staff understand the count.

Every card and list View All link uses the exact route/query in api-spec.md
Section 5. Recent links carry the original from/asOf bounds. List rows open
the role-appropriate Ticket detail; action links focus the selected action.
The /staff/actions page shows title, Ticket number, status, performer, assignee
and create time, paginated 5/10/20 with page/count feedback. It has no inline edits.

Requester ownership is never a user-selectable dashboard filter. Both dashboards
display "Recent: last 7 days" and the snapshot time in Asia/Bangkok. Counts are
backend values, not calculated from the five visible rows.

| State | Behavior |
|---|---|
| Loading | Skeleton cards/lists, polite loading announcement, no empty-state flash |
| Populated | Exact server counts, up to five records per list |
| Empty | Zero cards remain visible; each list has its own empty message and useful link |
| Refresh busy | Keep previous content visibly labelled with its prior snapshot while refreshing |
| Failure | Safe error and Retry; if prior values remain, label them stale, never current |
| Forbidden | Standard Forbidden panel with permitted navigation, no data rendered |
| Not found | Existing not-found panel when a linked Ticket/action disappears |
| Responsive | Four/two/one card columns on desktop/tablet/mobile; lists stack on mobile |

Filtered My Tickets and Staff Queue parse the new statusGroup/date bounds into
API queries. Show filter labels and Clear Filters. Browser refresh/back preserves
query state. Empty filtered results differ from an empty database.

## 3. Actions Taken: read/create/edit

The Staff Ticket Detail action panel appears before comment/note composers.
Show count and oldest-first list (createdAt ASC,id ASC), using labelled cards
on mobile. Each item shows title, Action Description, Result, performed-by,
assignee or Unassigned, status, Action create date/time, updated/completed time,
Follow-Up Required, Follow-up Note and Attachment Notes. Notes are text references
to existing attachments; this feature introduces no upload type or file access bypass.
An inactive historical assignee remains visible with an Inactive badge.

All authorized requesters see every action on their own Tickets, including
Planned and Cancelled, read-only. No private Internal Notes enter action data.

Staff and Admin see Add/Edit/Assign controls when not the Ticket requester.
RESOLVED/CLOSED/CANCELLED parents disable all action writes with an explanation;
Resolved must first be reopened. Completed/Cancelled actions remain immutable.
History opens an oldest-first append-only event list with editor identity/time,
event type and changed public fields. Requester history uses the same own-only scope.

| Field | Create | Edit |
|---|---|---|
| Title | Required, 1-120 | Editable while nonterminal |
| Action Description (details) | Required, 1-2000 | Editable while nonterminal |
| Performed by | Authenticated actor, read-only | Original creator, read-only |
| Action create date/time | Server assigned on save | Read-only Bangkok time |
| Assignee | Optional; GET /staff/action-assignees, active Staff only | Eligible Staff or Unassigned |
| Follow-Up Required | Checkbox default false | Editable |
| Follow-up Note | Required when checked, max 2000 | Same conditional validation; retain note unless cleared |
| Attachment Notes | Optional max 2000 | Editable |
| Status | Planned read-only | Current plus permitted outgoing targets only |
| Result | Not submitted on create; begins null | Optional until Completed, then required; max 2000 |

Planned -> In Progress/Cancelled; In Progress -> Completed/Cancelled.
Cancelled requires confirmation with explicit terminal warning.
Completion validates Result after trimming. Terminal rows have View/History only.
Result labels must not imply that completing an action resolves the Ticket.

Create uses one generated Idempotency-Key and the loaded Ticket version.
A network retry resends the identical payload/key; after uncertain success,
do not generate a new key automatically. Refetch after replay to get current
versions. A genuinely new action gets a new key. Save disables repeated clicking.
Edit includes both loaded versions; success refreshes action and parent summary.

## 4. Workflow and feedback

Status dropdown shows only permitted Ticket matrix edges. Staff resolution
shows completed-action prerequisite and a required Resolution Summary; preserve
a stored non-empty summary if unchanged. Show action-gate and summary errors
separately. After successful status change refresh summary/status/version.

Requester appears-resolved updates only the advisory label. Own Resolved
Tickets may reopen; explain that summary clears. Requester/Admin self-filed
views keep ordinary requester permissions without staff controls.

| State | Behavior |
|---|---|
| Loading | Scoped action skeleton, rest of Ticket stays usable |
| Empty | No actions recorded; Add CTA for permitted operator |
| Validation | Inline field error plus alert summary; keep entered text |
| Success | Announce saved/added/completed; restore focus and refresh relevant summary |
| Busy | Disable submit; visible progress; no duplicate create |
| Forbidden | Safe explanation, no mutation control or hidden data |
| Failure | Keep draft, Retry; a failed action fetch does not hide the Ticket |
| Conflict | Explain changed elsewhere; explicit Reload/compare path; never silently overwrite or auto-submit new versions |
| Not found | Safe missing record feedback and return link |
| Read-only | Labels/badges distinguish immutable data from editable fields |

On conflict, retain a local draft while loading current data. Ask the user to
review differences and explicitly resubmit; cancel discards only with confirmation.
Use safe error copy corresponding to FOLLOW_UP_NOTE_REQUIRED,
ACTION_RESULT_REQUIRED, RESOLUTION_SUMMARY_REQUIRED, ASSIGNEE_NOT_ELIGIBLE,
STALE_WRITE and IDEMPOTENCY_CONFLICT. Never expose stack traces or secrets.

## 5. Responsive and accessibility acceptance

Verify desktop 1366x900, tablet 768x1024, mobile 375x812.
Tables become labelled cards; wrap long names/descriptions and prevent horizontal
page scroll, Updated-column clipping, overlap and obscured content under navigation.
Use semantic headings, labelled inputs, inline errors with described-by,
visible keyboard focus, non-color status cues and 44px touch targets.
Dialogs trap focus, support Escape/cancel, restore triggering focus and have a
consistent full-viewport backdrop. Destructive cancellation confirmation states
its terminal effect. Announce success/loading/errors without duplicate live alerts.
User text renders escaped, with preserved whitespace and no raw HTML.

Evidence checklist for each viewport:
- [ ] Staff dashboard populated/empty/loading/forbidden/failure/refresh and drill-down.
- [ ] Requester dashboard populated/empty/attention/recent/resolved, ownership isolation.
- [ ] Actions list/create/edit/history/read-only, follow-up/result validation.
- [ ] Admin action write allowed; Requester and self-service writes forbidden.
- [ ] Assignment inactive rejection, completed/cancelled states and conflict recovery.
- [ ] Ticket resolution gate/reopen/advisory feedback and stable append-only comments/notes.
- [ ] Keyboard journey, focus, contrast, modal backdrop, clipping, overlap and overflow.
- [ ] No broken links, placeholder controls or unexpected browser console errors.

Screenshots live under artifacts/lab-04/screenshots/staff-dashboard/,
requester-dashboard/ and actions-taken/, named by state and viewport.
Store fixture role, route, test ID, viewport and expected result with evidence.
