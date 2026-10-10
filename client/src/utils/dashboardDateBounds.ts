const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function getRecentDateBounds(asOf: string) {
  return {
    from: new Date(new Date(asOf).getTime() - RECENT_WINDOW_MS).toISOString(),
    to: asOf,
  };
}
