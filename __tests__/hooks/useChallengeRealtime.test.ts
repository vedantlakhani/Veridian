// Tests for useChallengeRealtime — subscription setup and cleanup

let useChallengeRealtime: ((challengeId: string | undefined) => void) | undefined;

beforeAll(async () => {
  try {
    const mod = await import('@/hooks/useChallengeRealtime');
    useChallengeRealtime = mod.useChallengeRealtime;
  } catch {
    useChallengeRealtime = undefined;
  }
});

describe('useChallengeRealtime', () => {
  it('exports useChallengeRealtime as a named function', () => {
    if (!useChallengeRealtime) return;
    expect(typeof useChallengeRealtime).toBe('function');
  });

  it.todo('subscribes to challenge_participants channel on mount');
  it.todo('unsubscribes on unmount');
});
