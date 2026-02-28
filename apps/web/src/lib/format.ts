/**
 * Shared locale-aware formatting utilities.
 *
 * Uses Intl.DateTimeFormat / Intl.NumberFormat with `undefined` locale so
 * the browser / Node.js runtime picks the user's locale automatically.
 * This avoids hydration mismatches (WCAG WIG: no hardcoded locale strings).
 */

// Hoisted formatters — created once, reused across renders
const _dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const _countFormat = new Intl.NumberFormat(undefined);

/**
 * Format an ISO date string to a locale-aware short date.
 * e.g. "Feb 28, 2026" (en-US) or "28. Feb. 2026" (de-DE)
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // Fallback: return raw string if invalid
  return _dateFormat.format(d);
}

/**
 * Format a number with locale-aware thousands separators.
 * e.g. 1234 → "1,234" (en-US) or "1.234" (de-DE)
 */
export function formatCount(n: number): string {
  return _countFormat.format(n);
}
