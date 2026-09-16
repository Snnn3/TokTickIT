import { Router, Response } from "express";
import { Role, TicketPriority, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from "../middleware/auth";
import { isTicketStatus, TICKET_STATUSES } from "../utils/ticketStatus";

/**
 * Staff queue and assignee reads [FR-22, FR-24, BR-10, BR-16, D2, D12].
 *
 * Every route here requires IT Staff or Administrator; Administrator is a
 * superset of IT Staff for ticket operations, so both roles pass the same
 * guard. A Requester-role caller is refused with 403 and no ticket content,
 * and these reads never enforce BR-25: the queue defaults to every ticket
 * including ones the caller filed, and the assignee list is not ticket-scoped
 * at all (api-spec.md section 4).
 */

export const staffRouter = Router();

const STAFF_ROLES = [Role.IT_STAFF, Role.ADMINISTRATOR] as const;

type QueueDetails = { field: string; parameter: string; issue: string }[];

function parseStrictInteger(
  value: unknown,
  parameter: string,
  issue: string,
  details: QueueDetails,
  options?: { min?: number; allowed?: number[] }
): number | undefined {
  if (value === undefined) return undefined;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    details.push({ field: parameter, parameter, issue });
    return undefined;
  }
  const parsed = parseInt(raw, 10);
  if (options?.min !== undefined && parsed < options.min) {
    details.push({ field: parameter, parameter, issue });
    return undefined;
  }
  if (options?.allowed !== undefined && !options.allowed.includes(parsed)) {
    details.push({ field: parameter, parameter, issue });
    return undefined;
  }
  return parsed;
}

type OwnerFilter = "assigned" | "unassigned" | "mine";

const OWNER_FILTERS: OwnerFilter[] = ["assigned", "unassigned", "mine"];

interface QueueValidation {
  valid: boolean;
  search?: string;
  status?: string;
  categoryId?: number;
  requestedPriority?: TicketPriority;
  itPriority?: TicketPriority;
  owner?: OwnerFilter;
  sort: "updatedAt" | "createdAt" | "number";
  order: "asc" | "desc";
  page: number;
  pageSize: number;
  details: QueueDetails;
}

/**
 * Queue query validation [BR-16]. Same strict style as the requester list:
 * every violation is collected per parameter and answered together as
 * 400 INVALID_QUERY, so an invalid query never silently returns wrong results.
 */
function validateQueueQuery(query: Record<string, unknown>): QueueValidation {
  const details: QueueDetails = [];

  let search: string | undefined;
  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      details.push({
        field: "search",
        parameter: "search",
        issue: "Search must be a string",
      });
    } else {
      const trimmed = query.search.trim();
      if (trimmed.length > 150) {
        details.push({
          field: "search",
          parameter: "search",
          issue: "Search query must not exceed 150 characters",
        });
      } else if (trimmed.length > 0) {
        search = trimmed;
      }
    }
  }

  let status: string | undefined;
  if (query.status !== undefined) {
    const raw = String(query.status);
    if (isTicketStatus(raw)) {
      status = raw;
    } else {
      details.push({
        field: "status",
        parameter: "status",
        issue: `Status must be one of ${TICKET_STATUSES.join(", ")}`,
      });
    }
  }

  const categoryId = parseStrictInteger(
    query.categoryId,
    "categoryId",
    "Category ID must be a positive integer",
    details,
    { min: 1 }
  );

  let requestedPriority: TicketPriority | undefined;
  if (query.requestedPriority !== undefined) {
    const raw = String(query.requestedPriority);
    if (!Object.values(TicketPriority).includes(raw as TicketPriority)) {
      details.push({
        field: "requestedPriority",
        parameter: "requestedPriority",
        issue: "Requested priority must be LOW, MEDIUM, or HIGH",
      });
    } else {
      requestedPriority = raw as TicketPriority;
    }
  }

  let itPriority: TicketPriority | undefined;
  if (query.itPriority !== undefined) {
    const raw = String(query.itPriority);
    if (!Object.values(TicketPriority).includes(raw as TicketPriority)) {
      details.push({
        field: "itPriority",
        parameter: "itPriority",
        issue: "IT priority must be LOW, MEDIUM, or HIGH",
      });
    } else {
      itPriority = raw as TicketPriority;
    }
  }

  // The owner filter is opt-in only: absent means every ticket, including
  // unassigned ones, because unclaimed work is what the queue is for [D12].
  let owner: OwnerFilter | undefined;
  if (query.owner !== undefined) {
    const raw = String(query.owner);
    if ((OWNER_FILTERS as string[]).includes(raw)) {
      owner = raw as OwnerFilter;
    } else {
      details.push({
        field: "owner",
        parameter: "owner",
        issue: `Owner must be one of ${OWNER_FILTERS.join(", ")}`,
      });
    }
  }

  const allowedSorts = ["updatedAt", "createdAt", "number"];
  let sort: QueueValidation["sort"] = "updatedAt";
  if (query.sort !== undefined) {
    const raw = String(query.sort);
    if (!allowedSorts.includes(raw)) {
      details.push({
        field: "sort",
        parameter: "sort",
        issue: "Sort field must be updatedAt, createdAt, or number",
      });
    } else {
      sort = raw as QueueValidation["sort"];
    }
  }

  let order: "asc" | "desc" = "desc";
  if (query.order !== undefined) {
    const raw = String(query.order).toLowerCase();
    if (raw !== "asc" && raw !== "desc") {
      details.push({
        field: "order",
        parameter: "order",
        issue: "Order must be asc or desc",
      });
    } else {
      order = raw;
    }
  }

  const page =
    parseStrictInteger(
      query.page,
      "page",
      "Page must be an integer >= 1",
      details,
      { min: 1 }
    ) ?? 1;

  const pageSize =
    parseStrictInteger(
      query.pageSize,
      "pageSize",
      "Page size must be 5, 10, or 20",
      details,
      { allowed: [5, 10, 20] }
    ) ?? 10;

  return {
    valid: details.length === 0,
    search,
    status,
    categoryId,
    requestedPriority,
    itPriority,
    owner,
    sort,
    order,
    page,
    pageSize,
    details,
  };
}

