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
