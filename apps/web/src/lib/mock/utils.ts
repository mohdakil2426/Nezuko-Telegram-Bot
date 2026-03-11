/**
 * Mock Data Utilities
 * Helper functions for generating mock data
 */

/**
 * No-op: mock data is synchronous — no network round-trip to simulate.
 * Retained for call-site compatibility; args are intentionally ignored.
 */
export async function delay(..._args: number[]): Promise<void> {
  // Intentionally no-op: mock data returns instantly (no artificial delay)
}

/**
 * Generate a realistic Telegram-style ID (large number)
 */
function generateTelegramId(): number {
  // Telegram IDs are typically 9-10 digit numbers
  return Math.floor(1000000000 + Math.random() * 9000000000);
}

/**
 * Generate a random date within the last N days
 */
export function randomDateWithinDays(days: number): Date {
  const now = new Date();
  const pastMs = days * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - Math.random() * pastMs);
}

/**
 * Format date to ISO string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Format date to YYYY-MM-DD
 */
function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Generate array of dates for time series
 */
export function generateDateSeries(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(toDateString(date));
  }

  return dates;
}

/**
 * Pick random item from array
 */
export function randomFrom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate random number in range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
