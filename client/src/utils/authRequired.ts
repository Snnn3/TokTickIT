export async function isAuthRequired(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;

  const payload: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  if (typeof payload !== "object" || payload === null) return false;
  const error = (payload as { error?: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "AUTH_REQUIRED"
  );
}
