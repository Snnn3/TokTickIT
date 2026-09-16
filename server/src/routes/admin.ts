import { Prisma, Role, TicketStatus } from "@prisma/client";
import { Router, type Response } from "express";
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from "../middleware/auth";
import { hashPassword, validatePassword } from "../utils/password";
import { parsePositiveIntParam } from "../utils/attachment";
import { prisma } from "../prisma";

/** Administrator user management [FR-26, BR-09, BR-15, BR-24]. */
export const adminRouter = Router();

const ADMIN_ROLE = Role.ADMINISTRATOR;
const TERMINAL_STATUSES = [TicketStatus.CLOSED, TicketStatus.CANCELLED];
const ROLES = Object.values(Role);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationDetail = {
  field: string;
  issue: string;
  rule?: string;
};

class AdminApiError extends Error {
  constructor(
    readonly status: 404 | 409,
    readonly code: "NOT_FOUND" | "EMAIL_TAKEN" | "SELF_DEACTIVATION" | "LAST_ADMIN",
    message: string
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationFailure(
  res: Response,
  details: ValidationDetail[],
  message = "Validation failed"
) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_FAILED",
      message,
      details,
    },
  });
}

function isPrismaError(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}

function isStaffRole(role: Role): boolean {
  return role === Role.IT_STAFF || role === Role.ADMINISTRATOR;
}

function validateName(raw: unknown, field = "name"): {
  value?: string;
  issue?: ValidationDetail;
} {
  if (typeof raw !== "string") {
    return {
      issue: { field, issue: "Name is required" },
    };
  }

  const value = raw.trim();
  if (!value) {
    return { issue: { field, issue: "Name is required" } };
  }
  if (value.length > 120) {
    return {
      issue: { field, issue: "Name must not exceed 120 characters" },
    };
  }
  return { value };
}

function validateEmail(raw: unknown): {
  value?: string;
  issue?: ValidationDetail;
} {
  if (typeof raw !== "string") {
    return { issue: { field: "email", issue: "Email is required" } };
  }

  const value = raw.trim().toLowerCase();
  if (!value) {
    return { issue: { field: "email", issue: "Email is required" } };
  }
  if (value.length > 255 || !EMAIL_PATTERN.test(value)) {
    return {
      issue: { field: "email", issue: "Email must be a valid email address" },
    };
  }
  return { value };
}

function validateRoleValue(raw: unknown, required: boolean): {
  value?: Role;
  issue?: ValidationDetail;
} {
  if (raw === undefined && !required) {
    return {};
  }
  if (typeof raw !== "string") {
    return {
      issue: {
        field: "role",
        issue: required ? "Role is required" : "Role must be a valid role",
      },
    };
  }
  if (!ROLES.includes(raw as Role)) {
    return {
      issue: {
        field: "role",
        issue: "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR",
      },
    };
  }
  return { value: raw as Role };
}

function validateActiveValue(raw: unknown, required: boolean): {
  value?: boolean;
  issue?: ValidationDetail;
} {
  if (raw === undefined && !required) {
    return {};
  }
  if (typeof raw !== "boolean") {
    return {
      issue: {
        field: "isActive",
        issue: "isActive must be a boolean",
      },
    };
  }
  return { value: raw };
}

function validateSearchQuery(query: Record<string, unknown>): {
  search?: string;
  role?: Role;
  details: ValidationDetail[];
} {
  const details: ValidationDetail[] = [];
  let search: string | undefined;
  let role: Role | undefined;

  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      details.push({ field: "search", issue: "Search must be a string" });
    } else {
      const value = query.search.trim();
      if (value.length > 150) {
        details.push({
          field: "search",
          issue: "Search query must not exceed 150 characters",
        });
      } else if (value) {
        search = value;
      }
    }
  }

  if (query.role !== undefined) {
    const parsed = validateRoleValue(query.role, true);
    if (parsed.issue) {
      details.push(parsed.issue);
    } else {
      role = parsed.value;
    }
  }

  return { search, role, details };
}

function passwordDetails(raw: unknown, field: "initialPassword" | "newPassword") {
  return validatePassword(raw).failures.map((failure) => ({
    field,
    rule: failure.rule,
    issue: failure.issue,
  }));
}

type UserProjection = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  _count?: { ownedTickets: number };
};

