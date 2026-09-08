# Lab 3 UI Specification — Zen Green Extensions

Version: 1.0 | Date: 2026-09-08 | Companion to `specification.md`.

## 1. Tokens and rules (reused from Lab 2, extended)

Reuse Lab 2 tokens: primary `#006B3C`, secondary `#0B7A46`, pale `#EAF6EF`, page `#F5F7F6`, surface `#FFFFFF` + border `#E2E8E4`, text `#22332B` / muted `#5B6B62`, editable `#FFFFFF` + `#C9D2CC`, readonly `#EEF3EF` or ivory `#FAF7EC`, error `#B3261E`, warning `#B7791F`, success `#1F7A45` on `#EAF6EF`. Same typography, 4px grid, 6px/8px radii, 38px inputs, labels above controls, red asterisk for required (never replaces message), messages below fields, 2px secondary focus outline, busy-disabled controls, live-region announcements, WCAG AA contrast.

New badges (text always present, color never sole indicator):

| Badge | Fill | Text |
|---|---|---|
| Status New/Open/In Progress/Waiting/Resolved/Closed/Reopened/Cancelled | pale/green scale per table + neutral for Closed/Cancelled | uppercase label |
| Requested Priority LOW/MEDIUM/HIGH | Lab 2 scale | label |
| IT Priority LOW/MEDIUM/HIGH | same scale + `IT` prefix | e.g. `IT · HIGH` |
| Role REQUESTER/IT_STAFF/ADMINISTRATOR | neutral/green/dark | label |
| Account Active/Inactive | success pale / gray | label |
| Internal Note marker | amber-tinted surface + lock icon + `INTERNAL` label | never confusable with public |

Public Comments use white cards; Internal Notes use amber-tinted cards with lock icon and `INTERNAL — Staff only` caption.

## 2. Application shell (authenticated)

Header primary-green bar: brand `TokTickIT` left; center nav role-filtered (Requester: My Tickets, Create Ticket; Staff: Ticket Queue; Admin: Users); right chip `Signed in as <name> · <role badge>` + Logout button. Active link pale underline + secondary text. Mobile <768px hamburger with stacked nav + logout. Content max-width 1100px centered. Unknown-role or logged-out routes redirect to Login; unauthorized role renders forbidden panel + back action.

## 3. Login

Centered card ~420px: title, Email input, Password input (show/hide toggle with aria-label), Login primary full-width. States: initial | validation (inline per field) | busy (spinner, disabled) | failure (safe banner, no enumeration) | inactive (same safe banner). Keyboard Tab/Enter, visible focus. Success navigates: change-required → Change Password, else role landing.

## 4. Change Password (mandatory gate)

Centered card: explanatory text (initial password must be changed), New password + Confirm inputs, policy caption `8–72 characters`, Save primary + Logout tertiary. Router gate: while `mustChangePassword=true` all other screens replaced by this screen. States: validation (length/mismatch) | busy | success (continuation into app) | failure (safe banner).

## 5. Requester regression + comments

My Tickets, Create Ticket, Ticket Detail keep Lab 2 layout/states; identity now from shell (no selector). Detail adds: Public Comments section (list asc + textarea + Post button, 2000-char counter, empty state `No comments yet`), appears-resolved button (confirm dialog → success banner `Marked as appears resolved — IT Staff will verify`). Notes section never rendered for Requester. Attachment section unchanged.

## 6. Staff Ticket Queue

Toolbar: search (`Search number or summary`, 300ms debounce) | Status, Category, Req Priority, IT Priority, Owner (`All/Assigned/Unassigned/Mine`) selects | Sort (Last Updated/Created/Number × asc/desc) | Clear filters tertiary | result count caption. Desktop ≥992px table: Number | Created | Summary | Category | Req Pri | IT Pri | Status | Owner | Updated | Open link. Tablet 768–991px: same minus Category. Mobile <768px: cards (number + badges header, summary, owner/updated caption, tappable). Pagination bar prev/next + `Page X of Y (N tickets)` + pageSize {5,10,20}. States: loading skeletons | empty (`No tickets in queue`) | no-results (`No tickets match` + Clear) | forbidden | failure (banner + Retry keeps query).

## 7. Staff Ticket Detail

Grouped cards: System (Number, Date, Status badge, Requester, Owner) | Classification (Category, System, Req Priority, IT Priority) | Description (whitespace preserved) | Appears-resolved banner if flagged. Operational card (Staff/Admin only): Owner select (active Staff/Admin + Unassigned), IT Priority select, Status select + confirm for Closed/Cancelled, Save per field with busy/success/failure inline. Comments card (white) + Internal Notes card (amber, lock) each with list, textarea, Post; notes card carries `Private — never shown to Requester` warning. Attachments card carried from Lab 2. Validation, confirm, and safe-failure states per control.

## 8. Administrator User Management

Single screen: header + Create User primary; toolbar search (`Search name or email`) + role filter (`All roles/Requester/IT Staff/Administrator`); desktop table Name | Email | Role badge | Status badge | Edit action; mobile cards. Create/Edit dialogs: Name, Email, Role select (one), Active toggle, Initial/New password (create/reset only) with policy caption; inline validation (duplicate email, bad role, length). Reset-password dialog from row action sets change-required flag with success confirmation. Self-deactivate and last-admin attempts show blocking error and leave state unchanged. States: loading | empty (`No users yet`) | no-results | forbidden (non-Admin) | failure + Retry.

## 9. Screen modes and feedback

Modes: Login (idle/busy), Change Password (gate/open), Queue (browse), Detail (view/operate per field), Users (list/create/edit/reset). Every screen implements loading, validation, busy, success, empty/no-results, forbidden, not-found (detail/users), conflict (duplicate/transition/guards), and safe API-failure feedback where meaningful. No separate formal state invented per error.

## 10. Responsive and accessibility

| Viewport | Rule |
|---|---|
| Desktop ≥992px | Multi-column as specified; centered max-width |
| Tablet 768–991px | Two-column where practical |
| Mobile <768px | Vertical stack; 44px targets; no horizontal page scroll |
| All | No clipping/overlap/hidden buttons; badges keep text; dialogs trap focus + Escape; icon-only controls have aria-label + tooltip; errors/success never color-only |

## 11. Visual checklist + screenshots

Checklist per screen per viewport (1366×768, 768×1024, 375×667): tokens match; editable vs readonly distinct; public vs internal unmistakable; asterisks + messages placed; button hierarchy + busy correct; badges consistent; no clipping/overlap/scroll; empty vs no-results distinct; keyboard-only pass.

Screenshots: `artifacts/lab-03/screenshots/authentication/`, `staff-queue/`, `staff-ticket-detail/`, `user-management/` each with `desktop,tablet,mobile.png`.
