# Lab 3 Submission Evidence

This document is the issue #42 submission scaffold. It uses the required literal
headings and points to repository evidence. The release pull request is pending
because this implementation was requested without opening one.

## Answer Part 1

Git workflow and issue tracking are recorded in `docs/lab-03/reviewer.md` and
the repository history. This work is on `feature/lab3-8-e2e-visual`, forked from
`lab3-staging` at `0a36448`. Issue #41 is closed and its Kanban item is Done;
issue #42 is the active implementation item.

## Answer Part 2

The Lab 3 contract is in `docs/lab-03/specification.md`, `api-spec.md`, and
`ui-spec.md`. The execution plan and decision log are in the local
`docs/lab-03/plan.md`.

## Answer Part 3

The test plan, traceability table, Lab 2 disposition, measured suite counts and
M-01 migration evidence are in `docs/lab-03/tests.md` and
`server/prisma/migration-evidence/README.md`.

## Answer Part 4

AI-use prompts and reflection are recorded in `docs/lab-03/ai-use.md`.

## Answer Part 5

Authentication and the forced password-change gate are covered by
`e2e/lab-03/authentication.spec.ts`. Screenshots are in
`artifacts/lab-03/screenshots/authentication/`.

## Answer Part 6

The staff queue journey and responsive evidence are covered by
`e2e/lab-03/staff-ticket-flow.spec.ts`. Screenshots are in
`artifacts/lab-03/screenshots/staff-queue/`.

## Answer Part 7

Staff ticket detail operations and direct API authorization evidence are covered
by `e2e/lab-03/staff-ticket-flow.spec.ts`. The four refusal cases are recorded
in `artifacts/lab-03/authorization.json`; detail screenshots are in
`artifacts/lab-03/screenshots/staff-ticket-detail/`.

## Answer Part 8

Administrator search, create, edit, reset, role guards and deactivation cascade
are covered by `e2e/lab-03/user-administration.spec.ts`. Screenshots are in
`artifacts/lab-03/screenshots/user-management/`.

## Answer Part 9

Zen Green tokens, responsive rules and the visual checklist are specified in
`docs/lab-03/ui-spec.md`. Each required screen has desktop, tablet and mobile
captures under `artifacts/lab-03/screenshots/`, and the browser suite asserts no
document-level horizontal overflow.

Release integration remains pending: no pull request was opened and
`lab3-staging` was not merged to `main`, per the implementation request.
