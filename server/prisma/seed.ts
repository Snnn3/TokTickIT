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

const MOCK_TICKETS = [
  {
    number: "TKT-2026-00001",
    summary: "Wi-Fi connection drops in Building 3 Floor 4",
    description:
      "Unable to maintain a stable Wi-Fi connection while attending lectures in Room 402. The signal repeatedly drops after 5-10 minutes of active connection.",
    categoryName: "Network",
    systemName: "Campus Wi-Fi",
    priority: "HIGH" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-20T08:30:00.000Z"),
    createdAt: new Date("2026-08-20T08:30:00.000Z"),
    updatedAt: new Date("2026-08-20T08:30:00.000Z"),
  },
  {
    number: "TKT-2026-00002",
    summary: "Cannot access LEB2 grading portal",
    description:
      "Receiving a 403 Forbidden error whenever attempting to submit midterm assignments for CPE334 course on LEB2 App.",
    categoryName: "Account and Access",
    systemName: "LEB2 App",
    priority: "HIGH" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-21T09:15:00.000Z"),
    createdAt: new Date("2026-08-21T09:15:00.000Z"),
    updatedAt: new Date("2026-08-21T09:15:00.000Z"),
  },
  {
    number: "TKT-2026-00003",
    summary: "Paper jammed in Library 2nd Floor Printer",
    description:
      "The shared network printer in the library study room is flashing an error indicator for paper jam in Tray 2.",
    categoryName: "Hardware",
    systemName: "Printer",
    priority: "LOW" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-22T11:00:00.000Z"),
    createdAt: new Date("2026-08-22T11:00:00.000Z"),
    updatedAt: new Date("2026-08-22T11:00:00.000Z"),
  },
  {
    number: "TKT-2026-00004",
    summary: "Request corporate laptop memory upgrade",
    description:
      "Development IDE and Docker containers require more than the currently installed 8GB of RAM. Requesting upgrade to 16GB.",
    categoryName: "Hardware",
    systemName: "Corporate Laptop",
    priority: "MEDIUM" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-23T14:20:00.000Z"),
    createdAt: new Date("2026-08-23T14:20:00.000Z"),
    updatedAt: new Date("2026-08-23T14:20:00.000Z"),
  },
  {
    number: "TKT-2026-00005",
    summary: "VPN authentication failing with 2FA prompt",
    description:
      "Cisco AnyConnect client gives an invalid credentials error even after entering the latest OTP from the authenticator app.",
    categoryName: "Network",
    systemName: "VPN",
    priority: "HIGH" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-24T10:05:00.000Z"),
    createdAt: new Date("2026-08-24T10:05:00.000Z"),
    updatedAt: new Date("2026-08-24T10:05:00.000Z"),
  },
  {
    number: "TKT-2026-00006",
    summary: "Outlook email storage quota exceeded",
    description:
      "Mailbox has reached 98% capacity and warning notifications are appearing continuously. Need quota extension or archive guidance.",
    categoryName: "Software",
    systemName: "Email",
    priority: "LOW" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-25T13:45:00.000Z"),
    createdAt: new Date("2026-08-25T13:45:00.000Z"),
    updatedAt: new Date("2026-08-25T13:45:00.000Z"),
  },
  {
    number: "TKT-2026-00007",
    summary: "Grade Submission App session timeout too short",
    description:
      "Entering large batch exam scores takes over 15 minutes, causing the session to expire and unsaved entries to be lost.",
    categoryName: "Software",
    systemName: "Grade Submission App",
    priority: "MEDIUM" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-26T16:10:00.000Z"),
    createdAt: new Date("2026-08-26T16:10:00.000Z"),
    updatedAt: new Date("2026-08-26T16:10:00.000Z"),
  },
  {
    number: "TKT-2026-00008",
    summary: "Need secondary display adapter for lecture room",
    description:
      "USB-C to HDMI adapter in Room 301 is physically damaged and intermittent video output occurs during presentation.",
    categoryName: "Hardware",
    systemName: "Corporate Laptop",
    priority: "MEDIUM" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-27T08:50:00.000Z"),
    createdAt: new Date("2026-08-27T08:50:00.000Z"),
    updatedAt: new Date("2026-08-27T08:50:00.000Z"),
  },
  {
    number: "TKT-2026-00009",
    summary: "Password reset for student lab account",
    description:
      "Forgot the local administrator credentials for the Linux workstation in Network Engineering Lab.",
    categoryName: "Account and Access",
    systemName: "Email",
    priority: "HIGH" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-28T11:30:00.000Z"),
    createdAt: new Date("2026-08-28T11:30:00.000Z"),
    updatedAt: new Date("2026-08-28T11:30:00.000Z"),
  },
  {
    number: "TKT-2026-00010",
    summary: "Toner replacement needed for Admin Office",
    description:
      "Black toner cartridge has run out on HP LaserJet printer in the administrative wing.",
    categoryName: "Hardware",
    systemName: "Printer",
    priority: "LOW" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-29T15:00:00.000Z"),
    createdAt: new Date("2026-08-29T15:00:00.000Z"),
    updatedAt: new Date("2026-08-29T15:00:00.000Z"),
  },
  {
    number: "TKT-2026-00011",
    summary: "Cannot connect to eduroam SSID from mobile device",
    description:
      "Certificate error shown when installing the 802.1X security profile for university Wi-Fi network.",
    categoryName: "Network",
    systemName: "Campus Wi-Fi",
    priority: "HIGH" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-30T09:40:00.000Z"),
    createdAt: new Date("2026-08-30T09:40:00.000Z"),
    updatedAt: new Date("2026-08-30T09:40:00.000Z"),
  },
  {
    number: "TKT-2026-00012",
    summary: "Request MATLAB license renewal for research lab",
    description:
      "Current annual license key for MATLAB 2025b expired yesterday. Need new license file applied to lab servers.",
    categoryName: "Software",
    systemName: "LEB2 App",
    priority: "MEDIUM" as const,
    requesterEmail: "anucha.wongchai@example.com",
    ticketDate: new Date("2026-08-31T14:15:00.000Z"),
    createdAt: new Date("2026-08-31T14:15:00.000Z"),
    updatedAt: new Date("2026-08-31T14:15:00.000Z"),
  },
  {
    number: "TKT-2026-00013",
    summary: "Email spam filter blocking partner university domains",
    description:
      "Legitimate collaboration emails from partner universities are being trapped in the quarantine queue.",
    categoryName: "Software",
    systemName: "Email",
    priority: "MEDIUM" as const,
    requesterEmail: "busaba.srisawat@example.com",
    ticketDate: new Date("2026-08-25T10:00:00.000Z"),
    createdAt: new Date("2026-08-25T10:00:00.000Z"),
    updatedAt: new Date("2026-08-25T10:00:00.000Z"),
  },
  {
    number: "TKT-2026-00014",
    summary: "Broken keyboard keys on classroom lectern PC",
    description:
      "Enter key and Space bar are sticky and unresponsive in lecture hall LH3.",
    categoryName: "Hardware",
    systemName: "Corporate Laptop",
    priority: "LOW" as const,
    requesterEmail: "busaba.srisawat@example.com",
    ticketDate: new Date("2026-08-27T11:20:00.000Z"),
    createdAt: new Date("2026-08-27T11:20:00.000Z"),
    updatedAt: new Date("2026-08-27T11:20:00.000Z"),
  },
  {
    number: "TKT-2026-00015",
    summary: "Wi-Fi speeds throttled in Faculty Lounge",
    description:
      "Bandwidth tests consistently show under 1 Mbps download in the Faculty Lounge area.",
    categoryName: "Network",
    systemName: "Campus Wi-Fi",
    priority: "LOW" as const,
    requesterEmail: "busaba.srisawat@example.com",
    ticketDate: new Date("2026-08-29T16:40:00.000Z"),
    createdAt: new Date("2026-08-29T16:40:00.000Z"),
    updatedAt: new Date("2026-08-29T16:40:00.000Z"),
  },
  {
    number: "TKT-2026-00016",
    summary: "VPN access requested for overseas research stay",
    description:
      "Visiting professor requires overseas access to internal computational cluster via secure VPN.",
    categoryName: "Network",
    systemName: "VPN",
    priority: "HIGH" as const,
    requesterEmail: "chatchai.promma@example.com",
    ticketDate: new Date("2026-08-30T10:30:00.000Z"),
    createdAt: new Date("2026-08-30T10:30:00.000Z"),
    updatedAt: new Date("2026-08-30T10:30:00.000Z"),
  },
];

