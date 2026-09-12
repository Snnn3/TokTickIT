# Lab 3 UI Specification — Zen Green Extensions

Version: 2.1 | Date: 2026-09-13 | Companion to `specification.md`.

## 1. Tokens and rules (reused from Lab 2, extended)

Reuse the Lab 2 tokens defined in `client/src/index.css`: primary `#006B3C`, secondary `#0B7A46`, pale `#EAF6EF`, page `#F5F7F6`, surface `#FFFFFF` with border `#E2E8E4`, text `#22332B` / muted `#5B6B62`, editable `#FFFFFF` with border `#C9D2CC`, read-only `#EEF3EF`, error `#B3261E`, warning `#B7791F`, success `#1F7A45`. Same typography, 4px grid, 6px/8px radii, 38px inputs, labels above controls, red asterisk for required fields (never replacing the message), messages below fields, 2px secondary focus outline, busy-disabled controls, live-region announcements, WCAG AA contrast.

New badges (text always present; colour is never the sole indicator):

| Badge | Fill | Text |
|---|---|---|
| Status New / Open / In Progress / Waiting for Requester / Reopened | pale-to-green scale | uppercase label |
| Status Resolved | success pale | `RESOLVED` |
| Status Closed / Cancelled | neutral grey (terminal) | uppercase label |
| Requested Priority LOW/MEDIUM/HIGH | Lab 2 scale | label |
| IT Priority LOW/MEDIUM/HIGH | same scale with an `IT` prefix | e.g. `IT · HIGH` |
| Role REQUESTER / IT_STAFF / ADMINISTRATOR | neutral / green / dark | label |
| Account Active / Inactive | success pale / grey | label |
| Appears resolved | amber pale with a check outline | `REQUESTER SAYS FIXED` |
| Internal Note marker | amber-tinted surface + lock icon | `INTERNAL` |

Public Comments use white cards; Internal Notes use amber-tinted cards with a lock icon and an `INTERNAL — Staff only` caption, so private content can never be mistaken for public.

## 2. Routing and application shell (authenticated)

Client routing uses **react-router** (D8). Every screen has a real URL so it is deep-linkable for E2E specs and screenshot capture:

| Route | Screen | Guard |
|---|---|---|
| `/login` | Login | redirects to the role landing if already authenticated |
| `/change-password` | Change Password gate | authenticated only; forced while `mustChangePassword` |
| `/tickets`, `/tickets/new`, `/tickets/:id` | Requester screens | any authenticated role (FR-27) |
| `/staff/queue`, `/staff/tickets/:id` | Staff Queue and Detail | IT Staff or Administrator |
| `/admin/users` | User Management | Administrator |
| `*` | Not found | authenticated shell |

Guards are convenience only — the identical checks are enforced by the server on every request, so a hand-typed URL still fails with `403`/`401` (handout §4.3: hiding a control is not authorization). While `mustChangePassword=true` every route other than `/change-password` redirects to it. An unauthenticated user reaching any protected route is redirected to `/login`. A permitted-but-wrong-role route renders a forbidden panel with a back action rather than a blank page.

Header: primary-green bar with the brand `TokTickIT` at left; centre navigation filtered by role (all roles: My Tickets, Create Ticket; IT Staff and Administrator additionally: Ticket Queue; Administrator additionally: Users); right chip `Signed in as <name>` with a role badge plus a Logout button. A Requester lands on `/tickets`, IT Staff on `/staff/queue`, and an Administrator on `/admin/users`; the `/login` guard sends an already-authenticated user to that same landing route. Differing landing routes are the only sense in which the roles are "separate", since ticket permissions are shared (D2). Active link gets a pale underline. Below 768px the nav collapses to a hamburger with stacked links and Logout. Content is centred at max-width 1100px.

## 3. Login

Centred card of about 420px: title, Email input, Password input with a show/hide toggle carrying an `aria-label`, and a full-width primary Sign In button. States: initial | inline per-field validation | busy (spinner, controls disabled) | failure (safe banner). A wrong password, an unknown email, an inactive account and a throttled response all render **the same** banner text, so the screen leaks nothing (BR-01, BR-21). Tab and Enter both work with a visible focus ring. On success the app navigates to `/change-password` when the flag is set, otherwise to the role landing route.

## 4. Change Password (mandatory gate)

Centred card: explanatory text ("You must change your password to continue"), Current password (shown only when not a first login), New password and Confirm inputs, and a **live-validating checklist** matching the handout mockup:

* at least 8 characters
* includes upper and lower case letters
* includes a number
* includes a special character

Each rule shows an unmet and a met state as text plus icon, updating as the user types, and the Save button stays disabled until every rule and the confirmation match. A Logout tertiary action is always available so a user is never trapped. States: validation | busy | success (continuation into the app) | safe failure banner.

## 5. Requester screens and comments

My Tickets, Create Ticket and Ticket Detail keep their Lab 2 layout and states; identity now comes from the shell rather than a selector, and the Requester Selection screen and dev chip are deleted. **These screens are available to every role** (FR-27), so an IT Staff user sees My Tickets and Create Ticket alongside the queue.

Ticket Detail adds:

* a Public Comments section — list ascending, textarea with a 2000-character counter, Post button, and a `No comments yet` empty state;
* an appears-resolved action with a confirmation dialog and a success banner reading `Marked as appears resolved — IT Staff will verify`, plus the amber badge once set;
* a **Reopen** action, shown only when the ticket status is Resolved, with a confirmation dialog (D4);
* a read-only **Resolution Summary** panel when the ticket has one.