// GET /api/staff/assignees [FR-24, BR-10]
//
// The users who may legally own a ticket: active IT Staff and Administrators
// only, name-ascending. This exists because the Owner select is used by IT
// Staff, who cannot call GET /api/admin/users. Declared before any
// ticket-addressed route so a later /:id route can never shadow it.
staffRouter.get(
  "/assignees",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const assignees = await prisma.user.findMany({
        where: {
          role: { in: [Role.IT_STAFF, Role.ADMINISTRATOR] },
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      });

      return res.status(200).json({ assignees });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to retrieve assignees",
        },
      });
    }
  }
);

// GET /api/staff/tickets [FR-22, BR-16]
staffRouter.get(
  "/tickets",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const validation = validateQueueQuery(req.query);

    if (!validation.valid) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
          details: validation.details,
        },
      });
    }

    const {
      search,
      status,
      categoryId,
      requestedPriority,
      itPriority,
      owner,
      sort,
      order,
      page,
      pageSize,
    } = validation;

    try {
      // No filter is applied by default: the unfiltered queue returns every
      // ticket including unassigned ones [BR-16, D12].
      const where: Prisma.TicketWhereInput = {};

      if (search) {
        where.OR = [
          { number: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ];
      }

      if (status) {
        where.status = status as Prisma.TicketWhereInput["status"];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (requestedPriority) {
        where.requestedPriority = requestedPriority;
      }

      if (itPriority) {
        where.itPriority = itPriority;
      }

      if (owner === "mine") {
        where.ownerId = user.id;
      } else if (owner === "unassigned") {
        where.ownerId = null;
      } else if (owner === "assigned") {
        where.ownerId = { not: null };
      }

      const orderBy: Prisma.TicketOrderByWithRelationInput[] =
        sort === "number"
          ? [{ number: order }]
          : [{ [sort]: order }, { number: order }];

      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const [total, tickets] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            category: { select: { name: true } },
            requester: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true } },
          },
        }),
      ]);

      const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

      return res.status(200).json({
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          number: ticket.number,
          summary: ticket.summary,
          categoryId: ticket.categoryId,
          categoryName: ticket.category?.name ?? "Unknown",
          requestedPriority: ticket.requestedPriority,
          itPriority: ticket.itPriority,
          status: ticket.status,
          requester: {
            id: ticket.requester.id,
            name: ticket.requester.name,
          },
          // Unassigned rows carry an explicit null, never a missing key, so
          // the queue can render its Unassigned marker [ui-spec section 6].
          owner: ticket.owner
            ? { id: ticket.owner.id, name: ticket.owner.name }
            : null,
          appearsResolvedAt: ticket.appearsResolvedAt ?? null,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        })),
        page,
        pageSize,
        total,
        totalPages,
      });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to retrieve the ticket queue",
        },
      });
    }
  }
);
