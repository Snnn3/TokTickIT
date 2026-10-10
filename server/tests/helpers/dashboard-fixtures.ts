import { ActionStatus, PrismaClient, Role, TicketStatus } from "@prisma/client";
import { hashPassword } from "../../src/utils/password";
import { requireDisposableDatabase } from "./disposable-database";

export const DASHBOARD_PASSWORD = "Dashboard!2026";
export const DASHBOARD_ACCOUNTS = {
  staff: {
    name: "Dashboard Alice",
    email: "dashboard.alice@example.com",
    role: Role.IT_STAFF,
  },
  secondStaff: {
    name: "Dashboard Bob",
    email: "dashboard.bob@example.com",
    role: Role.IT_STAFF,
  },
  admin: {
    name: "Dashboard Admin",
    email: "dashboard.admin@example.com",
    role: Role.ADMINISTRATOR,
  },
  requester: {
    name: "Dashboard Requester",
    email: "dashboard.requester@example.com",
    role: Role.REQUESTER,
  },
  secondRequester: {
    name: "Other Dashboard Requester",
    email: "dashboard.other-requester@example.com",
    role: Role.REQUESTER,
  },
} as const;

export async function seedDashboardAccounts(db: PrismaClient) {
  requireDisposableDatabase();
  const passwordHash = await hashPassword(DASHBOARD_PASSWORD);
  const users = [];
  for (const account of Object.values(DASHBOARD_ACCOUNTS)) {
    users.push(
      await db.user.create({
        data: { ...account, passwordHash, mustChangePassword: false },
      })
    );
  }
  for (const name of [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ]) {
    await db.category.create({ data: { name } });
  }
  const system = await db.relatedSystem.create({
    data: { name: "Dashboard test system" },
  });
  return {
    staff: users[0],
    secondStaff: users[1],
    admin: users[2],
    requester: users[3],
    secondRequester: users[4],
    system,
  };
}

export async function resetDashboardTickets(
  db: PrismaClient,
  populated = true
) {
  requireDisposableDatabase();
  // Only this runner's new database, never the demo seed or an existing database.
  await db.actionTaken.deleteMany();
  await db.ticket.deleteMany();
  if (!populated) return;
  const staff = await db.user.findUniqueOrThrow({
    where: { email: DASHBOARD_ACCOUNTS.staff.email },
  });
  const secondStaff = await db.user.findUniqueOrThrow({
    where: { email: DASHBOARD_ACCOUNTS.secondStaff.email },
  });
  const admin = await db.user.findUniqueOrThrow({
    where: { email: DASHBOARD_ACCOUNTS.admin.email },
  });
  const requester = await db.user.findUniqueOrThrow({
    where: { email: DASHBOARD_ACCOUNTS.requester.email },
  });
  const system = await db.relatedSystem.findFirstOrThrow();
  const category = await db.category.findFirstOrThrow();
  const instant = new Date(Date.now() - 60000);
  const statuses = Object.values(TicketStatus);
  const tickets = [];
  for (const [index, status] of statuses.entries()) {
    tickets.push(
      await db.ticket.create({
        data: {
          number: `TKT-TEST-${String(index + 1).padStart(5, "0")}`,
          requesterId: requester.id,
          ownerId:
            status === TicketStatus.NEW || status === TicketStatus.REOPENED
              ? null
              : status === TicketStatus.OPEN ||
                  status === TicketStatus.WAITING_FOR_REQUESTER
                ? staff.id
                : secondStaff.id,
          categoryId: category.id,
          systemId: system.id,
          summary: `Dashboard ${status} ticket`,
          description: "Isolated browser fixture",
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          status,
          resolvedAt:
            status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED
              ? instant
              : null,
          createdAt: new Date(instant.getTime() - 30 * 86400000),
          updatedAt: instant,
        },
      })
    );
  }
  for (let index = 0; index < 7; index++) {
    const status =
      index === 0
        ? ActionStatus.PLANNED
        : index === 1
          ? ActionStatus.IN_PROGRESS
          : ActionStatus.COMPLETED;
    await db.actionTaken.create({
      data: {
        ticketId: tickets[1].id,
        title: `Alice action ${index + 1}`,
        details: "Real database action fixture",
        performedById: staff.id,
        assigneeId: secondStaff.id,
        status,
        result: status === ActionStatus.COMPLETED ? "Verified" : null,
        completedAt: status === ActionStatus.COMPLETED ? instant : null,
        createdAt: instant,
        updatedAt: instant,
      },
    });
  }
  for (const performer of [secondStaff, admin]) {
    await db.actionTaken.create({
      data: {
        ticketId: tickets[1].id,
        title: `${performer.name} action`,
        details: "Not Alice's work, assigned to Alice",
        performedById: performer.id,
        assigneeId: staff.id,
        status: ActionStatus.PLANNED,
        createdAt: instant,
        updatedAt: instant,
      },
    });
  }
}
