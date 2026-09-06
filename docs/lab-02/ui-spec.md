# Lab 2 UI Specification - Zen Green Design System

Version: 1.0 | Date: 2026-08-24 | Companion to `specification.md`.

## 1. Color Tokens

| Token | Value | Usage |
|---|---|---|
| primary-green | #006B3C | app header bg, primary buttons, strong emphasis |
| secondary-green | #0B7A46 | active tabs, focus accents, links, hover states |
| pale-green | #EAF6EF | selected rows, success surfaces, subtle section emphasis |
| page-bg | #F5F7F6 | page background |
| surface | #FFFFFF | cards, panels; subtle border #E2E8E4 + restrained shadow |
| text-primary | #22332B | dark charcoal-green body text (never pure black) |
| text-muted | #5B6B62 | secondary text, captions |
| editable-field | #FFFFFF | white bg + neutral border #C9D2CC |
| readonly-field | #EEF3EF (gray-green) or ivory #FAF7EC | clearly distinct, still readable; not focusable-editable |
| error | #B3261E | error text/border; message directly below its field |
| warning | #B7791F amber | warning callouts/badges only - never decoration |
| success | #1F7A45 on #EAF6EF | confirmations; always paired with text/icon, never color alone |

## 2. Typography and Spacing

- Font stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Scale: H1 24px/600, H2 18px/600, H3 16px/600, body 14px/400, small 12px/400, labels 13px/600.
- Spacing base 4px grid: form gaps 16px; section gaps 24px; card padding 16-24px.
- Radius: inputs/buttons 6px; cards 8px. Inputs uniform height 38px (Description textarea 120px min,
  resizable unless layout breaks).

## 3. Component States and Buttons

Control states: default, hover, focus (2px secondary-green outline, offset 1px, never removed),
disabled (opacity .5, cursor not-allowed, cannot activate), invalid (error border + message below),
read-only (shaded per token, not editable).

Button hierarchy:

| Variant | Style |
|---|---|
| Primary | #006B3C bg, white text; hover #0B7A46 |
| Secondary | white bg, 1px #006B3C border, green text |
| Tertiary/link | green text link style |
| Destructive | #B3261E bg, white text (attachment Remove) |
| Disabled | grayed, reduced opacity |
| Busy | spinner replaces label area, stays disabled until settled |

Labels above controls; required fields carry a red asterisk AFTER the label text; asterisk never
replaces the validation message. Validation messages appear immediately below their own field.

## 4. Badges

| Badge | Fill | Text/border | Non-color cue |
|---|---|---|---|
| Status NEW | #EAF6EF | #006B3C | uppercase label "NEW" |
| Priority LOW | #F0F2F1 | #5B6B62 | label "LOW" |
| Priority MEDIUM | #CFE8DA | #0B7A46 | label "MEDIUM" |
| Priority HIGH | #006B3C | #FFFFFF | label "HIGH" |
| Removed attachment | #F0F2F1 | #5B6B62 + strikethrough filename | disabled actions |

Badge text is ALWAYS present (labsheet 8.8 consistency check across screens).

## 5. Application Shell

- Header: primary-green bar; left brand "TokTickIT"; center/right nav links My Tickets, Create Ticket;
  right requester chip "Signed in as <name> (dev)" + Change Requester button; active nav link gets
  pale-green underline/bg + secondary-green text.
- Mobile <768px: hamburger toggling a stacked menu containing both nav links + Change Requester;
  chip collapses into menu.
- Footerless; content column max-width 1100px centered on >=992px.

## 6. Screen: Requester Selection

Layout (centered card ~420px): TokTickIT title; explanatory text exactly conveying: this selector is
used for Lab 2 testing only, not a login screen; authentication arrives in Lab 3; dropdown
"Development Requester" (label above, required); Continue primary button full-width.

States: initial (dropdown enabled) | loading (skeleton/spinner in card) | empty ("No active
requesters available" + retry) | failure (warning-styled safe error + Retry) | selected (navigates
in). Keyboard: dropdown and button reachable via Tab; Enter submits; visible focus rings [AC-24].

## 7. Screen: Create Ticket

Desktop grouping (>=992px two columns where noted):

1. **System** group (read-only strip): Ticket Number ("Generated after submission"), Ticket Date
   ("Generated after submission"), Requester (prefilled from session) - all readonly-shaded.
