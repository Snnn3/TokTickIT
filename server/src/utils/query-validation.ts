/** Parses the API's strict UTC timestamp format without accepting date rollovers. */
export function parseUtcIsoTimestamp(value: unknown): Date | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  ) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const [datePart, timePart] = value.split("T");
  const normalizedTime = timePart.includes(".")
    ? timePart.replace(
        /\.(\d{1,3})Z$/,
        (_match, fraction: string) => `.${fraction.padEnd(3, "0")}Z`
      )
    : timePart.replace(/Z$/, ".000Z");
  return parsed.toISOString() === `${datePart}T${normalizedTime}`
    ? parsed
    : null;
}

/** Shared optional, paired, inclusive UTC range validation for read endpoints. */
export function parseUtcDateRange(fromInput: unknown, toInput: unknown) {
  const issues: { field: "from" | "to"; issue: string }[] = [];
  const hasFrom = fromInput !== undefined;
  const hasTo = toInput !== undefined;
  const from = hasFrom
    ? (parseUtcIsoTimestamp(fromInput) ?? undefined)
    : undefined;
  const to = hasTo ? (parseUtcIsoTimestamp(toInput) ?? undefined) : undefined;
  if (hasFrom !== hasTo) {
    issues.push({
      field: hasFrom ? "to" : "from",
      issue: "From and to must be supplied together",
    });
  }
  if (hasFrom && !from)
    issues.push({
      field: "from",
      issue: "from must be a valid UTC ISO timestamp",
    });
  if (hasTo && !to)
    issues.push({ field: "to", issue: "to must be a valid UTC ISO timestamp" });
  if (from && to && from.getTime() > to.getTime()) {
    issues.push({ field: "from", issue: "From must not be after to" });
  }
  return { from, to, issues };
}
