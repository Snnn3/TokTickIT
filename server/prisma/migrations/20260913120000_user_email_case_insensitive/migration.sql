-- Case-insensitive uniqueness for User.email [FR-16, BR-09].
--
-- The auth-foundation migration lower-cases every address it backfills and the
-- seed lower-cases everything it writes, but "User_email_key" is an ordinary
-- btree over a VARCHAR: it enforces uniqueness case-sensitively. That left the
-- case-insensitive guarantee as a convention every write path had to remember
-- rather than something the database refuses to break, and the first write path
-- to forget it -- user administration, arriving in a later slice -- would have
-- inserted a second row differing only in case. Login could then never resolve
-- that row at all, because it looks an address up on its lower-cased form.
--
-- This is a separate migration rather than an edit to 20260913090000 on purpose.
-- That migration has already been applied to the development database, and the
-- M-01 preservation evidence was captured from that run against real Lab 2 data
-- which no longer has a spec able to regenerate it. Amending it in place would
-- change its checksum, force `migrate reset`, and destroy the evidence it
-- documents.

CREATE EXTENSION IF NOT EXISTS citext;

-- Guard before the change, in the same shape the auth-foundation migration uses:
-- if two addresses already differ only in case, rebuilding the unique index
-- would fail with an opaque constraint violation. Name the offending rows.
DO $$
DECLARE
  collisions text;
BEGIN
  SELECT string_agg(report, E'\n')
    INTO collisions
    FROM (
      SELECT lower(btrim(email)) || '  <-  ' || string_agg(email, ', ' ORDER BY id) AS report
        FROM "User"
       GROUP BY lower(btrim(email))
      HAVING count(*) > 1
    ) AS duplicates;

  IF collisions IS NOT NULL THEN
    RAISE EXCEPTION E'Migration aborted: these User email addresses collide once compared case-insensitively.\n%\nMerge or correct the listed rows, then re-run the migration.', collisions;
  END IF;
END $$;

-- Normalise anything a pre-constraint write path may have left mixed-cased or
-- padded. A no-op where the only writers were the backfill and the seed.
UPDATE "User"
   SET "email" = lower(btrim("email"))
 WHERE "email" <> lower(btrim("email"));

-- Changing the column type rebuilds "User_email_key" under citext's default
-- operator class, so the unique index that already exists becomes the
-- case-insensitive constraint. Nothing is dropped or recreated by name, and
-- nothing is left unmanaged: schema.prisma carries @db.Citext, so a later
-- `prisma migrate dev` diffs the column as it actually is instead of proposing
-- to undo this. A functional index on lower("email") would have been invisible
-- to that diff and silently dropped by the next generated migration.
ALTER TABLE "User" ALTER COLUMN "email" TYPE CITEXT;

-- citext carries no length, so the VARCHAR(255) bound is restated explicitly
-- rather than quietly lost. Prisma does not manage check constraints, so this
-- survives future migrations untouched.
ALTER TABLE "User"
  ADD CONSTRAINT "User_email_length_check" CHECK (length("email") <= 255);
