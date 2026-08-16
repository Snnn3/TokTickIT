import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

async function main() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  const count = await prisma.category.count();
  console.log(`Seeded categories. Total in DB: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
