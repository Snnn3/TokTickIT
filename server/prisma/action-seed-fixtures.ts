import { ActionStatus } from "@prisma/client";

export const SEED_FIXTURE_CLOCK = "2026-10-01T12:00:00.000Z";

export type SeedAction = {
  seedKey: string;
  ticketNumber: string;
  title: string;
  details: string;
  performedByEmail: string;
  assigneeEmail?: string | null;
  status: ActionStatus;
  result?: string | null;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

/**
 * Stable Action Taken fixtures for Issue #55. The explicit seedKey is the
 * immutable lookup key used by seed.ts: re-running the seed updates that same
 * row and creates its CREATED event only once. No historical action is
 * invented for the other legacy Tickets, so zero/one/many relations remain
 * visible in a freshly seeded database.
 */
export const SEED_ACTIONS: readonly SeedAction[] = [
  {
    seedKey: "lab4-seed-tkt02-email-certificate",
    ticketNumber: "TKT-2026-SEED-02",
    title: "Verify the Email certificate chain",
    details:
      "Compare the desktop Email certificate chain with the current campus trust bundle.",
    performedByEmail: "kittipong.saelim@example.com",
    assigneeEmail: "manasporn.thongdee@example.com",
    status: ActionStatus.PLANNED,
    createdAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-20T12:00:00.000Z",
  },
  {
    seedKey: "lab4-seed-tkt03-csv-sample",
    ticketNumber: "TKT-2026-SEED-03",
    title: "Collect the failing CSV sample",
    details:
      "Reproduce the Grade Submission App failure with the requester's sample CSV.",
    performedByEmail: "manasporn.thongdee@example.com",
    assigneeEmail: "manasporn.thongdee@example.com",
    status: ActionStatus.IN_PROGRESS,
    attachmentNotes: "Sample CSV supplied in the public ticket attachment.",
    createdAt: "2026-09-29T12:00:00.000Z",
    updatedAt: "2026-09-30T08:00:00.000Z",
  },
  {
    seedKey: "lab4-seed-tkt03-upload-validation",
    ticketNumber: "TKT-2026-SEED-03",
    title: "Compare the upload validation rules",
    details:
      "Compare the failing rows with the importer schema and record the first rejected field.",
    performedByEmail: "apinya.ratchada@example.com",
    assigneeEmail: "pornchai.rakdee@example.com",
    status: ActionStatus.COMPLETED,
    result:
      "The importer rejects the legacy header spelling; a corrected sample passes.",
    createdAt: "2026-09-26T08:00:00.000Z",
    updatedAt: "2026-09-27T09:15:00.000Z",
    completedAt: "2026-09-27T09:15:00.000Z",
  },
  {
    seedKey: "lab4-seed-tkt04-vpn-logs",
    ticketNumber: "TKT-2026-SEED-04",
    title: "Review the VPN session logs",
    details:
      "Inspect the disconnect timestamps against the campus VPN gateway logs.",
    performedByEmail: "kittipong.saelim@example.com",
    status: ActionStatus.CANCELLED,
    attachmentNotes:
      "The original log request was cancelled after the gateway rotation.",
    createdAt: "2026-09-24T12:00:00.000Z",
    updatedAt: "2026-09-24T13:00:00.000Z",
  },
  {
    seedKey: "lab4-seed-tkt04-network-test",
    ticketNumber: "TKT-2026-SEED-04",
    title: "Request an alternate network test",
    details:
      "Ask the requester to repeat the VPN test from a wired connection.",
    performedByEmail: "kittipong.saelim@example.com",
    assigneeEmail: "pornchai.rakdee@example.com",
    status: ActionStatus.PLANNED,
    followUpRequired: true,
    followUpNote:
      "Requester should report whether the wired test remains connected for 15 minutes.",
    createdAt: "2026-09-30T09:00:00.000Z",
    updatedAt: "2026-09-30T09:00:00.000Z",
  },
  {
    seedKey: "lab4-seed-tkt05-printer-roller",
    ticketNumber: "TKT-2026-SEED-05",
    title: "Clear the printer rear roller",
    details:
      "Remove the torn paper fragment from the floor-2 Printer rear roller and run a test page.",
    performedByEmail: "pornchai.rakdee@example.com",
    assigneeEmail: "pornchai.rakdee@example.com",
    status: ActionStatus.COMPLETED,
    result: "Removed the fragment and printed a clean test page.",
    createdAt: "2026-09-25T07:00:00.000Z",
    updatedAt: "2026-09-26T07:30:00.000Z",
    completedAt: "2026-09-26T07:30:00.000Z",
    attachmentNotes:
      "Before/after roller photographs retained with the service record.",
  },
  {
    seedKey: "lab4-seed-tkt06-drive-access",
    ticketNumber: "TKT-2026-SEED-06",
    title: "Grant shared Software drive access",
    details:
      "Apply the approved read permission to the course-preparation folder.",
    performedByEmail: "apinya.ratchada@example.com",
    assigneeEmail: "kittipong.saelim@example.com",
    status: ActionStatus.COMPLETED,
    result: "Read access was granted and confirmed by the requester.",
    createdAt: "2026-09-24T06:00:00.000Z",
    updatedAt: "2026-09-25T06:45:00.000Z",
    completedAt: "2026-09-25T06:45:00.000Z",
  },
  {
    seedKey: "lab4-seed-tkt07-leb2-crash",
    ticketNumber: "TKT-2026-SEED-07",
    title: "Reproduce the week-five LEB2 crash",
    details:
      "Open the week-five material with the affected profile and compare it with another week.",
    performedByEmail: "manasporn.thongdee@example.com",
    assigneeEmail: "manasporn.thongdee@example.com",
    status: ActionStatus.COMPLETED,
    result:
      "The crash reproduced only for the corrupted week-five package; the package was replaced.",
    createdAt: "2026-09-23T08:00:00.000Z",
    updatedAt: "2026-09-24T08:00:00.000Z",
    completedAt: "2026-09-24T08:00:00.000Z",
  },
] as const;
