/**
 * Consecutive-logged-days streak from daily_summaries dates (newest first).
 *
 * Dates are "YYYY-MM-DD" strings. They are read as LOCAL calendar days:
 * `new Date("2026-10-03")` is UTC midnight, which is the previous evening
 * anywhere west of Greenwich, so the old comparison never matched "today"
 * and the streak read 0 for every user in the Americas.
 *
 * A streak that reaches yesterday still counts before today's first log, so
 * the number doesn't drop to 0 every morning.
 */
export function computeStreak(dates: string[], now: Date = new Date()): number {
  if (dates.length === 0) return 0;

  const check = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const first = parseLocalDay(dates[0]);
  if (first.getTime() !== check.getTime()) {
    check.setDate(check.getDate() - 1);
  }

  let s = 0;
  for (const date of dates) {
    if (parseLocalDay(date).getTime() === check.getTime()) {
      s++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return s;
}

function parseLocalDay(date: string): Date {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
