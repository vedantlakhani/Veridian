// Wave 0 stub — hooks/useNotifications does not exist yet; tests skip gracefully
// Covers PLSH-02: schedule daily reminder, PLSH-03: streak notification trigger

let mod:
  | {
      scheduleDailyReminder?: (hour: number, minute: number) => Promise<void>;
      notifyStreakMilestone?: (days: number) => Promise<void>;
      registerPushToken?: (userId: string) => Promise<void>;
    }
  | undefined;

beforeAll(async () => {
  try {
    // @ts-ignore — source module doesn't exist yet; TS2307 is expected
    mod = await import('@/hooks/useNotifications');
  } catch {
    // source module doesn't exist yet — tests will be skipped
  }
});

describe('useNotifications', () => {
  it('scheduleDailyReminder is exported', () => {
    if (!mod) return; // guard: skips if source missing
    expect(typeof mod.scheduleDailyReminder).toBe('function');
  });

  it('notifyStreakMilestone is exported', () => {
    if (!mod) return; // guard: skips if source missing
    expect(typeof mod.notifyStreakMilestone).toBe('function');
  });

  it('registerPushToken is exported', () => {
    if (!mod) return; // guard: skips if source missing
    expect(typeof mod.registerPushToken).toBe('function');
  });
});
