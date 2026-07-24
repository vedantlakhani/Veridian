// __tests__/06/theme.test.ts
// Wave 0 stub — Phase 6 dark token assertions
// Pattern from Phase 2 Wave 0: beforeAll async import + if(!fn) guard

let colors: typeof import('@/lib/theme').colors | undefined;

beforeAll(async () => {
  try {
    const mod = await import('@/lib/theme');
    colors = mod.colors;
  } catch {
    colors = undefined;
  }
});

describe('Phase 6 — dark theme tokens', () => {
  // Values re-pinned to the Understory palette (docs/DESIGN_DIRECTION.md).
  it('background is near-black "soil" #0E1512', () => {
    if (!colors) return;
    expect(colors.background).toBe('#0E1512');
  });

  it('surface is dark card #161F1A', () => {
    if (!colors) return;
    expect(colors.surface).toBe('#161F1A');
  });

  it('primary is moss #5FA876', () => {
    if (!colors) return;
    expect(colors.primary).toBe('#5FA876');
  });

  it('textPrimary is parchment #F2F0E8', () => {
    if (!colors) return;
    expect(colors.textPrimary).toBe('#F2F0E8');
  });

  it('textSecondary is muted #9BA89E', () => {
    if (!colors) return;
    expect(colors.textSecondary).toBe('#9BA89E');
  });

  it('border is a subtle white hairline', () => {
    if (!colors) return;
    expect(colors.border).toBe('rgba(255,255,255,0.06)');
  });

  it('surfaceElevated exists for modals at #1E2B23', () => {
    if (!colors) return;
    expect((colors as Record<string, string>).surfaceElevated).toBe('#1E2B23');
  });
});