2. **Classification**: Category select | Related System select (two columns); Requested Priority
   select (segmented radio-style acceptable) - full width or third column.
3. **Details**: Summary input full width; Description textarea full width (min 120px).
4. **Attachments**: list of staged files with name+size+remove icon (icon has aria-label+tooltip);
   Add files button (accept=".jpg,.jpeg,.png,.webp,.pdf"); per-file client pre-checks type/size [AC-07, AC-08].
5. **Actions** bottom-right: Submit primary; Cancel secondary (returns to My Tickets).

States: initial | loading reference data (selects show loading option, submit disabled) |
validation (inline messages per offending field) | submitting (busy button, all controls disabled)
[AC-21] | success (pale-green panel: big official Ticket Number, "View my tickets" action) [AC-01] |
API failure (error banner above actions, ALL values retained) [AC-20] | invalid attachment (per-file
message row). No mysterious top-only errors.

Mobile: groups stack in listed order; sticky-feel bottom action row; touch targets >=44px; zero
horizontal scroll [AC-22].

## 8. Screen: My Tickets

Toolbar: search input (placeholder "Search number or summary", debounced 300ms) | Category filter
select | Priority filter select | Status filter select (NEW fixed option) | Sort control
(Last Updated / Created / Number x asc/desc) | Clear filters tertiary | Create Ticket primary button.

List desktop >=992px table columns: Number | Summary | Category | Priority badge | Status badge |
Last Updated | View action-link. Tablet: same minus Category column. Mobile <768px: cards -
number+badges header line, summary line, updated caption, whole card clickable [AC-22].

Pagination bar: prev/next + page indicator "Page X of Y (N tickets)"; pageSize select {5,10,20}.

States: loading (table skeletons / card skeletons) | empty (illustration-free friendly panel:
"No tickets yet - Create your first ticket" + CTA) | no-results ("No tickets match your filters"
+ Clear filters) distinct from empty [AC-17] | API failure (banner + Retry keeps last query).

## 9. Screen: Ticket Detail (+ Attachment Section)

Read-only ticket info grouped in cards, all values readonly-shaded: System group (Number, Date,
Status badge, Requester) | Classification (Category, Related System, Priority badge) | Description
(preserved whitespace) | meta footer (created/updated timestamps). A subtle "Edit comes later"
affordance is NOT shown - view mode only [AC-23].

Attachment Section (separate card): header + Add attachment button (hidden/disabled at limit).
Rows: filename (link when active), size, uploaded date, Download secondary-button (icon+text),
Remove destructive-button. States per row: active | uploading (busy) | invalid (message) |
removed (badge Removed, strikethrough, actions disabled, reason tooltip/caption) | unavailable
(download failed - retry). Remove opens dialog: shows filename, mandatory Reason textarea
(<=300 chars), Cancel secondary / Remove destructive; removing without valid reason impossible [AC-12].
Removed items keep metadata visibility forever [AC-11].

## 10. Accessibility

Every input has a programmatic label; icon-only controls carry aria-label AND tooltip; focus order
follows visual order; dialogs trap focus and close on Escape; status messages announced politely
(live region); contrast meets WCAG AA for text tokens; error/success never conveyed by color alone.

## 11. Responsive Rules

| Viewport | Rule |
|---|---|
| Desktop >=992px | Multi-column as specified; centered max-width |
| Tablet 768-991px | Two-column where practical; Summary/Description keep width |
| Mobile <768px | Vertical stack; 44px touch targets; NO horizontal page scrolling |
| All sizes | No clipped labels, overlapping messages, hidden buttons, unreadable filenames |

## 12. Visual Inspection Checklist + Screenshots

Checklist (run per screen per viewport): colors match tokens; editable vs read-only distinct;
asterisks + messages placement correct; button hierarchy respected; busy states shown; badges
consistent; no clipping/overlap/horizontal scroll; empty vs no-results distinct; attachment rows
render correctly in all five states; keyboard-only pass.

Screenshots saved by E2E suite to:
`artifacts/lab-02/screenshots/create-ticket/{desktop,tablet,mobile}.png`
`artifacts/lab-02/screenshots/my-tickets/{desktop,tablet,mobile}.png`
`artifacts/lab-02/screenshots/ticket-detail/{desktop,tablet,mobile}.png`
Viewports: 1366x768, 768x1024, 375x667.
