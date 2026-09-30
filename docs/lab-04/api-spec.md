# Lab 4 API Contract

Status: **Draft contract for peer review**<br>
Version: **1.0**<br>
Date: **2026-09-22**<br>
Branch: `feature/lab4-1-contract`<br>
Issue: [#54](https://github.com/Snnn3/TokTickIT/issues/54)

Companion: [specification.md](specification.md). All paths are under /api.
Existing Lab 3 auth, password gate, cookie/CSRF, attachments and safe error
behavior remain. JSON examples below use integer IDs; response type notation
describes exact fields, not literal example JSON.

## 1. Shared types and validation

Id = positive integer; Version = integer >=1; Timestamp = UTC ISO-8601.
UserRef = {id:Id,name:string,role:REQUESTER|IT_STAFF|ADMINISTRATOR,isActive:boolean}.
Nullable references are null. No credentials or tokenVersion are exposed.

Action = {
id:Id,ticketId:Id,title:string,details:string,result:string|null,
performedBy:UserRef,assignee:UserRef|null,
status:PLANNED|IN_PROGRESS|COMPLETED|CANCELLED,
followUpRequired:boolean,followUpNote:string|null,attachmentNotes:string|null,
version:Version,createdAt:Timestamp,updatedAt:Timestamp,completedAt:Timestamp|null
}.

TicketSummary = {id:Id,number:string,summary:string,status:TicketStatus,
requestedPriority:LOW|MEDIUM|HIGH,itPriority:LOW|MEDIUM|HIGH,
owner:UserRef|null,version:Version,createdAt:Timestamp,updatedAt:Timestamp,
resolvedAt:Timestamp|null}.
ActionSummary = {id:Id,ticketId:Id,ticketNumber:string,title:string,
status:ActionStatus,performedBy:UserRef,assignee:UserRef|null,
createdAt:Timestamp,updatedAt:Timestamp,version:Version}.

title: trimmed 1-120; details (Action Description): trimmed 1-2000.
result, followUpNote, attachmentNotes: nullable, maximum 2000 after trim.
Empty nullable text normalizes to null. followUpRequired defaults false on
create; on edit omitted fields retain current values. If true, followUpNote
must be non-null. Setting it false retains an existing note unless explicitly
cleared. Completion requires non-null result. All timestamp fields, IDs,
performer and stored versions are read-only; unknown/read-only inputs return
400 VALIDATION_ERROR. Required expected-version fields are concurrency tokens,
not writable stored versions. Invalid path ID -> 400 INVALID_ID.

Error envelope:
{error:{code:string,message:string,details?:{fields?:Record<string,string>,
resource?:TICKET|ACTION_TAKEN,id?:Id,expectedVersion?:Version,currentVersion?:Version}}}.
Errors never contain hidden resource bodies, credentials or database traces.

## 2. Authorization and error precedence

All new endpoints require an active session (401 AUTH_REQUIRED); the Lab 3
password gate returns 403 PASSWORD_CHANGE_REQUIRED. Requester dashboard and
action reads scope to the caller's own Tickets. Staff/Admin can read any Ticket.
Action writes and staff workflow require IT_STAFF or ADMINISTRATOR and reject
self-requested Tickets with 403 SELF_SERVICE_FORBIDDEN. Only the assigned user
must have role IT_STAFF; this restriction never denies an Admin performer.

Validate in order: auth/password gate; route role; path syntax; resource existence;
ownership/self-service; request shape/lengths; idempotency lookup on create;
transactional versions; parent/action states; assignee eligibility; conditional
follow-up; completion/result gate; resolution summary gate. A malformed request
may fail shape validation before a domain prerequisite check.

Missing resource -> 404 NOT_FOUND; an existing other-requester Ticket -> 403
FORBIDDEN without any resource fields (same discipline as Lab 3). Mismatched
action parent -> 404 NOT_FOUND. Authenticate/authorize before revealing versions.

## 3. Action endpoints

| Endpoint | Request | Success |
|---|---|---|
| GET /tickets/:id/actions | No body/query | 200 {actions:Action[],ticketVersion:Version}; createdAt ASC,id ASC |
| GET /tickets/:id/actions/:actionId | No body/query | 200 {action:Action,ticketVersion:Version} |
| GET /tickets/:id/actions/:actionId/history | No body/query | 200 {events:ActionEvent[]}; occurredAt ASC,id ASC |
| GET /staff/action-assignees | No body/query | 200 {assignees:UserRef[]}; active IT_STAFF only, name ASC,id ASC; Staff/Admin only |
| POST /staff/tickets/:id/actions | CreateAction, Idempotency-Key header | 201 {action:Action,ticketVersion:Version} |
| PATCH /staff/tickets/:id/actions/:actionId | EditAction | 200 {action:Action,ticketVersion:Version} |

CreateAction = {title:string,details:string,assigneeId?:Id|null,
followUpRequired?:boolean,followUpNote?:string|null,attachmentNotes?:string|null,
expectedTicketVersion:Version}.
result is initially null; status PLANNED; version 1; performer is session actor;
createdAt/updatedAt are server time; completedAt null. Creation increments
parent version and updatedAt and appends a creation event.

EditAction = {expectedVersion:Version,expectedTicketVersion:Version,
title?:string,details?:string,result?:string|null,assigneeId?:Id|null,
followUpRequired?:boolean,followUpNote?:string|null,attachmentNotes?:string|null,
status?:ActionStatus}.
At least one editable field is required. Same-current status or an omitted
status permits a field edit on nonterminal actions. Outgoing edges are exactly
the specification matrix. Completing sets completedAt. Every success increments
action and parent versions, updates updatedAt on both and appends one event.

Both create and edit reject a RESOLVED/CLOSED/CANCELLED parent with
409 TICKET_NOT_ACTIVE. Editing a COMPLETED/CANCELLED action or using an illegal
edge returns 422 INVALID_ACTION_TRANSITION. There is no DELETE endpoint.

ActionEvent = {id:Id,actionId:Id,actor:UserRef,
type:CREATED|EDITED|STATUS_CHANGED|ASSIGNEE_RELEASED,
previousVersion:Version|null,newVersion:Version,occurredAt:Timestamp,
before:ActionSnapshot|null,after:ActionSnapshot}.
ActionSnapshot contains title,details,result,performedById,assigneeId,status,
followUpRequired,followUpNote,attachmentNotes,version,createdAt,updatedAt,
completedAt with the same types as Action. No secrets or internal notes.
History read permissions equal Action read permissions. No event mutation API.

### Replay and concurrent creation

Idempotency-Key is a required UUID header (this is a request key, not an entity
ID). Its scope is authenticated actor + key. Persist the canonical validated
payload including parent ID and expectedTicketVersion, the original response,
and the action atomically. A same-key/same-payload successful replay returns
the original 201 body, even if current versions changed; it is explicitly a
historical acknowledgment, so the client refetches before editing. Same key
with a changed payload -> 409 IDEMPOTENCY_CONFLICT. Concurrent duplicate
requests serialize on the unique actor/key; only one action/event is inserted.
Failed transactions do not reserve the key. Authorization is rechecked on replay.
No expiry during the lab dataset lifetime.

## 4. Versioned Ticket workflow and user cascades

GET /tickets/:id and GET /staff/tickets/:id add version and resolvedAt to the
existing ticket object. Requester/Staff list items add these fields too.
Action read/write responses expose parent ticketVersion. Clients refetch after
conflict and must not silently retry an edited payload with a new version.

These existing request bodies gain required expectedVersion:

| Endpoint | Full body | 200 response |
|---|---|---|
| PATCH /staff/tickets/:id/owner | {ownerId:Id|null,expectedVersion:Version} | {owner:UserRef|null,status:TicketStatus,version:Version} |
| PATCH /staff/tickets/:id/priority | {itPriority:LOW|MEDIUM|HIGH,expectedVersion:Version} | {itPriority:Priority,version:Version} |
| PATCH /staff/tickets/:id/status | {status:TicketStatus,resolutionSummary?:string|null,expectedVersion:Version} | {status:TicketStatus,resolutionSummary:string|null,appearsResolvedAt:Timestamp|null,resolvedAt:Timestamp|null,version:Version} |
| POST /tickets/:id/reopen | {expectedVersion:Version} | {status:REOPENED,resolutionSummary:null,appearsResolvedAt:null,resolvedAt:null,version:Version} |
| POST /tickets/:id/appears-resolved | {expectedVersion:Version} | {appearsResolvedAt:Timestamp,version:Version} |

Existing ownership/transition eligibility is unchanged. Claim is ownerId=caller,
and claiming unowned NEW also opens it atomically. Every successful route above
increments Ticket version once and updatedAt. Reopen clears summary/signal and
resolvedAt through either route. RESOLVED sets resolvedAt to server time.
Closing preserves resolvedAt. Stale versions return 409 STALE_WRITE.

All successful Staff status transitions still clear appearsResolvedAt, as in
Lab 3. Appears-resolved retains its existing 409 ALREADY_SIGNALLED behavior
and rejection on CLOSED/CANCELLED; adding versions does not remove those rules.

Into RESOLVED, completed action result is checked before summary. Omitted summary
keeps an existing valid value; explicit null/blank is rejected. Supplied summary
over 2000 characters -> 400 VALIDATION_ERROR. Both status and summary changes
commit together; the completed-action predicate is checked in that transaction.

Version scope is workflow state: owner, priority, status, advisory signal,
resolution fields and action writes/cascades. Append-only comments/notes and
attachment operations retain existing contracts and do not require or increment
workflow version, even if they update updatedAt. They do not overwrite those
workflow fields.

Existing PATCH /admin/users/:id retains Lab 3 request/safety/session rules and
adds action-assignment release to its transaction on deactivation or role change
away from IT_STAFF. Clear nonterminal action assignees, increment each action
once, each affected Ticket once, append ASSIGNEE_RELEASED events with Admin actor.
Terminal action assignments remain historical. Parent Ticket terminal status
does not prevent this integrity cascade. Ticket-owner eligibility still allows
Admin; changing Staff to Admin releases actions but not eligible Ticket ownership.
Response extends the existing user response with unassignedActionCount:number.
Existing unassignedTicketCount remains. Check last-admin/self-deactivation guards
before cascade; failed user updates change no action/Ticket. Assignment and user
eligibility changes must serialize (same user-row lock followed by parent locks).

## 5. Dashboard endpoints and metric queries

GET /dashboard/requester is available to every role in their requester capacity.
Every count/list adds requesterId=session.id; no requesterId input is accepted.
GET /dashboard/staff is Staff/Admin only. Both have no body or query and return:
{asOf:Timestamp,windowDays:7,metrics:...,lists:...}.
Use one transaction with a consistent read snapshot, server asOf, and
from=asOf-168h. Future timestamps are excluded from recent lists.

Requester metrics:
{openTickets:number,waitingForRequester:number,recentlyUpdated:number,
recentlyResolved:number}.
Requester lists:
{attentionTickets:TicketSummary[],recentTickets:TicketSummary[],
resolvedTickets:TicketSummary[]}.

Staff metrics:
{openTickets:number,unassignedTickets:number,myOwnedTickets:number,
myActiveActions:number}.
Staff lists:
{recentTickets:TicketSummary[],myRecentActions:ActionSummary[]}.

Open set = NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED.
Every list below is limited to five; ASC is never used for dashboard ranking.

| Metric/list | Authoritative predicate | List order | Drill-down destination |
|---|---|---|---|
| Requester openTickets | Own; status in open set | n/a | /tickets?statusGroup=open |
| Requester waitingForRequester / attentionTickets | Own; status=WAITING_FOR_REQUESTER | updatedAt DESC,id DESC | /tickets?status=WAITING_FOR_REQUESTER |
| Requester recentlyUpdated / recentTickets | Own; updatedAt in [from,asOf] | updatedAt DESC,id DESC | /tickets?dateField=updatedAt&from={from}&to={asOf} |
| Requester recentlyResolved / resolvedTickets | Own; status RESOLVED/CLOSED; resolvedAt in [from,asOf] | resolvedAt DESC,id DESC | /tickets?statusGroup=resolved&dateField=resolvedAt&from={from}&to={asOf} |
| Staff openTickets | All; status in open set | n/a | /staff/queue?statusGroup=open |
| Staff unassignedTickets | Open set; ownerId=null | n/a | /staff/queue?statusGroup=open&owner=unassigned |
| Staff myOwnedTickets | Open set; ownerId=session.id | n/a | /staff/queue?statusGroup=open&owner=mine |
| Staff myActiveActions | performedById=session.id; status PLANNED/IN_PROGRESS, including read-only parents | n/a | /staff/actions?performedBy=me&statusGroup=active |
| Staff recentTickets | updatedAt in [from,asOf] | updatedAt DESC,id DESC | /staff/queue?dateField=updatedAt&from={from}&to={asOf} |
| Staff myRecentActions | performedById=session.id; createdAt in [from,asOf] | createdAt DESC,id DESC | /staff/actions?performedBy=me&from={from}&to={asOf} |

Empty -> zeros and empty arrays, never null or 404. Detail links use
/tickets/:id for requester and /staff/tickets/:id for Staff/Admin.
Legacy null resolvedAt rows remain in totals but not recentlyResolved.
Recent updated intentionally includes old Tickets updated within the last week.

### Drill-down APIs

Existing GET /tickets and GET /staff/tickets retain their envelopes and filters.
Add statusGroup=open|resolved (resolved means RESOLVED/CLOSED; cannot combine
with status), dateField=updatedAt|resolvedAt, from/to UTC ISO timestamps.
Date filters require all three fields and from<=to. Apply filters conjunctively.
Requester scope always remains own. When dateField is present it is the primary
DESC sort with id DESC tie-break; conflicting sort/order inputs return
400 INVALID_QUERY. Without date filters prior sort defaults remain unchanged.
The UI transfers the dashboard's fixed bounds into these queries.

GET /staff/actions supports performedBy=me (required), statusGroup=active
(optional), from/to inclusive createdAt bounds (both or neither),
page>=1 default1, pageSize=5|10|20 default10. Staff/Admin only; unknown/invalid
query ->400 INVALID_QUERY. Response:
{actions:ActionSummary[],page:number,pageSize:number,total:number,totalPages:number};
createdAt DESC,id DESC, totalPages=0 if empty. Actor scope is performedBy,
not assignee, so Admin performers see their own work. This list is read-only,
with links to parent Ticket detail.

## 6. Safe status/error contract

| Status/code | Defined case |
|---|---|
| 400 VALIDATION_ERROR | Shape/type/length, unknown fields, invalid key or missing version |
| 400 INVALID_ID / INVALID_QUERY | Path/query validation respectively |
| 400 FOLLOW_UP_NOTE_REQUIRED | followUpRequired=true and normalized note null |
| 400 ACTION_RESULT_REQUIRED | Completing with null/blank result, or resolving without completed result |
| 400 RESOLUTION_SUMMARY_REQUIRED | Missing/explicitly blank/null resolution summary |
| 401 AUTH_REQUIRED | Missing, expired, inactive or revoked session |
| 403 PASSWORD_CHANGE_REQUIRED | Lab 3 gate |
| 403 FORBIDDEN / SELF_SERVICE_FORBIDDEN | Role/ownership or own-ticket staff mutation |
| 404 NOT_FOUND | Missing resource or mismatched action parent |
| 409 STALE_WRITE | Old action or Ticket version; no partial writes |
| 409 IDEMPOTENCY_CONFLICT | Same actor/key with changed creation payload |
| 409 TICKET_NOT_ACTIVE | Action write under RESOLVED/CLOSED/CANCELLED |
| 422 ASSIGNEE_NOT_ELIGIBLE | Non-null assignee ID missing, inactive or not IT_STAFF |
| 422 INVALID_ACTION_TRANSITION | Invalid edge or terminal action edit |
| 422 INVALID_TRANSITION | Existing Ticket transition matrix rejection |
| 500 UNEXPECTED | Safe generic failure; no database/stack details |

STALE_WRITE details identify only an authorized target resource, id,
expectedVersion,currentVersion. If both action and parent are stale, report
parent first. Wrong-length result is VALIDATION_ERROR; normalized blank result
during completion is ACTION_RESULT_REQUIRED. This precedence is shared by tests
and UI. Existing auth throttling and Admin conflict codes remain unchanged.
