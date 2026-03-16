// FOUND-21: Bottom tab navigator with Home, Log, Insights, Profile tabs
// Tests that the tab route files exist — rendering the full navigator
// requires a more complete test setup (handled in Phase 2 integration tests)

import * as fs from 'fs';
import * as path from 'path';

describe('navigation / tabs', () => {
  const tabsDir = path.resolve(__dirname, '../../app/(tabs)');

  it('has index.tsx (Home tab)', () => {
    expect(fs.existsSync(path.join(tabsDir, 'index.tsx'))).toBe(true);
  });

  it('has log.tsx (Log tab)', () => {
    expect(fs.existsSync(path.join(tabsDir, 'log.tsx'))).toBe(true);
  });

  it('has insights.tsx (Insights tab)', () => {
    expect(fs.existsSync(path.join(tabsDir, 'insights.tsx'))).toBe(true);
  });

  it('has profile.tsx (Profile tab)', () => {
    expect(fs.existsSync(path.join(tabsDir, 'profile.tsx'))).toBe(true);
  });

  it('has _layout.tsx with Tabs component', () => {
    const layoutPath = path.join(tabsDir, '_layout.tsx');
    expect(fs.existsSync(layoutPath)).toBe(true);
    const content = fs.readFileSync(layoutPath, 'utf-8');
    expect(content).toContain('Tabs');
    expect(content).toContain('#1B7A4A'); // primary color in tabBarActiveTintColor
  });
});
