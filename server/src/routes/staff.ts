import { Router, Response } from "express";
import { Role, TicketPriority, TicketStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from "../middleware/auth";
import { isTicketStatus, TICKET_STATUSES } from "../utils/ticketStatus";
import { getLegalTargets, isTransitionAllowed } from "../utils/transitions";
import {
  parsePositiveIntParam,
  serializeAttachment,
} from "../utils/attachment";

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

/**
 * Staff ticket operations [FR-23, FR-24, FR-25, FR-28, BR-10, BR-11, BR-13,
 * BR-23, BR-25, BR-26, D2, D11, D16, D22].
 *
 * Every ticket-addressed route below enforces BR-25: if the authenticated
 * user is that ticket's own requester the request fails with
 * 403 SELF_SERVICE_FORBIDDEN. The single exemption is the detail read, which
 * succeeds with internal notes omitted and a selfService marker so the
 * queue's Open action never dead-ends (api-spec.md section 4).
 */

function selfServiceRefusal(res: Response) {
  return res.status(403).json({
    error: {
      code: "SELF_SERVICE_FORBIDDEN",
      message:
        "You filed this ticket, so it must be handled by another staff member",
    },
  });
}

function serializeStaffComment(entry: {
  id: number;
  body: string;
  author?: { id: number; name: string; role?: string } | null;
  authorId?: number;
  createdAt: Date | string;
}) {
  return {
    id: entry.id,
    body: entry.body,
    author: entry.author
      ? {
          id: entry.author.id,
          name: entry.author.name,
          role: entry.author.role,
        }
      : { id: entry.authorId ?? null, name: "Unknown" },
    createdAt: entry.createdAt,
  };
}

function validateNoteBody(raw: unknown): {
  valid: boolean;
  body: string;
  issue?: string;
} {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (body.length < 1) {
    return { valid: false, body, issue: "Note body is required" };
  }
  if (body.length > 2000) {
    return {
      valid: false,
      body,
      issue: "Note body must not exceed 2000 characters",
    };
  }
  return { valid: true, body };
}

function validateResolutionSummary(raw: unknown): {
  valid: boolean;
  body: string;
  issue?: string;
} {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (body.length < 1) {
    return { valid: false, body, issue: "Resolution summary is required" };
  }
  if (body.length > 2000) {
    return {
      valid: false,
      body,
      issue: "Resolution summary must not exceed 2000 characters",
    };
  }
  return { valid: true, body };
}

// GET /api/staff/tickets/:id [FR-23]
staffRouter.get(
  "/tickets/:id",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const ticketId = parsePositiveIntParam(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Ticket ID must be a positive integer",
        },
      });
    }

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
          publicComments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, role: true } },
            },
          },
          internalNotes: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, role: true } },
            },
          },
          attachments: { orderBy: { uploadedAt: "asc" } },
        },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const base = {
        id: ticket.id,
        number: ticket.number,
        ticketDate: ticket.ticketDate,
        status: ticket.status,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        summary: ticket.summary,
        description: ticket.description,
        categoryId: ticket.categoryId,
        systemId: ticket.systemId,
        requester: {
          id: ticket.requester?.id ?? ticket.requesterId,
          name: ticket.requester?.name ?? "Unknown",
        },
        owner: ticket.owner
          ? { id: ticket.owner.id, name: ticket.owner.name }
          : null,
        appearsResolvedAt: ticket.appearsResolvedAt ?? null,
        resolutionSummary: ticket.resolutionSummary ?? null,
        publicComments: (
          (ticket as { publicComments?: unknown[] }).publicComments ?? []
        ).map((c) => serializeStaffComment(c as never)),
        attachments: (
          (ticket as unknown as { attachments?: unknown[] }).attachments ?? []
        ).map((a) => serializeAttachment(a as never)),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };

      // BR-25 read exemption: a staff user may open the staff detail of a
      // ticket they filed; the operational card is replaced client-side and
      // internal notes are omitted entirely so nothing private leaks [BR-04].
      if (ticket.requesterId === user.id) {
        return res.status(200).json({
          ticket: base,
          selfService: true,
        });
      }

      return res.status(200).json({
        ticket: {
          ...base,
          internalNotes: (
            (ticket as { internalNotes?: unknown[] }).internalNotes ?? []
          ).map((n) => serializeStaffComment(n as never)),
        },
      });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to retrieve the ticket",
        },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/owner [FR-24, BR-10, BR-23]
