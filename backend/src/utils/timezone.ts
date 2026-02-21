/**
 * Timezone Utilities for K-Golf Backend
 * 
 * K-Golf operates exclusively in Atlantic Time (America/Halifax).
 * The server runs in UTC (standard for Docker containers).
 * These helpers ensure correct date display and boundary calculations
 * regardless of the server's system timezone.
 */

export const VENUE_TIMEZONE = 'America/Halifax';

// ─── Display Helpers ──────────────────────────────────────────────

/**
 * Format a date for display in Atlantic Time.
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
    timeZone: VENUE_TIMEZONE,
  });
}

/**
 * Format a time for display in Atlantic Time.
 */
export function formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
    timeZone: VENUE_TIMEZONE,
  });
}

/**
 * Format a full date-time string in Atlantic Time.
 */
export function formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
    timeZone: VENUE_TIMEZONE,
  });
}

// ─── Query Boundary Helpers ───────────────────────────────────────

/**
 * Get the Atlantic-time date components for a given instant.
 */
function getAtlanticDateParts(date: Date): { year: number; month: number; day: number } {
  const formatted = date.toLocaleDateString('en-CA', { timeZone: VENUE_TIMEZONE });
  const [y, m, d] = formatted.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Get today's date string (YYYY-MM-DD) in Atlantic Time.
 */
export function todayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: VENUE_TIMEZONE });
}

/**
 * Get date string (YYYY-MM-DD) in Atlantic Time for any Date object.
 */
export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { timeZone: VENUE_TIMEZONE });
}

/**
 * Get start and end of "today" in Atlantic Time, returned as Date objects.
 */
export function todayRange(): { start: Date; end: Date } {
  return dayRange(new Date());
}

/**
 * Get start and end of a specific day in Atlantic Time.
 */
export function dayRange(date: Date): { start: Date; end: Date } {
  const { year, month, day } = getAtlanticDateParts(date);
  return {
    start: buildAtlanticDate(year, month, day, 0, 0, 0),
    end: buildAtlanticDate(year, month, day, 23, 59, 59, 999),
  };
}

/**
 * Get start and end of a month in Atlantic Time.
 */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: buildAtlanticDate(year, month, 1, 0, 0, 0),
    end: buildAtlanticDate(year, month, lastDay, 23, 59, 59, 999),
  };
}

/**
 * Get Atlantic-time date parts from a Date (handles DOB, birthdays).
 */
export function getAtlanticComponents(date: Date): { year: number; month: number; day: number } {
  return getAtlanticDateParts(date);
}

/**
 * Get the hour and minute in Atlantic Time from a UTC Date.
 * Use instead of date.getHours() which returns server-local (UTC) hours.
 */
export function getAtlanticHourMinute(date: Date): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return { hour: hour === 24 ? 0 : hour, minute };
}

/**
 * Build a Date in UTC that represents a specific wall-clock time in Atlantic timezone.
 * Correctly handles AST (UTC-4) vs ADT (UTC-3) transitions.
 */
function getOffsetAtUTC(utcDate: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  const localHour = getPart('hour') === 24 ? 0 : getPart('hour');
  const localAsUtc = Date.UTC(
    getPart('year'), getPart('month') - 1, getPart('day'),
    localHour, getPart('minute'), getPart('second'),
  );
  return Math.floor(utcDate.getTime() / 1000) * 1000 - localAsUtc;
}

export function buildAtlanticDate(
  year: number,
  month: number, // 1-based
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number = 0,
): Date {
  const target = Date.UTC(year, month - 1, day, hours, minutes, seconds, ms);

  // First pass: use offset at the "rough" UTC point (desired time treated as UTC)
  const rough = new Date(target);
  const offset1 = getOffsetAtUTC(rough);
  const firstGuess = new Date(target + offset1);

  // Second pass: verify offset at computed result (handles DST boundary crossing)
  const offset2 = getOffsetAtUTC(firstGuess);
  if (offset1 !== offset2) {
    return new Date(target + offset2);
  }
  return firstGuess;
}
