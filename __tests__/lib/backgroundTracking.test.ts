// Targeted test for lib/backgroundTracking's ensureBackgroundTrackingRegistered
// — the shared "already granted" success path used by both hooks/useTrips.ts's
// requestPermissions() (user-triggered grant) and its mount-time
// permission-hydrate effect. Lives in its own module (deliberately free of
// useTrips.ts's heavier dependencies — supabase, react-query, AsyncStorage,
// tripEngine/activityFusion) so it can be tested without mocking that whole
// graph.
//
// This guards the regression this file previously fixed: a user whose
// OS-level location permission was already granted (previous install,
// granted via some other flow, already "Always" from before) had
// hasPermission stuck at null forever AND never got startLocationUpdatesAsync
// called, because that registration only ever ran inside the user-triggered
// requestPermissions().

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ensureBackgroundTrackingRegistered } from '@/lib/backgroundTracking';
import { LOCATION_TASK_NAME } from '@/tasks/locationTask';
import * as VeridianMotion from '@/modules/veridian-motion';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  startLocationUpdatesAsync: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  isTaskRegisteredAsync: jest.fn(),
}));

// Isolates this test from tasks/locationTask.ts's own AsyncStorage import —
// only the task-name constant is needed here.
jest.mock('@/tasks/locationTask', () => ({
  LOCATION_TASK_NAME: 'veridian-location-task',
}));

jest.mock('@/modules/veridian-motion', () => ({
  isAvailable: jest.fn(),
  startVisitMonitoring: jest.fn(),
}));

const mockIsTaskRegistered = TaskManager.isTaskRegisteredAsync as jest.Mock;
const mockStartLocationUpdates = Location.startLocationUpdatesAsync as jest.Mock;
const mockIsAvailable = VeridianMotion.isAvailable as jest.Mock;
const mockStartVisitMonitoring = VeridianMotion.startVisitMonitoring as jest.Mock;

describe('ensureBackgroundTrackingRegistered', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts background location updates when the task is not yet registered', async () => {
    mockIsTaskRegistered.mockResolvedValue(false);
    mockIsAvailable.mockReturnValue(false);
    const visitMonitoringRef = { current: false };

    await ensureBackgroundTrackingRegistered(visitMonitoringRef);

    expect(mockStartLocationUpdates).toHaveBeenCalledWith(
      LOCATION_TASK_NAME,
      expect.objectContaining({ distanceInterval: 100 }),
    );
  });

  it('does not re-register background location updates when already registered', async () => {
    mockIsTaskRegistered.mockResolvedValue(true);
    mockIsAvailable.mockReturnValue(false);
    const visitMonitoringRef = { current: false };

    await ensureBackgroundTrackingRegistered(visitMonitoringRef);

    expect(mockStartLocationUpdates).not.toHaveBeenCalled();
  });

  it('starts CLVisit monitoring once when the motion module is available and not yet started', async () => {
    mockIsTaskRegistered.mockResolvedValue(true);
    mockIsAvailable.mockReturnValue(true);
    mockStartVisitMonitoring.mockResolvedValue(undefined);
    const visitMonitoringRef = { current: false };

    await ensureBackgroundTrackingRegistered(visitMonitoringRef);

    expect(mockStartVisitMonitoring).toHaveBeenCalledTimes(1);
    expect(visitMonitoringRef.current).toBe(true);
  });

  it('does not start CLVisit monitoring again if the ref already flags it as started', async () => {
    mockIsTaskRegistered.mockResolvedValue(true);
    mockIsAvailable.mockReturnValue(true);
    const visitMonitoringRef = { current: true };

    await ensureBackgroundTrackingRegistered(visitMonitoringRef);

    expect(mockStartVisitMonitoring).not.toHaveBeenCalled();
  });

  it('swallows a startVisitMonitoring failure — best-effort, distance falls back to estimate', async () => {
    mockIsTaskRegistered.mockResolvedValue(true);
    mockIsAvailable.mockReturnValue(true);
    mockStartVisitMonitoring.mockRejectedValue(new Error('native module unavailable'));
    const visitMonitoringRef = { current: false };

    await expect(ensureBackgroundTrackingRegistered(visitMonitoringRef)).resolves.toBeUndefined();
    expect(visitMonitoringRef.current).toBe(true);
  });
});
