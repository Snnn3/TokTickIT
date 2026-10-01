import {
  ActionEventType,
  ActionStatus,
  Prisma,
  PrismaClient,
  Role,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import { hashPassword } from "../src/utils/password";
import {
  SEED_ACTIONS,
  SEED_FIXTURE_CLOCK,
} from "./action-seed-fixtures";

const prisma = new PrismaClient();

const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

const RELATED_SYSTEMS = [
  "Email",
  "Campus Wi-Fi",
  "VPN",
  "LEB2 App",
  "Grade Submission App",
  "Printer",
  "Corporate Laptop",
];

/**
 * Local-development initial password [BR-27, D9]. The README is the
 * authoritative source for the value; SEED_INITIAL_PASSWORD overrides it so a
 * developer can use their own, and the fallback keeps a fresh clone with no
 * local environment file producing exactly the credentials the E2E specs use.
 * This is a documented lab convenience, never a real secret.
 */
const INITIAL_PASSWORD = process.env.SEED_INITIAL_PASSWORD ?? "ChangeMe!2026";

type SeedUser = { name: string; email: string; role: Role; isActive: boolean };

/**
 * Seed minimums from specification.md section 5.3: five active and one
 * inactive Requester, three active and one inactive IT Staff, and two active
 * Administrators. The fifth active Requester is intentionally empty so the
 * dashboard seed covers both empty and populated requester views. The second
 * Administrator is not decoration — with only one,
 * every last-administrator scenario is also a self-deactivation, which leaves
 * 409 LAST_ADMIN unreachable and BR-15 half untested.
 */
const USERS: SeedUser[] = [
  {
    name: "Anucha Wongchai",
    email: "anucha.wongchai@example.com",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    name: "Busaba Srisawat",
    email: "busaba.srisawat@example.com",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    name: "Chatchai Promma",
    email: "chatchai.promma@example.com",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    name: "Duangjai Niran",
    email: "duangjai.niran@example.com",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    name: "Sirilak Prasert",
    email: "sirilak.prasert@example.com",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    name: "Noppadol Kaeo",
    email: "noppadol.kaeo@example.com",
    role: Role.REQUESTER,
    isActive: false,
  },
  {
    name: "Kittipong Saelim",
    email: "kittipong.saelim@example.com",
    role: Role.IT_STAFF,
    isActive: true,
  },
  {
    name: "Manasporn Thongdee",
    email: "manasporn.thongdee@example.com",
    role: Role.IT_STAFF,
    isActive: true,
  },
  {
    name: "Pornchai Rakdee",
    email: "pornchai.rakdee@example.com",
    role: Role.IT_STAFF,
    isActive: true,
  },
  {
    name: "Suwanna Chaiyo",
    email: "suwanna.chaiyo@example.com",
    role: Role.IT_STAFF,
    isActive: false,
  },
  {
    name: "Apinya Ratchada",
    email: "apinya.ratchada@example.com",
    role: Role.ADMINISTRATOR,
    isActive: true,
  },
  {
    name: "Thanakorn Wattana",
    email: "thanakorn.wattana@example.com",
    role: Role.ADMINISTRATOR,
    isActive: true,
  },
];

/**
 * Ticket fixtures covering the spec §7 seed minimums (Issue #37): realistic
 * tickets spread across all 8 statuses, both priority columns, and
 * assigned/unassigned ownership, plus sample PublicComments and InternalNotes
 * containing no sensitive information.
 *
 * Numbers use the fixed `TKT-2026-SEED-0X` form, which can never collide with
 * `generateTicketNumber` (`TKT-{year}-{5-digit seq}`), so seeding never
 * consumes a value from the production sequence. Every write is idempotent:
 * tickets upsert by unique `number`, comments and notes are created only when
 * no row with the same ticket + body exists yet. This section touches no user
 * row, so re-running the seed bumps no sessions beyond what the user upserts
 * above already do.
 */
type SeedTicket = {
  number: string;
  status: TicketStatus;
  requestedPriority: TicketPriority;
  requesterEmail: string;
  /** Active staff/admin email, or null for unassigned (including NEW). */
  ownerEmail: string | null;
  summary: string;
  description: string;
  resolutionSummary?: string;
  resolvedAt?: string | null;
  ticketDate: string;
  createdAt: string;
  updatedAt: string;
};

const SEED_TICKETS: SeedTicket[] = [
  {
    number: "TKT-2026-SEED-01",
    status: TicketStatus.NEW,
    requestedPriority: TicketPriority.HIGH,
    requesterEmail: "anucha.wongchai@example.com",
    ownerEmail: null,
    summary: "Cannot connect to campus Wi-Fi in Building 3",
    description:
      "Laptop drops the Campus Wi-Fi connection every few minutes in Building 3, room 301. Other networks work fine.",
    resolvedAt: null,
    ticketDate: "2026-10-01T09:00:00.000Z",
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
  },
  {
    number: "TKT-2026-SEED-02",
    status: TicketStatus.OPEN,
    requestedPriority: TicketPriority.MEDIUM,
    requesterEmail: "busaba.srisawat@example.com",
    ownerEmail: "kittipong.saelim@example.com",
    summary: "Email client shows certificate warning",
    description:
      "The desktop Email client shows a certificate warning on launch since Monday. Mail still syncs after accepting.",
    resolvedAt: null,
    ticketDate: "2026-09-20T12:00:00.000Z",
    createdAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-20T12:00:00.000Z",
  },
  {
    number: "TKT-2026-SEED-03",
    status: TicketStatus.IN_PROGRESS,
    requestedPriority: TicketPriority.HIGH,
    requesterEmail: "chatchai.promma@example.com",
    ownerEmail: "manasporn.thongdee@example.com",
    summary: "Grade Submission App rejects CSV upload",
    description:
      "Uploading the final-grade CSV to the Grade Submission App fails with a validation error on every row, even the sample file.",
    resolvedAt: null,
    ticketDate: "2026-09-29T08:00:00.000Z",
    createdAt: "2026-09-29T08:00:00.000Z",
    updatedAt: "2026-09-30T08:00:00.000Z",
  },
  {
    number: "TKT-2026-SEED-04",
    status: TicketStatus.WAITING_FOR_REQUESTER,
    requestedPriority: TicketPriority.MEDIUM,
    requesterEmail: "duangjai.niran@example.com",
    ownerEmail: "apinya.ratchada@example.com",
    summary: "VPN disconnects after ten minutes",
    description:
      "The VPN connects, then drops after about ten minutes. Reconnecting works, then drops again the same way.",
    resolvedAt: null,
    ticketDate: "2026-09-24T12:00:00.000Z",
    createdAt: "2026-09-24T12:00:00.000Z",
    updatedAt: "2026-09-24T12:00:00.000Z",
  },
  {
    number: "TKT-2026-SEED-05",
    status: TicketStatus.RESOLVED,
    requestedPriority: TicketPriority.LOW,
    requesterEmail: "anucha.wongchai@example.com",
    ownerEmail: "pornchai.rakdee@example.com",
    summary: "Printer on floor 2 reports paper jam with no paper inside",
    description:
      "The floor-2 Printer reports a paper jam, but the trays and rear cover are clear. Restarting did not help.",
    resolutionSummary:
      "Cleared a torn fragment from the rear roller and printed a test page successfully.",
    resolvedAt: "2026-09-29T09:00:00.000Z",
    ticketDate: "2026-09-25T07:00:00.000Z",
    createdAt: "2026-09-25T07:00:00.000Z",
    updatedAt: "2026-09-29T09:00:00.000Z",
  },
  {
    number: "TKT-2026-SEED-06",
    status: TicketStatus.CLOSED,
    requestedPriority: TicketPriority.LOW,
    requesterEmail: "busaba.srisawat@example.com",
    ownerEmail: "kittipong.saelim@example.com",
    summary: "Request access to shared Software drive",
    description:
      "Need read access to the shared Software drive for the new course-preparation folder.",
    resolutionSummary:
      "Access granted to the shared folder and confirmed by the requester.",
    resolvedAt: "2026-09-10T09:00:00.000Z",
    ticketDate: "2026-09-10T08:00:00.000Z",
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-09-11T09:00:00.000Z",
  },
  {
    number: "TKT-2026-SEED-07",
    status: TicketStatus.REOPENED,
    requestedPriority: TicketPriority.MEDIUM,
    requesterEmail: "chatchai.promma@example.com",
    ownerEmail: null,
    summary: "LEB2 App crashes when opening week-5 materials",
    description:
      "The LEB2 App closes immediately when opening the week-5 materials. Other weeks open normally.",
    resolvedAt: null,
    ticketDate: "2026-09-23T08:00:00.000Z",
    createdAt: "2026-09-23T08:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
  },
  {
    number: "TKT-2026-SEED-08",
    status: TicketStatus.CANCELLED,
    requestedPriority: TicketPriority.HIGH,
    requesterEmail: "duangjai.niran@example.com",
    ownerEmail: "manasporn.thongdee@example.com",
    summary: "Duplicate: Corporate Laptop battery replacement",
    description:
      "Duplicate of an earlier request for a Corporate Laptop battery replacement. Kept for the record.",
    resolvedAt: null,
    ticketDate: "2026-09-01T08:00:00.000Z",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
  },
];

const SEED_PUBLIC_COMMENTS: {
  ticketNumber: string;
  authorEmail: string;
  body: string;
}[] = [
  {
    ticketNumber: "TKT-2026-SEED-02",
    authorEmail: "busaba.srisawat@example.com",
    body: "The warning appears every morning at first launch, then not again until the next day.",
  },
  {
    ticketNumber: "TKT-2026-SEED-03",
    authorEmail: "chatchai.promma@example.com",
    body: "Attaching the sample CSV row that fails, exported straight from the spreadsheet.",
  },
  {
    ticketNumber: "TKT-2026-SEED-05",
    authorEmail: "anucha.wongchai@example.com",
    body: "The printer works again after the visit, thank you.",
  },
];

const SEED_INTERNAL_NOTES: {
  ticketNumber: string;
  authorEmail: string;
  body: string;
}[] = [
  {
    ticketNumber: "TKT-2026-SEED-03",
    authorEmail: "kittipong.saelim@example.com",
    body: "Reproduced with the sample file; looks like a header-row mismatch, checking with the app owner.",
  },
  {
    ticketNumber: "TKT-2026-SEED-04",
    authorEmail: "kittipong.saelim@example.com",
    body: "Waiting on the requester to confirm whether the spare test profile behaves the same way.",
  },
];

function actionSnapshot(action: {
  title: string;
  details: string;
  result: string | null;
  performedById: number;
  assigneeId: number | null;
  status: ActionStatus;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}): Prisma.InputJsonObject {
  return {
    title: action.title,
    details: action.details,
    result: action.result,
    performedById: action.performedById,
    assigneeId: action.assigneeId,
    status: action.status,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes,
    version: action.version,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
    completedAt: action.completedAt?.toISOString() ?? null,
  };
}

async function main() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name },
    });
  }

  for (const name of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name },
    });
  }

  // Every seeded account reaches the same end state on every run: the
  // documented initial password, the forced-change flag set, and the role and
  // activation this file declares. That is what makes the seed a reliable
  // precondition for the E2E specs rather than a one-shot bootstrap. Rewriting
  // the credential also bumps tokenVersion, so any session issued before the
  // re-seed stops working, exactly as BR-20 requires of a password change.
  const passwordHash = await hashPassword(INITIAL_PASSWORD);

  for (const user of USERS) {
    const email = user.email.trim().toLowerCase();
    await prisma.user.upsert({
      where: { email },
      update: {
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        passwordHash,
        mustChangePassword: true,
        tokenVersion: { increment: 1 },
      },
      create: {
        name: user.name,
        email,
        role: user.role,
        isActive: user.isActive,
        passwordHash,
        mustChangePassword: true,
      },
    });
  }

  const [categories, systems, byRole] = await Promise.all([
    prisma.category.count(),
    prisma.relatedSystem.count(),
    prisma.user.groupBy({
      by: ["role", "isActive"],
      _count: { _all: true },
    }),
  ]);

  // Ticket fixtures (spec §7): resolve the ids the tickets reference, then
  // upsert each ticket by its stable number. itPriority starts as a copy of
  // requestedPriority at creation and migration (BR-11).
  const [seedCategories, seedSystems, seedUsers] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.relatedSystem.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true },
    }),
  ]);
  const userIdByEmail = new Map(seedUsers.map((u) => [u.email, u.id]));

  for (const [index, ticket] of SEED_TICKETS.entries()) {
    const requesterId = userIdByEmail.get(ticket.requesterEmail);
    const ownerId = ticket.ownerEmail
      ? (userIdByEmail.get(ticket.ownerEmail) ?? null)
      : null;
    if (!requesterId || (ticket.ownerEmail && !ownerId)) {
      throw new Error(
        `Seed ticket ${ticket.number} references a user that does not exist yet`
      );
    }
    const categoryId = seedCategories[index % seedCategories.length]?.id;
    const systemId = seedSystems[index % seedSystems.length]?.id;
    if (!categoryId || !systemId) {
      throw new Error("Seed requires at least one category and system");
    }
    const data = {
      requesterId,
      ownerId,
      categoryId,
      systemId,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.requestedPriority,
      status: ticket.status,
      resolutionSummary: ticket.resolutionSummary ?? null,
      resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : null,
      ticketDate: new Date(ticket.ticketDate),
      createdAt: new Date(ticket.createdAt),
      updatedAt: new Date(ticket.updatedAt),
    };
    await prisma.ticket.upsert({
      where: { number: ticket.number },
      update: data,
      create: { number: ticket.number, ...data },
    });
  }

  // Resolve seeded ticket IDs once for Actions Taken, comments and notes.
  const authorIdByEmail = userIdByEmail;
  const ticketIdByNumber = new Map(
    (
      await prisma.ticket.findMany({
        where: { number: { in: SEED_TICKETS.map((t) => t.number) } },
        select: { id: true, number: true },
      })
    ).map((t) => [t.number, t.id])
  );

  // Actions Taken: seedKey is the immutable fixture identity. Existing
  // fixture rows are brought back to the documented state, but unrelated
  // user-created actions are never touched. A changed fixture increments the
  // existing version and appends an audit event instead of rewinding history.
  await prisma.$transaction(async (tx) => {
    for (const action of SEED_ACTIONS) {
      const ticketId = ticketIdByNumber.get(action.ticketNumber);
      const performedById = userIdByEmail.get(action.performedByEmail);
      const assigneeId = action.assigneeEmail
        ? (userIdByEmail.get(action.assigneeEmail) ?? null)
        : null;
      if (!ticketId || !performedById || (action.assigneeEmail && !assigneeId)) {
        throw new Error(
          `Seed action ${action.title} references a missing ticket or user`
        );
      }

      const data = {
        seedKey: action.seedKey,
        ticketId,
        title: action.title,
        details: action.details,
        result: action.result ?? null,
        performedById,
        assigneeId,
        status: action.status,
        followUpRequired: action.followUpRequired ?? false,
        followUpNote: action.followUpNote ?? null,
        attachmentNotes: action.attachmentNotes ?? null,
        createdAt: new Date(action.createdAt),
        updatedAt: new Date(action.updatedAt),
        completedAt: action.completedAt
          ? new Date(action.completedAt)
          : null,
      };
      const existing = await tx.actionTaken.findUnique({
        where: { seedKey: action.seedKey },
      });
      if (!existing) {
        const stored = await tx.actionTaken.create({
          data: { ...data, version: 1 },
        });
        await tx.actionEvent.create({
          data: {
            actionId: stored.id,
            actorId: performedById,
            type: ActionEventType.CREATED,
            previousVersion: null,
            newVersion: stored.version,
            after: actionSnapshot(stored),
          },
        });
        continue;
      }

      const createdEvent = await tx.actionEvent.findFirst({
        where: { actionId: existing.id, type: ActionEventType.CREATED },
        select: { id: true },
      });
      if (!createdEvent) {
        await tx.actionEvent.create({
          data: {
            actionId: existing.id,
            actorId: existing.performedById,
            type: ActionEventType.CREATED,
            previousVersion: null,
            newVersion: existing.version,
            after: actionSnapshot(existing),
          },
        });
      }

      const changed =
        existing.ticketId !== data.ticketId ||
        existing.title !== data.title ||
        existing.details !== data.details ||
        existing.result !== data.result ||
        existing.performedById !== data.performedById ||
        existing.assigneeId !== data.assigneeId ||
        existing.status !== data.status ||
        existing.followUpRequired !== data.followUpRequired ||
        existing.followUpNote !== data.followUpNote ||
        existing.attachmentNotes !== data.attachmentNotes ||
        existing.createdAt.getTime() !== data.createdAt.getTime() ||
        existing.updatedAt.getTime() !== data.updatedAt.getTime() ||
        (existing.completedAt?.getTime() ?? null) !==
          (data.completedAt?.getTime() ?? null);
      if (!changed) {
        continue;
      }

      const stored = await tx.actionTaken.update({
        where: { id: existing.id },
        data: { ...data, version: existing.version + 1 },
      });
      const eventType =
        existing.assigneeId !== data.assigneeId && data.assigneeId === null
          ? ActionEventType.ASSIGNEE_RELEASED
          : existing.status !== data.status
            ? ActionEventType.STATUS_CHANGED
            : ActionEventType.EDITED;
      await tx.actionEvent.create({
        data: {
          actionId: stored.id,
          actorId: performedById,
          type: eventType,
          previousVersion: existing.version,
          newVersion: stored.version,
          before: actionSnapshot(existing),
          after: actionSnapshot(stored),
        },
      });
    }
  });

  // Comments and notes: deterministic bodies, created only when missing, so a
  // re-run adds nothing. Authors come from the seeded accounts above.
  for (const comment of SEED_PUBLIC_COMMENTS) {
    const ticketId = ticketIdByNumber.get(comment.ticketNumber);
    const authorId = authorIdByEmail.get(comment.authorEmail);
    if (!ticketId || !authorId) {
      throw new Error("Seed comment references a missing ticket or author");
    }
    const existing = await prisma.publicComment.findFirst({
      where: { ticketId, body: comment.body },
      select: { id: true },
    });
    if (!existing) {
      await prisma.publicComment.create({
        data: { ticketId, authorId, body: comment.body },
      });
    }
  }

  for (const note of SEED_INTERNAL_NOTES) {
    const ticketId = ticketIdByNumber.get(note.ticketNumber);
    const authorId = authorIdByEmail.get(note.authorEmail);
    if (!ticketId || !authorId) {
      throw new Error("Seed note references a missing ticket or author");
    }
    const existing = await prisma.internalNote.findFirst({
      where: { ticketId, body: note.body },
      select: { id: true },
    });
    if (!existing) {
      await prisma.internalNote.create({
        data: { ticketId, authorId, body: note.body },
      });
    }
  }

  const [
    seedTicketCount,
    seedActionCount,
    seedEventCount,
    seedCommentCount,
    seedNoteCount,
  ] = await Promise.all([
    prisma.ticket.count({
      where: { number: { in: SEED_TICKETS.map((t) => t.number) } },
    }),
    prisma.actionTaken.count({
      where: {
        ticket: { number: { in: SEED_TICKETS.map((t) => t.number) } },
      },
    }),
    prisma.actionEvent.count({
      where: {
        action: { ticket: { number: { in: SEED_TICKETS.map((t) => t.number) } } },
      },
    }),
    prisma.publicComment.count({
      where: {
        ticket: { number: { in: SEED_TICKETS.map((t) => t.number) } },
      },
    }),
    prisma.internalNote.count({
      where: {
        ticket: { number: { in: SEED_TICKETS.map((t) => t.number) } },
      },
    }),
  ]);

  const describe = (role: Role) => {
    const active =
      byRole.find((row) => row.role === role && row.isActive)?._count._all ?? 0;
    const inactive =
      byRole.find((row) => row.role === role && !row.isActive)?._count._all ??
      0;
    return `${active} active + ${inactive} inactive`;
  };

  console.log(
    `Seed complete: ${categories} categories, ${systems} related systems, ` +
      `requesters ${describe(Role.REQUESTER)}, ` +
      `IT staff ${describe(Role.IT_STAFF)}, ` +
      `administrators ${describe(Role.ADMINISTRATOR)}, ` +
      `fixture clock ${SEED_FIXTURE_CLOCK}, ` +
      `seed tickets ${seedTicketCount}, ` +
      `seed actions ${seedActionCount}, ` +
      `seed action events ${seedEventCount}, ` +
      `seed public comments ${seedCommentCount}, ` +
      `seed internal notes ${seedNoteCount}.`
  );
  console.log(
    "Every account signs in with the initial password documented in the README and must change it at first sign-in."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
