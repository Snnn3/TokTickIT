-- Lab 3 auth foundation: RequesterUser -> User, expanded status vocabulary,
-- ticket operational fields, public comments and internal notes.
-- Hand-written rather than generated, because the generated form would have
-- dropped RequesterUser and taken every Ticket with it. [FR-16, BR-09, BR-12,
-- BR-20, BR-27, AC-17, AC-26]
--
-- Ticket ownership is preserved by reusing the RequesterUser primary keys as
-- User primary keys, so Ticket."requesterId" needs no rewriting at all and
-- there is no window in which a ticket points at nothing.
--
-- Migrated accounts land with a placeholder password hash and
-- mustChangePassword = true. `npm run db:seed` then writes the real bcrypt hash
-- of the documented local-development password; the server refuses to verify a
-- credential against a placeholder, so an unseeded account cannot be signed
-- into. Run order is migrate then seed, as the README documents.

-- 1. Role enum.
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- 2. Expand the single-value Lab 2 TicketStatus to the eight required values
-- [BR-12]. The new labels are not referenced anywhere in this migration, which
-- is what makes adding them inside the migration transaction safe.
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

-- 3. Email normalisation guard [BR-09]. The Lab 2 unique index on
-- RequesterUser.email is case-sensitive, while User.email is uniquely
-- constrained on its lower-cased form. Two rows differing only in case would
-- therefore fail mid-backfill with an opaque constraint violation, so the
-- collision check runs first and reports every offending pair by name.
DO $$
DECLARE
  collisions text;
BEGIN
  SELECT string_agg(report, E'\n')
    INTO collisions
    FROM (
      SELECT lower(btrim(email)) || '  <-  ' || string_agg(email, ', ' ORDER BY id) AS report
        FROM "RequesterUser"
       GROUP BY lower(btrim(email))
      HAVING count(*) > 1
    ) AS duplicates;

  IF collisions IS NOT NULL THEN
    RAISE EXCEPTION E'Lab 3 migration aborted before any backfill: these RequesterUser email addresses collide once lower-cased.\n%\nMerge or correct the listed rows, then re-run the migration.', collisions;
  END IF;
END $$;

-- 4. User table.
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'REQUESTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- 5. Backfill every development requester as a real REQUESTER account, keeping
-- the primary key so ticket ownership survives untouched [BR-27, AC-26].
INSERT INTO "User" (
    "id", "name", "email", "passwordHash", "role",
    "isActive", "mustChangePassword", "tokenVersion", "createdAt", "updatedAt"
)
SELECT
    "id",
    "name",
    lower(btrim("email")),
    'MIGRATED_PENDING_SEED',
    'REQUESTER',
    "isActive",
    true,
    0,
    "createdAt",
    "updatedAt"
  FROM "RequesterUser";

-- Advance the identity sequence past the reused ids so the next created user
-- does not collide with a migrated one.
SELECT setval(
    pg_get_serial_sequence('"User"', 'id'),
    COALESCE((SELECT max("id") FROM "User"), 1),
    (SELECT count(*) > 0 FROM "User")
);

-- 6. Ticket operational fields [D3, D22, BR-11].
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "itPriority" "TicketPriority";
ALTER TABLE "Ticket" ADD COLUMN "appearsResolvedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "resolutionSummary" TEXT;

-- IT Priority is initialised as a copy of Requested Priority at migration
-- [BR-11]; every migrated ticket starts unassigned.
UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;

-- 7. Re-point the requester foreign key from RequesterUser to User. The ids are
-- identical, so no row changes.
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requesterId_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The staff queue defaults to no predicate at all (D12), so an unfiltered
-- ORDER BY "updatedAt" DESC needs an index led by "updatedAt".
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt" DESC);
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");

-- 8. Preservation check before the old table is dropped [AC-17]. Row counts
-- must match and every ticket must still resolve to an account; anything else
-- aborts the whole migration rather than leaving a half-migrated database.
DO $$
DECLARE
  legacy_accounts int;
  migrated_accounts int;
  orphan_tickets int;
BEGIN
  SELECT count(*) INTO legacy_accounts FROM "RequesterUser";
  SELECT count(*) INTO migrated_accounts FROM "User";

  IF migrated_accounts <> legacy_accounts THEN
    RAISE EXCEPTION 'Lab 3 migration aborted: % RequesterUser rows produced % User rows.', legacy_accounts, migrated_accounts;
  END IF;

  SELECT count(*)
    INTO orphan_tickets
    FROM "Ticket" t
    LEFT JOIN "User" u ON u."id" = t."requesterId"
   WHERE u."id" IS NULL;

  IF orphan_tickets > 0 THEN
    RAISE EXCEPTION 'Lab 3 migration aborted: % tickets would lose their requester.', orphan_tickets;
  END IF;

  RAISE NOTICE 'Lab 3 migration: % accounts carried over, every ticket requester resolved.', migrated_accounts;
END $$;

-- 9. Public comments and internal notes. Two tables rather than one with a
-- visibility flag, so authorization cannot leak through a forgotten predicate
-- [BR-04, D20].
CREATE TABLE "PublicComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicComment_ticketId_createdAt_idx" ON "PublicComment"("ticketId", "createdAt");
CREATE INDEX "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt");

ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 10. The development selector is gone, so its table goes too.
DROP TABLE "RequesterUser";
