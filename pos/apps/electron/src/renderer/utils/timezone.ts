/**
 * Timezone Utilities for K-Golf POS
 * 
 * K-Golf operates exclusively in Atlantic Time (America/Halifax).
 * All date display and query boundary calculations should use these helpers
 * instead of raw Date methods, so behavior is correct regardless of the
 * user's browser/system timezone.
 */

export const VENUE_TIMEZONE = 'America/Halifax';

// ─── Display Helpers ──────────────────────────────────────────────

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

export function formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
    timeZone: VENUE_TIMEZONE,
  });
}

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

export function getAtlanticDateParts(date: Date): { year: number; month: number; day: number } {
  const formatted = date.toLocaleDateString('en-CA', { timeZone: VENUE_TIMEZONE });
  const [y, m, d] = formatted.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function todayRange(): { start: string; end: string } {
  return dayRange(new Date());
}

export function dayRange(date: Date): { start: string; end: string } {
  const { year, month, day } = getAtlanticDateParts(date);
  const startLocal = buildAtlanticDate(year, month, day, 0, 0, 0);
  const endLocal = buildAtlanticDate(year, month, day, 23, 59, 59, 999);
  return { start: startLocal.toISOString(), end: endLocal.toISOString() };
}

export function weekRange(weekStart: Date): { start: string; end: string } {
  const { year, month, day } = getAtlanticDateParts(weekStart);
  const startLocal = buildAtlanticDate(year, month, day, 0, 0, 0);
  const endDate = new Date(startLocal.getTime() + 6 * 24 * 60 * 60 * 1000);
  const endParts = getAtlanticDateParts(endDate);
  const endLocal = buildAtlanticDate(endParts.year, endParts.month, endParts.day, 23, 59, 59, 999);
  return { start: startLocal.toISOString(), end: endLocal.toISOString() };
}

export function todayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: VENUE_TIMEZONE });
}

export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { timeZone: VENUE_TIMEZONE });
}

// ─── Internal ─────────────────────────────────────────────────────

function getOffsetAtUTC(utcDate: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TIMEZONE,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
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

export function buildAtlanticDate(year: number, month: number, day: number, hours: number, minutes: number, seconds: number, ms: number = 0): Date {
  const target = Date.UTC(year, month - 1, day, hours, minutes, seconds, ms);

  // First pass: use offset at the "rough" UTC point
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
