# Lab 4 Actions Taken migration and recovery notes

The migration `20260930130000_lab04_actions_foundation` is additive. It adds
the parent Ticket version/resolution fields and the `ActionTaken`,
`ActionEvent`, and `ActionCreationRequest` tables. It does not rewrite or
delete existing Users, Tickets, Attachments, PublicComments, or InternalNotes,
and it does not fabricate historical Actions Taken.

## Preflight preservation procedure

Run this against a disposable copy of the Lab 3 database, never against a
shared production database:

1. Run `npx tsx prisma/migration-evidence/capture.ts before` against the
   disposable copy. It records the existing User, Ticket, Attachment,
   PublicComment and InternalNote row counts, every Ticket
   id/number/requester relation, and every Attachment id, size and byte
   checksum.
2. Take a database backup with the PostgreSQL toolchain used by the environment.
3. Apply the migration with `npx prisma migrate deploy` from `server/`.
4. Run `npx tsx prisma/migration-evidence/capture.ts after` before seeding.
   The checked-in capture script verifies every legacy row count, Ticket number
   and requester relation, Attachment checksum, `version = 1`, and empty
   `ActionTaken`, `ActionEvent`, and `ActionCreationRequest` tables. The
   migration creates no backfill rows.
5. Run `npm run db:seed` twice. The second run must keep the same seeded Ticket,
   Action Taken and event counts and must not duplicate fixture events.
6. Compare the post-migration inventory with the preflight inventory. Ticket
   numbers, requester relations, attachment bytes, comments and notes must be
   unchanged.

The checked-in `capture.ts` script records the Lab 3 Ticket, Attachment,
PublicComment, InternalNote and Lab 4 migration-only invariants. The
foreign-key definitions, delete guard, backup/restore and seed-repeat checks
are separate SQL/toolchain checks recorded below.

## Expected fresh-seed fixture shape

The seed contains eight Actions Taken across the stable demo Tickets:

| Check | Expected result |
|---|---|
| Ticket relation cardinality | At least two zero-action Tickets, one one-action Ticket and two multi-action Tickets |
| Action statuses | PLANNED, IN_PROGRESS, COMPLETED and CANCELLED are all represented |
| Performer roles | IT_STAFF and ADMINISTRATOR performers are represented |
| Assignee eligibility | Every non-null assignee is active IT_STAFF; inactive staff remain potential users only |
| Follow-up data | Both false/no-note and true/required-note examples are represented |
| Audit data | One CREATED event per seeded Action Taken after the first run |
| Repeat seed | Counts and CREATED-event history are unchanged on the second run |

These are fixture expectations, not a claim that a shared database has already
been seeded. The disposable verification below records the actual command,
database version, counts and outcomes.

## Verified disposable run — 2026-10-01

The checks ran against PostgreSQL 18.1 on `localhost:55433`, using three
disposable databases in an isolated local cluster. No shared or production
database was used.

### Legacy preservation

The preservation database was migrated through the Lab 3 migrations, populated
with one representative legacy User, Ticket, Attachment, PublicComment and
InternalNote, and captured with `npx tsx prisma/migration-evidence/capture.ts
before`. The Lab 4 migration was then applied with `npx prisma migrate deploy`
and the capture script was run with `after`.

| Check | Before | After | Result |
|---|---:|---:|---|
| User rows | 1 | 1 | PASS |
| Ticket rows | 1 | 1 | PASS |
| Attachment rows | 1 | 1 | PASS |
| PublicComment rows | 1 | 1 | PASS |
| InternalNote rows | 1 | 1 | PASS |
| Ticket number/requester relation | `LEGACY-0001` / `1` | unchanged | PASS |
| Attachment size/checksum | 4 bytes / `37b59afd592725f9305e484a5d7f5168` | unchanged | PASS |
| Existing Ticket version | n/a | 1 | PASS |
| ActionTaken, ActionEvent, ActionCreationRequest | n/a | 0, 0, 0 | PASS |

The checked-in capture script reported all 14 preservation and migration
invariant checks as `PASS`. The foreign-key and backup/restore results below
are separate explicit SQL/toolchain checks, not claims made by `capture.ts`.

### Fresh migration, seed repeat and recovery

On a separate empty disposable database, all six migrations applied
successfully. `npm run db:seed` was run twice; both runs reported 8 seeded
Tickets, 8 Actions Taken, 8 ActionEvents, 3 public comments and 2 internal
notes. After the second run, SQL verification reported:

| Check | Result |
|---|---:|
| Actions Taken | 8 |
| Unique non-null seed keys | 8 |
| ActionEvents | 8 |
| CREATED events | 8 |
| Action version range | 1–1 |
| Events per seeded action | 1 each |

The eight Action Taken foreign keys are all `ON DELETE RESTRICT`. An attempted
delete of a seeded parent Ticket failed with
`ActionTaken_ticketId_fkey`, and the transaction was rolled back. A custom
`pg_dump` backup restored successfully into a separate disposable database;
the restored database contained 12 Users, 8 Tickets, 8 Actions Taken, 8
ActionEvents, 3 public comments and 2 internal notes.

The restored copy was then deliberately changed at one stable `seedKey` and
seeded twice more. The changed row returned to its fixture value at version 2,
with exactly 2 events and maximum event version 2; the second repeat remained
at version 2 with 2 events. This verifies that fixture correction is monotonic
and append-only rather than a reset to version 1.

### Regression gate

The existing Lab 1-3 regression suites were run against the freshly migrated
and seeded disposable database. The server suite passed 190/190 tests across
16 files, and the client suite passed 135/135 tests across 18 files.

The temporary PostgreSQL cluster and disposable databases were removed after
the run. The ignored `snapshot.before.json` is machine-local evidence output;
the measured results above are the reviewable record.

## Recovery and rollback

There is no destructive down migration for a database containing user data.
If the migration fails before new writes are allowed, stop the application and
restore the pre-migration backup into a separate disposable database for
diagnosis. Do not represent that restore as a lossless rollback after new
post-migration writes exist: restoring the old backup would discard those
writes.

For a failed deployment after the migration has applied, keep the migration
record, stop writes, inspect the failing constraint or data, and ship a forward
fix. Verify the repaired database with `npx prisma migrate status`, the legacy
inventory comparison, foreign-key checks and the repeated seed procedure before
reopening writes.

The Action Taken tables use restrictive performer/actor/user references so
history cannot be silently orphaned. Ticket deletion remains outside this
slice; its existing attachment/comment/note cascade behavior is unchanged.
