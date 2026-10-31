import type { PrismaClient } from "../../server/node_modules/@prisma/client";
import {
  DASHBOARD_ACCOUNTS,
  resetDashboardTickets,
} from "../../server/tests/helpers/dashboard-fixtures";

export async function createWorkflowTicket(db: PrismaClient) {
  await resetDashboardTickets(db, false);
  const [requester, owner, category, system] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { email: DASHBOARD_ACCOUNTS.requester.email },
    }),
    db.user.findUniqueOrThrow({
      where: { email: DASHBOARD_ACCOUNTS.staff.email },
    }),
    db.category.findFirstOrThrow(),
    db.relatedSystem.findFirstOrThrow(),
  ]);

  return db.ticket.create({
    data: {
      number: "TKT-L4-00000001",
      requesterId: requester.id,
      ownerId: owner.id,
      categoryId: category.id,
      systemId: system.id,
      summary: "VPN disconnects after ten minutes",
      description: "The VPN connects, then drops after about ten minutes.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      status: "OPEN",
    },
  });
}
