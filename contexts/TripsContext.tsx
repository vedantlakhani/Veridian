import { createContext, useContext, type ReactNode } from 'react';
import { useTrips } from '@/hooks/useTrips';

// The trips pipeline (hooks/useTrips.ts) owns side effects — background-task
// sync, entry creation, notifications — so it must run exactly once. This
// provider is that single mount (app/_layout.tsx); screens read the pipeline
// through useTripsContext() and never call useTrips() directly, otherwise a
// second effect copy would race the first over the same trips.

type TripsContextValue = ReturnType<typeof useTrips>;

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: ReactNode;
}) {
  const trips = useTrips(userId);
  return <TripsContext.Provider value={trips}>{children}</TripsContext.Provider>;
}

export function useTripsContext(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) {
    throw new Error('useTripsContext must be used within TripsProvider (mounted in app/_layout.tsx)');
  }
  return ctx;
}
