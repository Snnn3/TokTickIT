# M-01 — migration preservation evidence

Evidence for AC-17: the Lab 3 migration carries every development requester into
the `User` model without losing a ticket, a ticket number, an attachment byte or a
requester relationship.

This is deliberately **not** a unit test. The Lab 3 API suites stub the Prisma
client, and a stubbed client cannot prove anything about what a migration did to
real rows. `capture.ts` therefore runs against the real development database, and
`migration.api.test.ts` (API-26) covers only the *behavioural* consequences of
migration — a migrated requester signs in, is gated, and still owns their tickets.

## Procedure

Run from `server/`, with the `toktickit-db` container up and the Lab 2 schema
still applied:

```bash
npx tsx prisma/migration-evidence/capture.ts before
npx prisma migrate deploy
npm run db:seed
npx tsx prisma/migration-evidence/capture.ts after
```

`before` writes `snapshot.before.json` next to this file: row counts, every
ticket's id, number and requester email address, and every attachment's
`sizeBytes` with an md5 checksum of its `data` column. `after` re-captures the
same shape, compares the two, prints the table below and exits non-zero if
anything moved. The snapshot is machine-local and gitignored; this file records
the run.

## Captured run — 2026-09-13, `feature/lab3-3-auth-foundation`

Against the development database on host port 5434, which held real Lab 2 data
from the Lab 2 and evidence Playwright runs.

| Check | Before | After | Result |
|---|---|---|---|
| Account rows (RequesterUser then User) | 5 | 11 | PASS |
| Ticket rows | 92 | 92 | PASS |
| Attachment rows | 72 | 72 | PASS |
| Tickets missing after migration | 0 | 0 | PASS |
| Ticket numbers changed | 0 | 0 | PASS |
| Ticket requesters changed | 0 | 0 | PASS |
| Attachment bytes changed (md5 and sizeBytes) | 0 | 0 | PASS |

All checks passed: 92 tickets and 72 attachments preserved byte-for-byte with
unchanged numbers and requesters.

The account count rises from 5 to 11 because the migration carries all five
development requesters over and the seed then adds the four IT Staff and two
Administrator accounts that specification.md section 5.3 requires. The check is
therefore "no account was lost", not "the count is unchanged".

## Why ownership is preserved by construction

The migration reuses each `RequesterUser` primary key as the new `User` primary
key and then re-points the foreign key, rather than inserting fresh users and
rewriting `Ticket.requesterId` to match. There is consequently no window in
which a ticket points at a row that does not exist, and no mapping table whose
correctness would itself need proving. The row-count and orphan checks inside
`migration.sql` abort the whole transaction if either assumption fails, so a
partially migrated database is not a reachable state.

Two guards run before any backfill:

- **Email collision abort.** The Lab 2 unique index on `RequesterUser.email` is
  case-sensitive while `User.email` is uniquely constrained on its lower-cased
  form, so two addresses differing only in case would collide mid-backfill. The
  migration reports every offending pair by name and aborts instead.
- **Placeholder password hashes.** SQL cannot run bcrypt, so migrated accounts
  land with `MIGRATED_PENDING_SEED` and `mustChangePassword = true`. The server
  refuses to verify a credential against a value bcrypt did not produce, so an
  unseeded account cannot be signed into — it fails login the same generic way
  as any other bad credential. `npm run db:seed` writes the real hash, which is
  why the documented run order is migrate then seed.