function serializeUser(
  user: UserProjection,
  options: { includeCount?: boolean; includePasswordFlag?: boolean } = {}
) {
  const result: {
    id: number;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    ownedOpenTicketCount?: number;
    mustChangePassword?: boolean;
  } = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  if (options.includeCount) {
    result.ownedOpenTicketCount = user._count?.ownedTickets ?? 0;
  }
  if (options.includePasswordFlag) {
    result.mustChangePassword = user.mustChangePassword === true;
  }
  return result;
}

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  _count: {
    select: {
      ownedTickets: {
        where: { status: { notIn: TERMINAL_STATUSES } },
      },
    },
  },
} as const;

const USER_MUTATION_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
} as const;

// GET /api/admin/users [FR-26, AC-13]
adminRouter.get(
  "/users",
  ...requireAuth,
  requireRole(ADMIN_ROLE),
  async (req: AuthenticatedRequest, res: Response) => {
    const query = validateSearchQuery(req.query);
    if (query.details.length > 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
          details: query.details,
        },
      });
    }

    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.role) {
      where.role = query.role;
    }

    try {
      const users = await prisma.user.findMany({
        where,
        orderBy: { name: "asc" },
        select: USER_LIST_SELECT,
      });

      return res.status(200).json({
        users: users.map((user) => serializeUser(user, { includeCount: true })),
      });
    } catch {
      return res.status(500).json({
        error: { code: "UNEXPECTED", message: "Failed to retrieve users" },
      });
    }
  }
);

// POST /api/admin/users [FR-26, AC-14, AC-19]
adminRouter.post(
  "/users",
  ...requireAuth,
  requireRole(ADMIN_ROLE),
  async (req: AuthenticatedRequest, res: Response) => {
    const body = isRecord(req.body) ? req.body : {};
    const details: ValidationDetail[] = [];

    const name = validateName(body.name);
    if (name.issue) details.push(name.issue);

    const email = validateEmail(body.email);
    if (email.issue) details.push(email.issue);

    const role = validateRoleValue(body.role, true);
    if (role.issue) details.push(role.issue);

    const isActive = validateActiveValue(body.isActive, false);
    if (isActive.issue) details.push(isActive.issue);

    details.push(...passwordDetails(body.initialPassword, "initialPassword"));

    if (details.length > 0 || !name.value || !email.value || !role.value) {
      return validationFailure(res, details);
    }

    try {
      // Normalisation happens before this check, and the database's citext
      // unique key remains the final race-safe duplicate guard [BR-09].
      const duplicate = await prisma.user.findUnique({
        where: { email: email.value },
        select: { id: true },
      });
      if (duplicate) {
        return res.status(409).json({
          error: { code: "EMAIL_TAKEN", message: "Email is already in use" },
        });
      }

      const created = await prisma.user.create({
        data: {
          name: name.value,
          email: email.value,
          role: role.value,
          isActive: isActive.value ?? true,
          passwordHash: await hashPassword(body.initialPassword),
          mustChangePassword: true,
          tokenVersion: 0,
        },
        select: USER_MUTATION_SELECT,
      });

      return res.status(201).json({
        user: serializeUser(created, { includePasswordFlag: true }),
      });
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        return res.status(409).json({
          error: { code: "EMAIL_TAKEN", message: "Email is already in use" },
        });
      }
      return res.status(500).json({
        error: { code: "UNEXPECTED", message: "Failed to create user" },
      });
    }
  }
);

