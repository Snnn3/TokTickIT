/**
 * Shared ownership gate: load a resource, map missing → 404 NOT_FOUND and
 * foreign-owner → 403 FORBIDDEN. [BR-06, AC-03]
 */

type NotFoundError = { code: "NOT_FOUND"; message: string };
type ForbiddenError = { code: "FORBIDDEN"; message: string };

export type OwnedResourceResult<T> =
  | { status: 200; error: null; resource: T }
  | { status: 404; error: NotFoundError; resource: null }
  | { status: 403; error: ForbiddenError; resource: null };

export async function getOwnedResource<T>(
  find: () => Promise<T | null>,
  isOwner: (resource: T) => boolean,
  notFoundMessage: string,
): Promise<OwnedResourceResult<T>> {
  const resource = await find();

  if (!resource) {
    return {
      status: 404,
      error: { code: "NOT_FOUND", message: notFoundMessage },
      resource: null,
    };
  }

  if (!isOwner(resource)) {
    return {
      status: 403,
      error: { code: "FORBIDDEN", message: "Access denied" },
      resource: null,
    };
  }

  return { status: 200, error: null, resource };
}
