import { PrismaClient } from "@prisma/client";

/** Remove only records created by the local Playwright journeys. */
const prisma = new PrismaClient();

async function main() {
  const deletedTickets = await prisma.ticket.deleteMany({
    where: {
      OR: [
        { summary: "Staff self-service evidence ticket" },
        { summary: { startsWith: "E2E Lab2" } },
        { requester: { email: { startsWith: "e2e." } } },
      ],
    },
  });
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { startsWith: "e2e." } },
  });

  console.log(
    `Removed ${deletedUsers.count} E2E users and ${deletedTickets.count} E2E tickets.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
