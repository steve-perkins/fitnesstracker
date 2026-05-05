/**
 * Parse an API date string ("2026-05-04T00:00:00.000Z" or "2026-05-04")
 * as a calendar day at LOCAL midnight.
 *
 * Backend dates are stored as UTC-midnight ISO strings representing calendar
 * days with no time component. Parsing them directly with new Date() or
 * parseISO() returns a UTC moment that date-fns format() then renders in the
 * browser's local zone — showing the previous day in any negative-offset zone
 * (e.g. America/New_York). Slicing to YYYY-MM-DD and constructing at local
 * midnight avoids this shift.
 */
export function parseApiDate(s: string): Date {
  const ymd = s.slice(0, 10); // "2026-05-04"
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight
}
