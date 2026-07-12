import {
  scheduleWeeklyRecapNotification,
  WEEKLY_RECAP_IDENTIFIER,
} from '@/lib/recapNotification';

// Mock expo-notifications — record call order so the cancel-before-schedule
// (no-duplicate) invariant can be asserted directly.
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { CALENDAR: 'calendar' },
}));

const Notifications = require('expo-notifications') as {
  getPermissionsAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('scheduleWeeklyRecapNotification', () => {
  it('does nothing when notification permission is not granted', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await scheduleWeeklyRecapNotification();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels the stable identifier BEFORE scheduling when granted', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    const order: string[] = [];
    Notifications.cancelScheduledNotificationAsync.mockImplementation(async () => {
      order.push('cancel');
    });
    Notifications.scheduleNotificationAsync.mockImplementation(async () => {
      order.push('schedule');
      return 'id';
    });

    await scheduleWeeklyRecapNotification();

    expect(order).toEqual(['cancel', 'schedule']);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      WEEKLY_RECAP_IDENTIFIER,
    );
  });

  it('schedules a repeating Sunday 18:30 calendar trigger under the stable id', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await scheduleWeeklyRecapNotification();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.identifier).toBe(WEEKLY_RECAP_IDENTIFIER);
    expect(arg.trigger).toMatchObject({
      type: 'calendar',
      weekday: 1, // Sunday
      hour: 18,
      minute: 30,
      repeats: true,
    });
  });

  it('never stacks duplicates across repeated foregrounds (cancels each time)', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });

    await scheduleWeeklyRecapNotification();
    await scheduleWeeklyRecapNotification();
    await scheduleWeeklyRecapNotification();

    // One cancel + one schedule per call — same identifier, so at most one
    // scheduled notification ever exists on the OS.
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    for (const call of Notifications.scheduleNotificationAsync.mock.calls) {
      expect(call[0].identifier).toBe(WEEKLY_RECAP_IDENTIFIER);
    }
  });
});