staffRouter.patch(
  "/tickets/:id/owner",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const ticketId = parsePositiveIntParam(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Ticket ID must be a positive integer",
        },
      });
    }

    const { ownerId } = (req.body ?? {}) as { ownerId?: unknown };
    if (ownerId === undefined) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Owner is required",
          details: [{ field: "ownerId", issue: "Owner is required" }],
        },
      });
    }
    if (
      ownerId !== null &&
      (typeof ownerId !== "number" ||
        !Number.isInteger(ownerId) ||
        ownerId <= 0)
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Owner must be a user id or null",
          details: [
            { field: "ownerId", issue: "Owner must be a user id or null" },
          ],
        },
      });
    }

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          requesterId: true,
          status: true,
          ownerId: true,
        },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      if (ticket.requesterId === user.id) {
        return selfServiceRefusal(res);
      }

      if (ownerId !== null) {
        const target = await prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true, name: true, role: true, isActive: true },
        });
        if (
          !target ||
          !target.isActive ||
          (target.role !== Role.IT_STAFF && target.role !== Role.ADMINISTRATOR)
        ) {
          return res.status(422).json({
            error: {
              code: "INVALID_OWNER",
              message: "Owner must be an active IT Staff or Administrator user",
            },
          });
        }

        // Claim side effect [BR-23, D16]: claiming an unowned NEW ticket also
        // opens it so NEW keeps meaning genuinely unhandled. Reassignment,
        // unassignment and claims from any other status leave status untouched.
        const shouldAutoOpen =
          ticket.ownerId === null && ticket.status === TicketStatus.NEW;
        const updated = await prisma.ticket.update({
          where: { id: ticketId },
          data: shouldAutoOpen
            ? { ownerId, status: TicketStatus.OPEN }
            : { ownerId },
          include: { owner: { select: { id: true, name: true } } },
        });

        const updatedOwner = (
          updated as unknown as {
            owner: { id: number; name: string } | null;
            status: TicketStatus;
          }
        ).owner;
        const updatedStatus = (updated as unknown as { status: TicketStatus })
          .status;
        return res.status(200).json({
          owner: updatedOwner
            ? { id: updatedOwner.id, name: updatedOwner.name }
            : { id: target.id, name: target.name },
          status: updatedStatus ?? (shouldAutoOpen ? "OPEN" : ticket.status),
        });
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { ownerId: null },
      });
      const updatedStatus = (updated as unknown as { status?: TicketStatus })
        .status;
      return res.status(200).json({
        owner: null,
        status: updatedStatus ?? ticket.status,
      });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to update the ticket owner",
        },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/priority [FR-24, BR-11]
staffRouter.patch(
  "/tickets/:id/priority",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const ticketId = parsePositiveIntParam(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Ticket ID must be a positive integer",
        },
      });
    }

    // Requested Priority is never writable [BR-11]: only itPriority is read
    // here and only itPriority is written below, so a requestedPriority key
    // in the body is ignored outright rather than merged.
    const { itPriority } = (req.body ?? {}) as { itPriority?: unknown };
    if (
      typeof itPriority !== "string" ||
      !Object.values(TicketPriority).includes(itPriority as TicketPriority)
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "IT priority must be LOW, MEDIUM, or HIGH",
          details: [
            {
              field: "itPriority",
              issue: "IT priority must be LOW, MEDIUM, or HIGH",
            },
          ],
        },
      });
    }

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, requesterId: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      if (ticket.requesterId === user.id) {
        return selfServiceRefusal(res);
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { itPriority: itPriority as TicketPriority },
        select: { itPriority: true },
      });

      return res.status(200).json({ itPriority: updated.itPriority });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to update the IT priority",
        },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/status [FR-24, FR-28, BR-13, BR-26]