The Internal Notes section is never rendered for a requester viewing their own ticket, whatever their role. The attachment section is unchanged from Lab 2.

## 6. Staff Ticket Queue

Toolbar: search (`Search number or summary`, 300ms debounce) | Status, Category, Req Priority, IT Priority and Owner selects | Sort (Last Updated / Created / Number × asc/desc) | Clear filters tertiary | result-count caption. The Owner select offers `All owners` (default), `Assigned to anyone`, `Assigned to me`, `Unassigned` — four options covering the three documented `owner` values plus the unfiltered default, so no validated query value is unreachable from the UI, and the queue **loads unfiltered by default** so unclaimed work is the first thing visible (D12).

Desktop ≥992px table: Number | Created | Summary | Category | Req Pri | IT Pri | Status | Owner | Updated | Open. Tablet 768–991px: the same minus Category. Mobile <768px: cards with a number-plus-badges header, summary, owner/updated caption, tappable to detail. Unassigned rows render `Unassigned` in muted text rather than an empty cell. A ticket carrying `appearsResolvedAt` shows the amber badge in the row.

Pagination bar: prev/next, `Page X of Y (N tickets)`, and a page-size select of {5, 10, 20}. States: loading skeletons | empty (`No tickets in queue`) | no-results (`No tickets match your filters` plus a Clear action) | forbidden | failure banner with a Retry that preserves the current query.

## 7. Staff Ticket Detail

Grouped read-only cards: System (Number, Date, Status badge, Requester, Owner) | Classification (Category, Related System, Requested Priority, IT Priority) | Description with whitespace preserved | an appears-resolved banner when flagged.

Operational card (IT Staff and Administrator only): Owner select listing active Staff and Admin users plus `Unassigned`, with a prominent **Claim** shortcut that assigns the current user; IT Priority select; Status select restricted to the legal targets for the current status, with a confirmation dialog for Closed and Cancelled (this confirmation is client-side only — the server takes no confirm flag); and a **Resolution Summary** textarea that becomes required and focused when Resolved is chosen. Each control saves independently with inline busy, success and failure feedback. Illegal transitions are not offered in the select, and a rejected transition surfaces the server message rather than a generic error.

When the viewing user is the ticket's own requester, the screen still loads (the server returns the ticket with a `selfService` marker and no internal notes) but the entire operational card is replaced by an explanatory panel — `You filed this ticket, so it must be handled by another staff member` — and the Internal Notes card is absent (BR-25). Reading is allowed precisely so that the Open action on a queue showing all tickets never dead-ends; every mutating request is still refused by the server regardless of what the client renders.

Comments card (white) and Internal Notes card (amber, lock icon, `Private — never shown to the Requester` warning) each carry a list, a textarea and a Post button. The Attachments card is carried over from Lab 2. **There is no Service Actions tab** — that feature is excluded from Lab 3 (§4.2).

## 8. Administrator User Management

A single screen: header with a Create User primary button; toolbar with a search input (`Search name or email`) and a role filter (`All roles` / Requester / IT Staff / Administrator); a desktop table of Name | Email | Role badge | Status badge | Actions (Edit and Reset password), becoming cards below 768px. There is no pagination and no multi-column sorting, both excluded by §8.5.

Create and Edit dialogs carry Name, Email, a single Role select, an Active toggle, and — on create and reset only — a password field with the same live checklist as §4. Inline validation covers duplicate email, invalid role and every unmet password rule. A Reset Password dialog from the row action sets the change-required flag and confirms success while stating that the user must change it at next login.

Guard feedback: attempting to deactivate your own account or to remove the last active Administrator shows a blocking error and leaves the state unchanged. Deactivating a user who owns tickets shows a confirmation naming the count first (taken from `ownedOpenTicketCount` on the user list, which is why that field exists), and the success message reports how many tickets were returned to the unassigned pool (BR-24). States: loading | empty (`No users yet`) | no-results | forbidden for non-Administrators | failure with Retry.

## 9. Screen modes and feedback

Modes: Login (idle/busy), Change Password (gate/open), Queue (browse), Staff Detail (view/operate per field), Users (list/create/edit/reset). Every screen implements loading, validation, busy, success, empty vs no-results, forbidden, not-found, conflict (duplicate email, illegal transition, admin guards) and safe API-failure feedback wherever meaningful. No separate formal state is invented per error.

## 10. Responsive and accessibility

| Viewport | Rule |
|---|---|
| Desktop ≥992px | Multi-column as specified; centred max-width |
| Tablet 768–991px | Two columns where practical; queue drops the Category column |
| Mobile <768px | Vertical stack; 44px touch targets; no horizontal page scroll |
| All | No clipping, overlap or hidden buttons; badges always keep their text; dialogs trap focus and close on Escape; icon-only controls carry an `aria-label`; errors and success are never colour-only |

## 11. Visual checklist and screenshots

Checklist per screen per viewport (1366×768, 768×1024, 375×667): tokens match Lab 2; editable versus read-only shading distinct; public versus internal unmistakable; asterisks and messages correctly placed; button hierarchy and busy states correct; badges consistent; no clipping, overlap or horizontal scroll; empty versus no-results versus forbidden visibly distinct; keyboard-only pass.

Screenshots: `artifacts/lab-03/screenshots/authentication/`, `staff-queue/`, `staff-ticket-detail/`, `user-management/`, each containing `desktop.png`, `tablet.png` and `mobile.png`.
