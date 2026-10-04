// Pin a timezone west of UTC: the bug this guards against only shows up there.
process.env.TZ = 'America/Toronto';

import { computeStreak } from '@/lib/streak';

// 9pm local on Sat 3 Oct 2026, which is already 4 Oct in UTC.
const NOW = new Date(2026, 9, 3, 21, 0, 0);

describe('computeStreak', () => {
  it('returns 0 with no logged days', () => {
    expect(computeStreak([], NOW)).toBe(0);
  });

  it('counts today as a local day in a timezone west of UTC', () => {
    expect(computeStreak(['2026-10-03', '2026-10-02', '2026-10-01'], NOW)).toBe(3);
  });

  it('keeps a streak that reaches yesterday before today is logged', () => {
    expect(computeStreak(['2026-10-02', '2026-10-01'], NOW)).toBe(2);
  });

  it('stops at the first gap', () => {
    expect(computeStreak(['2026-10-03', '2026-10-02', '2026-09-29'], NOW)).toBe(2);
  });

  it('returns 0 when the latest log is older than yesterday', () => {
    expect(computeStreak(['2026-10-01', '2026-09-30'], NOW)).toBe(0);
  });
});