staffRouter.patch(
  "/tickets/:id/status",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const ticketId = parsePositiveIntParam(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Ticket ID must be a positive integer",
        },
      });
    }

    // Confirmation for CLOSED and CANCELLED is a client-side dialog only
    // (ui-spec.md section 7): the server takes no confirm field, so one is
    // ignored outright when present rather than validated or required.
    const { status, resolutionSummary: rawSummary } = (req.body ?? {}) as {
      status?: unknown;
      resolutionSummary?: unknown;
    };

    if (typeof status !== "string" || !isTicketStatus(status)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: `Status must be one of ${TICKET_STATUSES.join(", ")}`,
          details: [
            {
              field: "status",
              issue: `Status must be one of ${TICKET_STATUSES.join(", ")}`,
            },
          ],
        },
      });
    }
    const target = status as TicketStatus;

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          requesterId: true,
          status: true,
          resolutionSummary: true,
          appearsResolvedAt: true,
        },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      if (ticket.requesterId === user.id) {
        return selfServiceRefusal(res);
      }

      if (!isTransitionAllowed(ticket.status, target)) {
        return res.status(422).json({
          error: {
            code: "INVALID_TRANSITION",
            message:
              ticket.status === TicketStatus.CLOSED ||
              ticket.status === TicketStatus.CANCELLED
                ? `Cannot transition out of terminal status ${ticket.status}`
                : `Cannot transition from ${ticket.status} to ${target}`,
          },
        });
      }

      // Resolving requires a non-empty trimmed summary, supplied with the
      // transition or already stored [BR-26, FR-28, D11].
      let effectiveSummary: string | null = ticket.resolutionSummary ?? null;
      if (target === TicketStatus.RESOLVED) {
        if (rawSummary !== undefined) {
          if (typeof rawSummary !== "string") {
            return res.status(400).json({
              error: {
                code: "VALIDATION_FAILED",
                message: "Resolution summary must be a string",
                details: [
                  {
                    field: "resolutionSummary",
                    issue: "Resolution summary must be a string",
                  },
                ],
              },
            });
          }
          const validation = validateResolutionSummary(rawSummary);
          if (!validation.valid) {
            if (validation.body.length < 1) {
              return res.status(400).json({
                error: {
                  code: "RESOLUTION_SUMMARY_REQUIRED",
                  message:
                    "A resolution summary is required to resolve this ticket",
                },
              });
            }
            return res.status(400).json({
              error: {
                code: "VALIDATION_FAILED",
                message: validation.issue ?? "Invalid resolution summary",
                details: [
                  {
                    field: "resolutionSummary",
                    issue: validation.issue ?? "Invalid resolution summary",
                  },
                ],
              },
            });
          }
          effectiveSummary = validation.body;
        } else {
          const stored = (ticket.resolutionSummary ?? "").trim();
          if (stored.length < 1 || stored.length > 2000) {
            return res.status(400).json({
              error: {
                code: "RESOLUTION_SUMMARY_REQUIRED",
                message:
                  "A resolution summary is required to resolve this ticket",
              },
            });
          }
          effectiveSummary = stored;
        }
      }

      // Every successful transition clears the appears-resolved signal so the
      // flag cannot go stale across a cycle; entering REOPENED additionally
      // clears the summary so the next cycle needs a fresh explanation
      // [BR-26]. Non-RESOLVED, non-REOPENED transitions leave the stored
      // summary untouched.
      const data: Prisma.TicketUpdateInput = {
        status: target,
        appearsResolvedAt: null,
      };
      if (target === TicketStatus.RESOLVED) {
        data.resolutionSummary = effectiveSummary;
      } else if (target === TicketStatus.REOPENED) {
        data.resolutionSummary = null;
        effectiveSummary = null;
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data,
        select: { status: true, resolutionSummary: true },
      });

      return res.status(200).json({
        status: updated.status,
        resolutionSummary: updated.resolutionSummary ?? null,
      });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to update the ticket status",
        },
      });
    }
  }
);

// GET /api/staff/tickets/:id/notes (internal, Staff/Admin only) [FR-25, BR-04]
staffRouter.get(
  "/tickets/:id/notes",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const ticketId = parsePositiveIntParam(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Ticket ID must be a positive integer",
        },
      });
    }

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, requesterId: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      // The internal-notes read is not exempt from BR-25: a staff user who
      // filed the ticket is refused exactly like a write, and the refusal
      // carries the envelope alone with no note data of any kind.
      if (ticket.requesterId === user.id) {
        return selfServiceRefusal(res);
      }

      const notes = await prisma.internalNote.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      });

      return res.status(200).json({
        notes: notes.map((n) => serializeStaffComment(n as never)),
      });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to retrieve internal notes",
        },
      });
    }
  }
);

// POST /api/staff/tickets/:id/notes (internal, Staff/Admin only) [FR-25, BR-14]
staffRouter.post(
  "/tickets/:id/notes",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const ticketId = parsePositiveIntParam(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Ticket ID must be a positive integer",
        },
      });
    }

    const validation = validateNoteBody(req.body?.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: validation.issue,
          details: [{ field: "body", issue: validation.issue }],
        },
      });
    }

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, requesterId: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      if (ticket.requesterId === user.id) {
        return selfServiceRefusal(res);
      }

      // Author and timestamp are backend-set; anything the client sent for
      // them is ignored outright, never merged [FR-25].
      const created = await prisma.internalNote.create({
        data: {
          ticketId,
          authorId: user.id,
          body: validation.body,
        },
      });

      return res.status(201).json(
        serializeStaffComment({
          id: created.id,
          body: created.body,
          author: { id: user.id, name: user.name, role: user.role },
          createdAt: created.createdAt,
        })
      );
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to create internal note",
        },
      });
    }
  }
);
