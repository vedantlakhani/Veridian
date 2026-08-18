// Clearing IA restructure (docs/DESIGN_DIRECTION.md — Information architecture):
// Today / Trends / You, three tabs. Log is demoted from a tab to a "+"
// affordance on Today and now lives as a root modal at app/log.tsx.
// Tests that the route files exist — rendering the full navigator requires a
// more complete test setup (handled in Phase 2 integration tests).

import * as fs from 'fs';
import * as path from 'path';

describe('navigation / tabs', () => {
  const tabsDir = path.resolve(__dirname, '../../app/(tabs)');
  const appDir = path.resolve(__dirname, '../../app');

  it('has index.tsx (Today tab)', () => {
    expect(fs.existsSync(path.join(tabsDir, 'index.tsx'))).toBe(true);
  });

  it('has trends.tsx (Trends tab)', () => {
    expect(fs.existsSync(path.join(tabsDir, 'trends.tsx'))).toBe(true);
  });

  it('has profile.tsx (You tab)', () => {
    expect(fs.existsSync(path.join(tabsDir, 'profile.tsx'))).toBe(true);
  });

  it('does not have log.tsx as a tab — Log is a "+" affordance, not a tab', () => {
    expect(fs.existsSync(path.join(tabsDir, 'log.tsx'))).toBe(false);
  });

  it('has log.tsx as a root modal screen', () => {
    expect(fs.existsSync(path.join(appDir, 'log.tsx'))).toBe(true);
  });

  it('has exactly three tabs registered in _layout.tsx', () => {
    const layoutPath = path.join(tabsDir, '_layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');
    const screenCount = (content.match(/<Tabs\.Screen/g) ?? []).length;
    expect(screenCount).toBe(3);
  });

  it('has _layout.tsx with Tabs component', () => {
    const layoutPath = path.join(tabsDir, '_layout.tsx');
    expect(fs.existsSync(layoutPath)).toBe(true);
    const content = fs.readFileSync(layoutPath, 'utf-8');
    expect(content).toContain('Tabs');
    expect(content).toContain('colors.primary'); // primary color in tabBarActiveTintColor
  });
});
