import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

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
 * Seed minimums from specification.md section 5.3: four active and one
 * inactive Requester, three active and one inactive IT Staff, and two active
 * Administrators. The second Administrator is not decoration — with only one,
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
      `administrators ${describe(Role.ADMINISTRATOR)}.`
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
