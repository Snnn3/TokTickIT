# Lab 4 visual and accessibility checklist

Status: **Branch evidence; final manual sign-off after integration is pending**

Branch: `feature/lab4-8-e2e-visual`

Date: 2026-10-13

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
  The mobile Actions Taken capture asserts the completed card's title, result
  and performer are inside the viewport.
- [x] E4-04 captures the stale-write state with the preserved summary draft and
  the lost-response state after an identical-key retry; both have viewport
  metadata sidecars.

## Manual checks still required

- [ ] Review every screenshot at full resolution for visual overlap, clipping,
  duplicate controls, unfinished UI and placeholder copy.
- [ ] Verify color contrast ratios and status meaning without relying on color.
- [ ] Complete a keyboard-only pass through every major screen and modal,
  including focus order and focus return after dismissal.
- [ ] Complete a screen-reader pass for headings, field errors, status updates,
  dashboard metrics and read-only history.
- [ ] Repeat this checklist against the integrated `main` build before treating
  the report as a final submission.
