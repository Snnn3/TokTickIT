export async function refetchAfterStaleWrite(
  errorCode: unknown,
  refetch: () => Promise<void>,
  setError: (message: string) => void,
  message: string
): Promise<boolean> {
  if (errorCode !== "STALE_WRITE") return false;

  await refetch();
  setError(message);
  return true;
}
