/**
 * Static, human-readable deadline (e.g. "3 Oct"), parsed date-only. The locale is fixed: the
 * card renders on the server (Vercel, en-US) and again in the browser (the visitor's locale),
 * and a default-locale format gave "Oct 3" on one and "3 Oct" on the other, a hydration
 * mismatch (React #418) on every board with a dated card in the done column.
 */
export function formatDeadline(deadline: string): string {
  const [y, m, d] = deadline.split("-").map(Number);
  return new Date(Date.UTC(y as number, (m as number) - 1, d as number)).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", timeZone: "UTC" }
  );
}
