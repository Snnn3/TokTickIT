-- Lab 4 Actions Taken data foundation [Issue #55, FR-31..FR-40].
--
-- This migration is additive. It preserves every existing User, Ticket,
-- Attachment, PublicComment and InternalNote row, gives existing Tickets a
-- version for optimistic concurrency, and creates no historical Actions Taken.

CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ActionEventType" AS ENUM ('CREATED', 'EDITED', 'STATUS_CHANGED', 'ASSIGNEE_RELEASED');

ALTER TABLE "Ticket" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_version_check" CHECK ("version" >= 1);

DROP INDEX "Ticket_requesterId_updatedAt_idx";
CREATE INDEX "Ticket_requesterId_updatedAt_id_idx"
  ON "Ticket"("requesterId", "updatedAt" DESC, "id");
CREATE INDEX "Ticket_requesterId_resolvedAt_id_idx"
  ON "Ticket"("requesterId", "resolvedAt" DESC, "id");
CREATE INDEX "Ticket_ownerId_status_idx"
  ON "Ticket"("ownerId", "status");

CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "seedKey" VARCHAR(120),
    "ticketId" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "details" TEXT NOT NULL,
    "result" TEXT,
    "performedById" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActionTaken_title_check"
      CHECK (char_length(btrim("title")) BETWEEN 1 AND 120),
    CONSTRAINT "ActionTaken_details_check"
      CHECK (char_length(btrim("details")) BETWEEN 1 AND 2000),
    CONSTRAINT "ActionTaken_result_check"
      CHECK ("result" IS NULL OR char_length(btrim("result")) BETWEEN 1 AND 2000),
    CONSTRAINT "ActionTaken_followUpNote_check"
      CHECK ("followUpNote" IS NULL OR char_length(btrim("followUpNote")) BETWEEN 1 AND 2000),
    CONSTRAINT "ActionTaken_attachmentNotes_check"
      CHECK ("attachmentNotes" IS NULL OR char_length(btrim("attachmentNotes")) BETWEEN 1 AND 2000),
    CONSTRAINT "ActionTaken_followUpRequired_check"
      CHECK (NOT "followUpRequired" OR ("followUpNote" IS NOT NULL AND char_length(btrim("followUpNote")) BETWEEN 1 AND 2000)),
    CONSTRAINT "ActionTaken_version_check"
      CHECK ("version" >= 1),
    CONSTRAINT "ActionTaken_completed_check"
      CHECK ("status" <> 'COMPLETED' OR ("completedAt" IS NOT NULL AND "result" IS NOT NULL AND char_length(btrim("result")) BETWEEN 1 AND 2000)),
    CONSTRAINT "ActionTaken_cancelled_check"
      CHECK ("status" <> 'CANCELLED' OR "completedAt" IS NULL)
);

CREATE INDEX "ActionTaken_ticketId_createdAt_id_idx"
  ON "ActionTaken"("ticketId", "createdAt", "id");
CREATE INDEX "ActionTaken_performedById_createdAt_id_idx"
  ON "ActionTaken"("performedById", "createdAt", "id");
CREATE INDEX "ActionTaken_assigneeId_status_idx"
  ON "ActionTaken"("assigneeId", "status");
CREATE UNIQUE INDEX "ActionTaken_seedKey_key"
  ON "ActionTaken"("seedKey");

CREATE TABLE "ActionEvent" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "type" "ActionEventType" NOT NULL,
    "previousVersion" INTEGER,
    "newVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before" JSONB,
    "after" JSONB NOT NULL,

    CONSTRAINT "ActionEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActionEvent_previousVersion_check"
      CHECK ("previousVersion" IS NULL OR "previousVersion" >= 1),
    CONSTRAINT "ActionEvent_newVersion_check"
      CHECK ("newVersion" >= 1)
);

CREATE INDEX "ActionEvent_actionId_occurredAt_id_idx"
  ON "ActionEvent"("actionId", "occurredAt", "id");
CREATE INDEX "ActionEvent_actorId_occurredAt_idx"
  ON "ActionEvent"("actorId", "occurredAt");

CREATE TABLE "ActionCreationRequest" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "actionId" INTEGER NOT NULL,
    "payloadFingerprint" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionCreationRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActionCreationRequest_key_check"
      CHECK (char_length(btrim("key")) BETWEEN 1 AND 255)
);

CREATE UNIQUE INDEX "ActionCreationRequest_actionId_key"
  ON "ActionCreationRequest"("actionId");
CREATE UNIQUE INDEX "ActionCreationRequest_actorId_key_key"
  ON "ActionCreationRequest"("actorId", "key");
CREATE INDEX "ActionCreationRequest_ticketId_createdAt_idx"
  ON "ActionCreationRequest"("ticketId", "createdAt");

ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActionTaken_performedById_fkey"
    FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActionTaken_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActionEvent"
  ADD CONSTRAINT "ActionEvent_actionId_fkey"
    FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActionEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActionCreationRequest"
  ADD CONSTRAINT "ActionCreationRequest_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActionCreationRequest_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActionCreationRequest_actionId_fkey"
    FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE
  preserved_tickets bigint;
  initial_actions bigint;
BEGIN
  SELECT count(*) INTO preserved_tickets FROM "Ticket";
  SELECT count(*) INTO initial_actions FROM "ActionTaken";
  RAISE NOTICE 'Lab 4 migration preserved % existing Tickets; created % historical Actions Taken.', preserved_tickets, initial_actions;
END $$;
