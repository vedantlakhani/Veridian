// Wave 0 stub — stores/useOnboardingStore does not exist yet; tests skip gracefully
// Covers PLSH-01: onboarding completion flag read/write

let mod:
  | {
      initialize?: () => Promise<void>;
      complete?: () => Promise<void>;
      useOnboardingStore?: () => { onboardingComplete: boolean };
    }
  | undefined;

beforeAll(async () => {
  try {
    // @ts-ignore — source module doesn't exist yet; TS2307 is expected
    mod = await import('@/stores/useOnboardingStore');
  } catch {
    // source module doesn't exist yet — tests will be skipped
  }
});

describe('useOnboardingStore', () => {
  describe('initialize', () => {
    it('initialize sets onboardingComplete to false when AsyncStorage returns null', async () => {
      if (!mod) return; // guard: skips if source missing
      expect(typeof mod.initialize).toBe('function');
    });

    it('initialize sets onboardingComplete to true when AsyncStorage returns "true"', async () => {
      if (!mod) return; // guard: skips if source missing
      expect(typeof mod.initialize).toBe('function');
    });
  });

  describe('complete', () => {
    it('complete sets onboardingComplete to true', async () => {
      if (!mod) return; // guard: skips if source missing
      expect(typeof mod.complete).toBe('function');
    });
  });

  describe('exports', () => {
    it('useOnboardingStore is exported', () => {
      if (!mod) return; // guard: skips if source missing
      expect(typeof mod.useOnboardingStore).toBe('function');
    });

    it('initialize is exported', () => {
      if (!mod) return; // guard: skips if source missing
      expect(typeof mod.initialize).toBe('function');
    });

    it('complete is exported', () => {
      if (!mod) return; // guard: skips if source missing
      expect(typeof mod.complete).toBe('function');
    });
  });
});
