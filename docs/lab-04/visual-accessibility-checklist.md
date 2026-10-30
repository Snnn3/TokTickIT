# Lab 4 visual and accessibility checklist

Status: **Screenshot review, contrast checks, queue keyboard spot-check and Admin button confirmation complete on the feature branch; full keyboard, screen-reader and integrated-main sign-off pending**

Branch: `feature/lab4-8-e2e-visual`

Date: 2026-10-30

This checklist records what the automated browser runs and screenshot review
prove. A checked automated assertion is not a substitute for a final manual
screen-reader, contrast or cross-screen review on the integrated `main` build.

## Evidence-backed checks

- [x] Zen Green is consistently used by the shared shell, status badges,
  dashboard cards and action panels in the inspected desktop/mobile captures.
  Compare `artifacts/lab-04/screenshots/staff-dashboard/populated-desktop.png`,
  `artifacts/lab-04/screenshots/actions-taken/populated-mobile.png`, and
  `artifacts/lab-04/screenshots/ticket-workflow/requester-reopened-mobile.png`.
- [x] Keyboard focus is asserted for dashboard drill-downs and the Actions
  Taken confirmation dialog; validation stays with the invalid field/form.
  See `e2e/lab-04/dashboards.spec.ts`,
  `e2e/lab-04/actions-taken-flow.spec.ts`, and
  `client/src/__tests__/lab-04/TicketWorkflow.test.tsx`.
- [x] Controls exercised in the browser have semantic roles and labels; tests
  locate fields by label and actions by role/name instead of positional CSS.
- [x] Staff/Admin can create and update Actions Taken while Requester history
  remains read-only. The E2E evidence includes a requester history capture.
- [x] Required follow-up validation is shown beside the Action Taken editor;
  the invalid form is not submitted.
- [x] Dashboard, Actions Taken, Ticket workflow, requester regression and Admin
  layout tests assert that document width does not exceed the viewport. The
  Admin navigation now collapses at tablet width instead of overflowing at
  768px.
- [x] Tablet/mobile evidence is recorded with its actual viewport in JSON
  sidecars. Lab 4 mobile captures use a viewport screenshot and scroll the
  relevant panel into view, avoiding a fixed header stamped into the middle of
  a stitched full-page image.
- [x] Requester populated tablet evidence uses the required 768x1024 viewport.
  The mobile Actions Taken capture at the required 375x812 viewport asserts the
  heading, Add Action control and completed card details remain clear of the
  sticky navbar and inside the viewport.
- [x] E4-04 captures the stale-write state with the preserved summary draft and
  the lost-response state after an identical-key retry; both have viewport
  metadata sidecars.
- [x] Reviewed all 27 Lab 4 and 5 Lab 3 report screenshots (32 total) at
  original image resolution. No overlap or unexpected overflow was visible in the captured
  viewports. Mobile screenshots show the viewport, not an entire long page.
- [x] Calculated WCAG contrast ratios for the text colors against their paired
  surfaces. The corrected secondary, warning and success colors are 4.75:1,
  5.40:1 and 5.42:1; the input border is 3.50:1 against the page background.
  Status words accompany the colors in the reviewed states.
- [x] Confirm the Create user control's enabled appearance in the live Admin
  view. On 2026-10-30 it was green, not disabled in the accessibility tree, and
  opened the dialog when activated. The dialog was closed without submitting.

## Manual checks still required

- [x] Review every report screenshot at full resolution for visual overlap,
  clipping, duplicate controls, unfinished UI and placeholder copy.
- [x] Verify the measured text contrast ratios and that status meaning is
  communicated by visible labels as well as color.
- [x] Complete a keyboard-only spot-check on the Lab 4 Staff Queue: Search,
  filters, sorting, first ticket card and Open action were reachable in order;
  disabled Clear filters was skipped. This does not cover every screen/modal.
- [ ] Complete the full cross-screen keyboard-only pass and verify focus return
  after each modal dismissal.
- [ ] Complete a screen-reader pass for headings, field errors, status updates,
  dashboard metrics and read-only history. The UI accessibility tree was
  inspected, but spoken output was not verified.
- [ ] Repeat this checklist against the integrated `main` build before treating
  the report as a final submission.
