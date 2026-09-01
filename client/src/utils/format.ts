/**
 * Shared formatting utilities for dates and text across TokTickIT.
 */

export function formatDateTime(date: string | Date | number): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString();
}