async function main() {
  console.log("Seeding reference data...");

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

  // Pre-fetch reference records
  const categoryMap = new Map(
    (await prisma.category.findMany()).map((c) => [c.name, c.id]),
  );
  const systemMap = new Map(
    (await prisma.relatedSystem.findMany()).map((s) => [s.name, s.id]),
  );
  const requesterMap = new Map(
    (await prisma.requesterUser.findMany()).map((r) => [r.email, r.id]),
  );

  console.log("Seeding mock tickets...");

  for (const mock of MOCK_TICKETS) {
    const categoryId = categoryMap.get(mock.categoryName);
    const systemId = systemMap.get(mock.systemName);
    const requesterId = requesterMap.get(mock.requesterEmail);

    if (!categoryId || !systemId || !requesterId) {
      console.warn(`Skipping ticket ${mock.number}: missing reference relation`);
      continue;
    }

    await prisma.ticket.upsert({
      where: { number: mock.number },
      update: {
        summary: mock.summary,
        description: mock.description,
        categoryId,
        systemId,
        requestedPriority: mock.priority,
        status: "NEW",
        requesterId,
        ticketDate: mock.ticketDate,
        createdAt: mock.createdAt,
        updatedAt: mock.updatedAt,
      },
      create: {
        number: mock.number,
        summary: mock.summary,
        description: mock.description,
        categoryId,
        systemId,
        requestedPriority: mock.priority,
        status: "NEW",
        requesterId,
        ticketDate: mock.ticketDate,
        createdAt: mock.createdAt,
        updatedAt: mock.updatedAt,
      },
    });
  }

  // Synchronize sequence counter past the highest seeded number
  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval('ticket_number_seq', (SELECT COALESCE(MAX(id), 1) + 16 FROM "Ticket"), true);`,
    );
  } catch {
    // If sequence does not exist or in sqlite/test environment, continue safely
  }

  const [categories, systems, activeRequesters, inactiveRequesters, totalTickets] =
    await Promise.all([
      prisma.category.count(),
      prisma.relatedSystem.count(),
      prisma.requesterUser.count({ where: { isActive: true } }),
      prisma.requesterUser.count({ where: { isActive: false } }),
      prisma.ticket.count(),
    ]);

  console.log(
    `Seed complete: ${categories} categories, ${systems} related systems, ${activeRequesters} active requesters, ${inactiveRequesters} inactive requesters, ${totalTickets} tickets`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
