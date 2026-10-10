import type { Prisma } from "@prisma/client";

/** Public attribution fields only; never expose account credentials. */
export const USER_REF_SELECT = {
  id: true,
  name: true,
  role: true,
  isActive: true,
} as const satisfies Prisma.UserSelect;
