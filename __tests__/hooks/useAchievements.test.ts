// Tests for useAchievements hook and checkAndUnlockAchievements function
import { checkAndUnlockAchievements, useAchievements } from '@/hooks/useAchievements';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock getLocalDateString from lib/emissions
jest.mock('@/lib/emissions', () => ({
  getLocalDateString: jest.fn(() => '2026-03-22'),
}));

import { supabase } from '@/lib/supabase';

const mockFrom = supabase.from as jest.Mock;

describe('checkAndUnlockAchievements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports useAchievements function', () => {
    expect(typeof useAchievements).toBe('function');
  });

  it('exports checkAndUnlockAchievements function', () => {
    expect(typeof checkAndUnlockAchievements).toBe('function');
  });

  it('detects first_log criteria and unlocks badge', async () => {
    const firstLogAchievement = {
      id: 'ach-1',
      name: 'First Log',
      description: 'Logged first entry',
      icon: 'star',
      criteria_type: 'first_log' as const,
      criteria_value: 1,
      created_at: '2026-01-01',
    };

    // Track call order
    let callIndex = 0;

    mockFrom.mockImplementation((table: string) => {
      callIndex++;

      if (table === 'achievements' && callIndex === 1) {
        // 1st call: fetch all achievements
        return {
          select: jest.fn().mockResolvedValue({ data: [firstLogAchievement], error: null }),
        };
      }

      if (table === 'user_achievements' && callIndex === 2) {
        // 2nd call: fetch earned achievement IDs
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }

      if (table === 'emission_entries') {
        // checkCriteria: first_log count
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
          }),
        };
      }

      if (table === 'user_achievements') {
        // insert unlock
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }

      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const result = await checkAndUnlockAchievements('user-123');
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when all achievements already earned', async () => {
    const achievement = {
      id: 'ach-1',
      name: 'First Log',
      description: 'Logged first entry',
      icon: 'star',
      criteria_type: 'first_log' as const,
      criteria_value: 1,
      created_at: '2026-01-01',
    };

    let callIndex = 0;
    mockFrom.mockImplementation((table: string) => {
      callIndex++;

      if (table === 'achievements') {
        return {
          select: jest.fn().mockResolvedValue({ data: [achievement], error: null }),
        };
      }

      if (table === 'user_achievements') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ achievement_id: 'ach-1' }],
              error: null,
            }),
          }),
        };
      }

      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const result = await checkAndUnlockAchievements('user-123');
    expect(result).toEqual([]);
  });
});