// PATCH /api/admin/users/:id [FR-26, AC-15, AC-21]
adminRouter.patch(
  "/users/:id",
  ...requireAuth,
  requireRole(ADMIN_ROLE),
  async (req: AuthenticatedRequest, res: Response) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "User ID must be a positive integer",
        },
      });
    }

    const body = isRecord(req.body) ? req.body : {};
    const editableFields = ["name", "email", "role", "isActive"];
    const hasEdit = editableFields.some((field) =>
      Object.prototype.hasOwnProperty.call(body, field)
    );
    if (!hasEdit) {
      return validationFailure(res, [
        { field: "user", issue: "At least one user field is required" },
      ]);
    }

    const details: ValidationDetail[] = [];
    const name = Object.prototype.hasOwnProperty.call(body, "name")
      ? validateName(body.name)
      : {};
    if (name.issue) details.push(name.issue);

    const email = Object.prototype.hasOwnProperty.call(body, "email")
      ? validateEmail(body.email)
      : {};
    if (email.issue) details.push(email.issue);

    const role = Object.prototype.hasOwnProperty.call(body, "role")
      ? validateRoleValue(body.role, true)
      : {};
    if (role.issue) details.push(role.issue);

    const isActive = Object.prototype.hasOwnProperty.call(body, "isActive")
      ? validateActiveValue(body.isActive, true)
      : {};
    if (isActive.issue) details.push(isActive.issue);

    if (details.length > 0) {
      return validationFailure(res, details);
    }

    const actor = req.authUser!;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        });

        if (!current) {
          throw new AdminApiError(404, "NOT_FOUND", "User not found");
        }

        const nextRole = role.value ?? current.role;
        const nextIsActive = isActive.value ?? current.isActive;

        // This check deliberately precedes LAST_ADMIN, so an administrator
        // deactivating themselves always receives the more specific refusal
        // [BR-15].
        if (current.id === actor.id && body.isActive === false) {
          throw new AdminApiError(
            409,
            "SELF_DEACTIVATION",
            "You cannot deactivate your own account"
          );
        }

        const removesActiveAdmin =
          current.role === Role.ADMINISTRATOR &&
          current.isActive &&
          (nextRole !== Role.ADMINISTRATOR || !nextIsActive);
        if (removesActiveAdmin) {
          const activeAdminCount = await tx.user.count({
            where: { role: Role.ADMINISTRATOR, isActive: true },
          });
          if (activeAdminCount <= 1) {
            throw new AdminApiError(
              409,
              "LAST_ADMIN",
              "The system must retain at least one active Administrator"
            );
          }
        }

        if (email.value && email.value !== current.email) {
          const duplicate = await tx.user.findFirst({
            where: { email: email.value, id: { not: id } },
            select: { id: true },
          });
          if (duplicate) {
            throw new AdminApiError(
              409,
              "EMAIL_TAKEN",
              "Email is already in use"
            );
          }
        }

        const wasStaff = isStaffRole(current.role);
        const deactivated = current.isActive && !nextIsActive;
        const demoted = wasStaff && nextRole === Role.REQUESTER;
        const shouldCascade = deactivated || demoted;

        const data: Prisma.UserUpdateInput = {};
        if (name.value !== undefined) data.name = name.value;
        if (email.value !== undefined) data.email = email.value;
        if (role.value !== undefined) data.role = role.value;
        if (isActive.value !== undefined) data.isActive = isActive.value;
        if (shouldCascade) {
          // Deactivation and staff-role demotion both end every outstanding
          // session, not only the browser that made the change [BR-20, BR-24].
          data.tokenVersion = { increment: 1 };
        }

        const updated = await tx.user.update({
          where: { id },
          data,
          select: USER_MUTATION_SELECT,
        });

        let unassignedTicketCount: number | undefined;
        if (shouldCascade) {
          const released = await tx.ticket.updateMany({
            where: {
              ownerId: id,
              status: { notIn: TERMINAL_STATUSES },
            },
            data: { ownerId: null },
          });
          unassignedTicketCount = released.count;
        }

        return { updated, unassignedTicketCount };
      });

      return res.status(200).json({
        user: serializeUser(result.updated),
        ...(result.unassignedTicketCount !== undefined
          ? { unassignedTicketCount: result.unassignedTicketCount }
          : {}),
      });
    } catch (error) {
      if (error instanceof AdminApiError) {
        return res.status(error.status).json({
          error: { code: error.code, message: error.message },
        });
      }
      if (isPrismaError(error, "P2002")) {
        return res.status(409).json({
          error: { code: "EMAIL_TAKEN", message: "Email is already in use" },
        });
      }
      if (isPrismaError(error, "P2025")) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "User not found" },
        });
      }
      return res.status(500).json({
        error: { code: "UNEXPECTED", message: "Failed to update user" },
      });
    }
  }
);

// POST /api/admin/users/:id/reset-password [FR-26, AC-16, AC-19]
adminRouter.post(
  "/users/:id/reset-password",
  ...requireAuth,
  requireRole(ADMIN_ROLE),
  async (req: AuthenticatedRequest, res: Response) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "User ID must be a positive integer",
        },
      });
    }

    const body = isRecord(req.body) ? req.body : {};
    const details = passwordDetails(body.newPassword, "newPassword");
    if (details.length > 0) {
      return validationFailure(res, details);
    }

    try {
      const target = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!target) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "User not found" },
        });
      }

      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: await hashPassword(body.newPassword),
          mustChangePassword: true,
          tokenVersion: { increment: 1 },
        },
        select: { id: true },
      });

      return res.status(200).json({
        reset: true,
        mustChangePassword: true,
      });
    } catch (error) {
      if (isPrismaError(error, "P2025")) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "User not found" },
        });
      }
      return res.status(500).json({
        error: { code: "UNEXPECTED", message: "Failed to reset password" },
      });
    }
  }
);
