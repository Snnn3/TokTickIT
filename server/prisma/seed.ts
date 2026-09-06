import { PrismaClient } from "@prisma/client";

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

const ACTIVE_REQUESTERS = [
  { name: "Anucha Wongchai", email: "anucha.wongchai@example.com" },
  { name: "Busaba Srisawat", email: "busaba.srisawat@example.com" },
  { name: "Chatchai Promma", email: "chatchai.promma@example.com" },
  { name: "Duangjai Niran", email: "duangjai.niran@example.com" },
];

const INACTIVE_REQUESTERS = [
  { name: "Noppadol Kaeo", email: "noppadol.kaeo@example.com" },
];

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

  for (const requester of ACTIVE_REQUESTERS) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: { name: requester.name, isActive: true },
      create: { ...requester, isActive: true },
    });
  }

  for (const requester of INACTIVE_REQUESTERS) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: { name: requester.name, isActive: false },
      create: { ...requester, isActive: false },
    });
  }

  const [categories, systems, activeRequesters, inactiveRequesters] =
    await Promise.all([
      prisma.category.count(),
      prisma.relatedSystem.count(),
      prisma.requesterUser.count({ where: { isActive: true } }),
      prisma.requesterUser.count({ where: { isActive: false } }),
    ]);

  console.log(
    `Seed complete: ${categories} categories, ${systems} related systems, ${activeRequesters} active requesters, ${inactiveRequesters} inactive requesters`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
