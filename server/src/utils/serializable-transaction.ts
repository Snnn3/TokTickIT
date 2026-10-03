import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

const MAX_SERIALIZATION_RETRIES = 3;

function isSerializationConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2034"
  );
}

/**
 * Runs a transaction at Serializable isolation and retries serialization
 * conflicts [BR-46].
 */
export async function runSerializableTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isSerializationConflict(error) ||
        attempt === MAX_SERIALIZATION_RETRIES - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry loop exhausted");
}
