/**
 * M-01 migration preservation evidence (AC-17).
 *
 * A mocked Prisma client cannot prove anything about what a migration did to
 * real rows, so this script runs against the real development database and is
 * deliberately not a unit test. It is raw SQL throughout, so the same file
 * works against the Lab 2 schema (RequesterUser) and the Lab 3 schema (User).
 *
 *   npx tsx prisma/migration-evidence/capture.ts before   # before migrating
 *   npx prisma migrate deploy
 *   npm run db:seed
 *   npx tsx prisma/migration-evidence/capture.ts after    # compares and reports
 *
 * "before" writes snapshot.before.json next to this file; "after" reads it back,
 * captures the same shape, and exits non-zero if any ticket number, attachment
 * checksum or requester identity changed.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SNAPSHOT = join(__dirname, "snapshot.before.json");

type TicketRow = { id: number; number: string; requesterEmail: string };
type AttachmentRow = { id: number; sizeBytes: number; checksum: string };

type Snapshot = {
  phase: "before" | "after";
  capturedAt: string;
  counts: {
    accounts: number;
    activeAccounts: number;
    tickets: number;
    attachments: number;
  };
  tickets: TicketRow[];
  attachments: AttachmentRow[];
};

/** The account table is named RequesterUser before the migration and User after it. */
async function accountTable(): Promise<"RequesterUser" | "User"> {
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User', 'RequesterUser')"
  );
  const names = rows.map((r) => r.table_name);
  if (names.includes("User")) {
    return "User";
  }
  if (names.includes("RequesterUser")) {
    return "RequesterUser";
  }
  throw new Error("Neither User nor RequesterUser exists in this database");
}

async function capture(phase: "before" | "after"): Promise<Snapshot> {
  const table = await accountTable();

  const [accounts] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*)::bigint AS n FROM "${table}"`
  );
  const [activeAccounts] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*)::bigint AS n FROM "${table}" WHERE "isActive" = true`
  );
  const [tickets] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    'SELECT count(*)::bigint AS n FROM "Ticket"'
  );
  const [attachments] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    'SELECT count(*)::bigint AS n FROM "Attachment"'
  );

  // Requester identity is carried by email rather than id, so the comparison
  // still holds even if the migration had to renumber accounts.
  const ticketRows = await prisma.$queryRawUnsafe<TicketRow[]>(
    `SELECT t.id, t.number, lower(u.email) AS "requesterEmail" FROM "Ticket" t JOIN "${table}" u ON u.id = t."requesterId" ORDER BY t.id`
  );
  const attachmentRows = await prisma.$queryRawUnsafe<AttachmentRow[]>(
    'SELECT id, "sizeBytes", md5(data) AS checksum FROM "Attachment" ORDER BY id'
  );

  return {
    phase,
    capturedAt: new Date().toISOString(),
    counts: {
      accounts: Number(accounts.n),
      activeAccounts: Number(activeAccounts.n),
      tickets: Number(tickets.n),
      attachments: Number(attachments.n),
    },
    tickets: ticketRows,
    attachments: attachmentRows,
  };
}

function row(label: string, before: unknown, after: unknown, ok: boolean) {
  return `| ${label} | ${String(before)} | ${String(after)} | ${ok ? "PASS" : "FAIL"} |`;
}

function compare(before: Snapshot, after: Snapshot): boolean {
  const ticketsBefore = new Map(before.tickets.map((t) => [t.id, t]));
  const numberChanges: string[] = [];
  const requesterChanges: string[] = [];

  for (const ticket of after.tickets) {
    const previous = ticketsBefore.get(ticket.id);
    if (!previous) {
      continue;
    }
    if (previous.number !== ticket.number) {
      numberChanges.push(
        `ticket ${ticket.id}: ${previous.number} -> ${ticket.number}`
      );
    }
    if (previous.requesterEmail !== ticket.requesterEmail) {
      requesterChanges.push(
        `ticket ${ticket.id}: ${previous.requesterEmail} -> ${ticket.requesterEmail}`
      );
    }
  }

  const afterTicketIds = new Set(after.tickets.map((t) => t.id));
  const missingTickets = before.tickets.filter(
    (t) => !afterTicketIds.has(t.id)
  );

  const attachmentsBefore = new Map(before.attachments.map((a) => [a.id, a]));
  const byteChanges: string[] = [];
  for (const attachment of after.attachments) {
    const previous = attachmentsBefore.get(attachment.id);
    if (!previous) {
      continue;
    }
    if (
      previous.checksum !== attachment.checksum ||
      previous.sizeBytes !== attachment.sizeBytes
    ) {
      byteChanges.push(`attachment ${attachment.id} changed`);
    }
  }

  const rows = [
    row(
      "Account rows (RequesterUser then User)",
      before.counts.accounts,
      after.counts.accounts,
      after.counts.accounts >= before.counts.accounts
    ),
    row(
      "Ticket rows",
      before.counts.tickets,
      after.counts.tickets,
      before.counts.tickets === after.counts.tickets
    ),
    row(
      "Attachment rows",
      before.counts.attachments,
      after.counts.attachments,
      before.counts.attachments === after.counts.attachments
    ),
    row(
      "Tickets missing after migration",
      0,
      missingTickets.length,
      missingTickets.length === 0
    ),
    row(
      "Ticket numbers changed",
      0,
      numberChanges.length,
      numberChanges.length === 0
    ),
    row(
      "Ticket requesters changed",
      0,
      requesterChanges.length,
      requesterChanges.length === 0
    ),
    row(
      "Attachment bytes changed (md5 and sizeBytes)",
      0,
      byteChanges.length,
      byteChanges.length === 0
    ),
  ];

  const failures: string[] = [];
  if (before.counts.tickets !== after.counts.tickets) {
    failures.push("ticket count changed");
  }
  if (before.counts.attachments !== after.counts.attachments) {
    failures.push("attachment count changed");
  }
  if (after.counts.accounts < before.counts.accounts) {
    failures.push("accounts were lost");
  }
  if (missingTickets.length) {
    failures.push(`${missingTickets.length} tickets missing after migration`);
  }
  failures.push(...numberChanges, ...requesterChanges, ...byteChanges);

  console.log("\nM-01 migration preservation evidence");
  console.log(`Before: ${before.capturedAt}`);
  console.log(`After:  ${after.capturedAt}\n`);
  console.log("| Check | Before | After | Result |");
  console.log("|---|---|---|---|");
  for (const line of rows) {
    console.log(line);
  }
  console.log("");

  if (failures.length) {
    console.error("FAILED:");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    return false;
  }
  console.log(
    `All checks passed: ${after.counts.tickets} tickets and ${after.counts.attachments} attachments preserved byte-for-byte with unchanged numbers and requesters.`
  );
  return true;
}

async function main() {
  const phase = process.argv[2];
  if (phase !== "before" && phase !== "after") {
    console.error("Usage: capture.ts <before|after>");
    process.exit(2);
  }

  if (phase === "before") {
    const snapshot = await capture("before");
    writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2));
    console.log(
      `Captured ${snapshot.counts.accounts} accounts, ${snapshot.counts.tickets} tickets and ${snapshot.counts.attachments} attachments to ${SNAPSHOT}`
    );
    return;
  }

  if (!existsSync(SNAPSHOT)) {
    console.error(
      `No before-snapshot at ${SNAPSHOT}. Run "capture.ts before" against the pre-migration database first.`
    );
    process.exit(2);
  }
  const before = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Snapshot;
  const after = await capture("after");
  if (!compare(before, after)) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
