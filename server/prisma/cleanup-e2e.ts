import { PrismaClient, type Prisma } from "@prisma/client";

/** Remove only records created by the local Playwright journeys. */
const prisma = new PrismaClient();

async function main() {
  const ticketWhere: Prisma.TicketWhereInput = {
    OR: [
      { summary: "Staff self-service evidence ticket" },
      { summary: { startsWith: "E2E Lab4 staff workflow" } },
      { summary: { startsWith: "E2E Lab2" } },
      { requester: { email: { startsWith: "e2e." } } },
    ],
  };

  const { deletedActions, deletedTickets, deletedUsers } =
    await prisma.$transaction(async (transaction) => {
      const tickets = await transaction.ticket.findMany({
        where: ticketWhere,
        select: { id: true },
      });
      const ticketIds = tickets.map(({ id }) => id);
      const actions = await transaction.actionTaken.findMany({
        where: { ticketId: { in: ticketIds } },
        select: { id: true },
      });
      const actionIds = actions.map(({ id }) => id);

      await transaction.actionEvent.deleteMany({
        where: { actionId: { in: actionIds } },
      });
      await transaction.actionCreationRequest.deleteMany({
        where: { actionId: { in: actionIds } },
      });
      const deletedActions = await transaction.actionTaken.deleteMany({
        where: { id: { in: actionIds } },
      });
      const deletedTickets = await transaction.ticket.deleteMany({
        where: { id: { in: ticketIds } },
      });
      const deletedUsers = await transaction.user.deleteMany({
        where: { email: { startsWith: "e2e." } },
      });

      return { deletedActions, deletedTickets, deletedUsers };
    });

  console.log(
    `Removed ${deletedUsers.count} E2E users, ${deletedTickets.count} E2E tickets, and ${deletedActions.count} E2E actions.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
