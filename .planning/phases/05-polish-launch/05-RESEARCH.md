# Phase 5: Polish & Launch - Research

**Researched:** 2026-03-22
**Domain:** Expo push notifications, onboarding carousel, offline SQLite queue, EAS Build, App Store submission
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Onboarding flow**
- Onboarding shown on first launch only — persisted via `AsyncStorage` key `onboarding_complete` (checked in root layout before routing to auth)
- Entry point: new route group `app/(onboarding)/index.tsx` — shows before `(auth)` on first launch, never after `onboarding_complete` is set
- 3 screens delivered as a single paginated ScrollView (paging enabled) or FlatList with `pagingEnabled: true`
- Carousel animation: Reanimated 3 `useSharedValue` + `interpolate` on translateX and opacity — never RN Animated API
- Skip button: top-right text button visible on all 3 screens — sets `onboarding_complete` and navigates to auth
- Screen content:
  1. "Track your impact" — hero text + animated VProgressRing preview (frozen, decorative)
  2. "AI-powered insights" — hero text + VAiInsightCard mockup (static, decorative)
  3. "Challenge friends" — hero text + leaderboard row mockups + notification permission CTA
- Notification permission requested on Screen 3 via `expo-notifications` `requestPermissionsAsync()` — better conversion than cold-ask in settings; non-blocking (user can skip)
- "Get Started" CTA on Screen 3 navigates to auth (login/signup)

**Push notifications**
- Package: `expo-notifications` (not yet installed — `npx expo install expo-notifications`)
- Daily reminder: local scheduled notification using `notification_preferences.reminder_time` from Supabase (DB table already has `daily_reminder_enabled` + `reminder_time` columns per Phase 1 schema)
- Notification scheduling happens in a `useNotifications` hook called from root layout after auth — reschedules on app foreground
- Streak milestone notifications (3-day, 7-day, 30-day): fired locally in `checkAndUnlockAchievements` (already called in `useCreateEntry`/`useUpdateEntry` onSuccess) — piggybacks on existing achievement detection
- Push token stored in `push_tokens` table (already in DB schema from Phase 1) for future server-side push support
- No server-side push in Phase 5 — all local notifications only (simpler, sufficient for v1)

**Offline entry caching**
- Package: `@react-native-community/netinfo` for network state detection
- expo-sqlite already installed — use it to create a local `offline_queue` table for pending emission entries
- Queue structure: `id`, `payload` (JSON of emission entry), `created_at`, `synced_at`
- Sync trigger: `NetInfo.addEventListener` — on reconnect flush queue via `useCreateEntry` mutation, then invalidate React Query cache
- UX: small fixed banner at top of screen when offline — "You're offline — entries will sync when connected" — Forest Green background, white text, dismisses automatically when reconnected
- Offline banner component: new `VOfflineBanner` in `components/ui/` — mounts in root layout

**App Store & EAS Build**
- EAS Build config: `eas.json` with `production` profile, `autoIncrement: true` for both iOS and Android
- iOS: screenshots at 6.7" (iPhone 16 Pro Max) and 6.1" (iPhone 15) — 5 screens minimum per App Store guidelines
- Android: phone screenshots (standard portrait) — 4 screens minimum
- Privacy policy: simple static HTML page — host via GitHub Pages at `vedantlakhani.github.io/veridian-privacy`
- App Store description: 170-char short description + full description emphasising carbon tracking + AI insights + social challenges
- `app.json` metadata: bundle ID `com.vedantlakhani.veridian`, version `1.0.0`, build number managed by EAS

**Performance targets**
- Cold start <3s: SplashScreen already managed by root layout (hideSplashScreen after auth init) — ensure font loading via `expo-font` is parallel with auth init, not sequential
- Navigation transitions <100ms: use Reanimated 3 `withTiming(1, { duration: 80 })` for any custom screen transitions — default Expo Router stack transitions are hardware-accelerated and typically sufficient
- No additional perf work needed beyond ensuring no blocking synchronous operations on startup

### Claude's Discretion
- Exact offline banner animation (slide-down vs fade)
- EAS project ID setup (run `eas init` interactively or use existing)
- Screenshot content (can use simulator screenshots of current app)
- Exact `eas.json` distribution channel naming

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLSH-01 | Onboarding flow: 3-screen carousel explaining core value, then signup/login | Expo Router Stack.Protected guard pattern + FlatList pagingEnabled + AsyncStorage key |
| PLSH-02 | Expo push notifications configured for daily logging reminders | expo-notifications scheduleNotificationAsync with SchedulableTriggerInputTypes.DAILY |
| PLSH-03 | Notification for streak milestone (3-day, 7-day, 30-day) | scheduleNotificationAsync one-shot from checkAndUnlockAchievements streak_days criteria |
| PLSH-04 | App cold start time <3 seconds on mid-range device | expo-font parallel load with auth init; SplashScreen.hideAsync after both resolve |
| PLSH-05 | Navigation transitions <100ms (Reanimated 3 driven) | withTiming duration 80ms; default stack transitions are hardware-accelerated |
| PLSH-06 | App Store metadata: screenshots, description, privacy policy URL | EAS Submit + App Store Connect; 5 screenshots minimum at 6.7" and 6.1" |
| PLSH-07 | Play Store metadata: screenshots, description, privacy policy URL | EAS Submit + Google Play Console; 4 screenshots minimum in portrait |
| PLSH-08 | Offline-capable: log entries cached locally, synced when online | expo-sqlite openDatabaseAsync + NetInfo.addEventListener flush pattern |
</phase_requirements>

---

## Summary

Phase 5 is the final phase, delivering four distinct workstreams: (1) onboarding carousel, (2) push notifications, (3) offline caching, and (4) store submission readiness. Each workstream is well-bounded and builds on existing project patterns rather than introducing new architectural paradigms.

The critical missing packages are `expo-notifications`, `@react-native-community/netinfo`, and `@react-native-async-storage/async-storage` — none are installed yet. All three have clean Expo install paths (`npx expo install`). The expo-sqlite package (v16.0.10) is already installed and uses a modern `openDatabaseAsync` + `execAsync`/`runAsync`/`getAllAsync` API — the old `createTableAsync` does not exist in v16.

The most structurally complex task is the onboarding route group: it must be checked before the auth guard in `app/_layout.tsx`. The existing `Stack.Protected` guard pattern (already used for `(auth)` vs `(tabs)`) extends cleanly — add a third `Stack.Protected` with `guard={!onboardingComplete}` wrapping the `(onboarding)` screen group, ordered before the auth screens.

**Primary recommendation:** Implement in wave order — onboarding first (pure frontend, unblocks notification permission UX), then notifications, then offline queue, then store assets/EAS last.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | ~0.29 (SDK 54) | Local notification scheduling + push token registration | Official Expo SDK; only supported path on managed workflow |
| @react-native-async-storage/async-storage | ~2.1 (expo install resolves) | Persist `onboarding_complete` flag | Included in Expo Go; standard RN key-value store |
| @react-native-community/netinfo | ~11.x | Detect connectivity changes for offline queue flush | Expo-compatible; standard React Native networking library |
| expo-sqlite (already installed) | ~16.0.10 | Offline entry queue storage | Already in project; modern async API |
| eas-cli | latest | EAS Build production profile + submit | Official Expo build/submit toolchain |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated (already installed) | ~4.1.1 | Carousel translateX/opacity interpolation | Onboarding screen-to-screen animation |
| expo-constants (already installed) | ~18.0.13 | Get `easConfig.projectId` for push token registration | Required by getExpoPushTokenAsync |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AsyncStorage for onboarding flag | expo-secure-store | SecureStore is overkill for a non-sensitive boolean; AsyncStorage is simpler and already in Expo Go |
| Local notifications only | Server-side Expo Push | Server-push requires FCM/APNs credentials and infra; local-only is sufficient for daily reminders v1 |
| expo-sqlite for offline queue | AsyncStorage array | SQLite is better for structured multi-row queue; already installed |

**Installation:**
```bash
npx expo install expo-notifications
npx expo install @react-native-async-storage/async-storage
npx expo install @react-native-community/netinfo
npm install -g eas-cli  # or npx eas-cli
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
app/
├── (onboarding)/
│   └── index.tsx          # 3-screen paginated carousel
├── _layout.tsx            # add onboarding check + useNotifications mount

hooks/
├── useNotifications.ts    # scheduling + token registration
├── useOfflineQueue.ts     # sqlite queue + NetInfo listener

components/ui/
├── VOfflineBanner.tsx     # fixed banner: offline status
├── index.ts               # add VOfflineBanner export

__tests__/hooks/
├── useNotifications.test.ts   # Wave 0 stubs
├── useOfflineQueue.test.ts    # Wave 0 stubs

__tests__/components/
├── VOfflineBanner.test.tsx    # Wave 0 stubs
```

### Pattern 1: Onboarding Gate in Root Layout (Stack.Protected)

The existing `app/_layout.tsx` uses two `Stack.Protected` blocks. Add a third for onboarding, ordered FIRST. Onboarding must resolve before auth routing fires.

**Critical ordering:** onboarding check runs during the same `initialize()` call or in a parallel `useEffect`. The root layout currently returns `null` while `isLoading`. Add a second boolean `onboardingChecked` so the splash screen stays visible until BOTH auth init and AsyncStorage read complete.

```typescript
// Source: expo-router/build/views/Protected.d.ts (verified in project node_modules)
// ProtectedProps = { guard: boolean; children?: ReactNode }

function AppNavigator() {
  const { session, user } = useAuthStore();
  const { onboardingComplete } = useOnboardingStore(); // new Zustand store
  useEmissionRealtime(user?.id);
  useNotifications(user?.id); // new hook, mounted here

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Onboarding gate — checked first, before auth */}
      <Stack.Protected guard={!onboardingComplete}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
```

**Onboarding store (new Zustand store):**
```typescript
// Mirrors authStore.initialize() pattern
interface OnboardingState {
  onboardingComplete: boolean;
  isChecked: boolean;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
}
// initialize(): AsyncStorage.getItem('onboarding_complete') → set state
// complete(): AsyncStorage.setItem('onboarding_complete', 'true') → set state
```

**Root layout: parallel init pattern:**
```typescript
// Both initialize() calls fire in parallel via Promise.all equivalent
useEffect(() => {
  authStore.initialize();
  onboardingStore.initialize();
}, []);

// Splash hidden only when both are done
useEffect(() => {
  if (!authStore.isLoading && onboardingStore.isChecked) {
    SplashScreen.hideAsync();
  }
}, [authStore.isLoading, onboardingStore.isChecked]);

if (authStore.isLoading || !onboardingStore.isChecked) return null;
```

### Pattern 2: Paginated Carousel with Reanimated 3

Use `FlatList` with `pagingEnabled: true` and `onScroll` wired to a `useSharedValue`. The `interpolate` function drives per-slide dot opacity or translateX for indicator animation.

```typescript
// Source: Reanimated 4.1.1 installed (react-native-reanimated ~4.1.1)
// interpolate and useSharedValue verified in node_modules index.d.ts
import { useSharedValue, interpolate, Extrapolation, useAnimatedScrollHandler, useAnimatedStyle } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const scrollX = useSharedValue(0);

const scrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    scrollX.value = event.contentOffset.x;
  },
});

// Per-slide dot indicator style
const dotStyle = (index: number) =>
  useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    ),
    width: interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [8, 24, 8],
      Extrapolation.CLAMP
    ),
  }));

// FlatList must be Animated.FlatList from reanimated
<Animated.FlatList
  data={SLIDES}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  onScroll={scrollHandler}
  scrollEventThrottle={16}
  renderItem={({ item }) => <SlideScreen slide={item} />}
/>
```

### Pattern 3: expo-notifications (Local Scheduling)

**Key insight:** `scheduleNotificationAsync` with `SchedulableTriggerInputTypes.DAILY` fires once per day at specified hour:minute. Use `cancelAllScheduledNotificationsAsync()` before re-scheduling to prevent duplicates on app foreground.

```typescript
// Source: expo-notifications docs (Expo SDK 54) + SchedulableTriggerInputTypes verified
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

// Android channel setup (required before scheduling)
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Veridian Reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// Daily reminder — cancel + reschedule pattern
async function scheduleDailyReminder(hour: number, minute: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Log your carbon today',
      body: 'Track your impact and keep your streak going.',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// Streak milestone — one-shot notification (fires immediately)
async function notifyStreakMilestone(days: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${days}-day streak!`,
      body: `You've logged for ${days} days in a row. Keep it up!`,
    },
    trigger: null, // fires immediately
  });
}

// Permission check (called from onboarding Screen 3)
const { status } = await Notifications.requestPermissionsAsync();
```

**Push token registration (for push_tokens table):**
```typescript
// Source: expo-notifications docs SDK 54
import Constants from 'expo-constants';

const projectId =
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.easConfig?.projectId;

const token = (
  await Notifications.getExpoPushTokenAsync({ projectId })
).data;
// Insert token to push_tokens table via Supabase
```

### Pattern 4: expo-sqlite v16 Offline Queue

**Critical:** expo-sqlite v16 does NOT have `createTableAsync`. The API is `openDatabaseAsync` returning a `SQLiteDatabase` instance with `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`.

```typescript
// Source: expo-sqlite v16.0.10 SQLiteDatabase.d.ts verified in node_modules
import * as SQLite from 'expo-sqlite';

// Initialize database (call once at app start or in hook init)
const db = await SQLite.openDatabaseAsync('offline_queue.db');

// Create table
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced_at TEXT
  );
`);

// Insert pending entry
await db.runAsync(
  'INSERT INTO offline_queue (payload, created_at) VALUES (?, ?)',
  JSON.stringify(entryPayload),
  new Date().toISOString()
);

// Fetch all pending (unsynced)
const pending = await db.getAllAsync<{ id: number; payload: string }>(
  'SELECT id, payload FROM offline_queue WHERE synced_at IS NULL'
);

// Mark as synced
await db.runAsync(
  'UPDATE offline_queue SET synced_at = ? WHERE id = ?',
  new Date().toISOString(),
  id
);
```

### Pattern 5: NetInfo Connectivity Listener

```typescript
// Source: @react-native-community/netinfo README (verified)
import NetInfo, { addEventListener } from '@react-native-community/netinfo';

// In useOfflineQueue hook
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      await flushQueue(); // flush offline_queue to Supabase
    }
  });
  return unsubscribe;
}, []);
```

### Pattern 6: EAS Build eas.json

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true,
      "distribution": "store"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "APPLE_ID_HERE",
        "ascAppId": "APP_STORE_CONNECT_APP_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Critical:** `autoIncrement: true` requires `"appVersionSource": "remote"` in `cli` section — EAS servers track the build number remotely.

### Anti-Patterns to Avoid

- **Old SQLite API:** Never use `db.transaction()` or `db.createTableAsync()` — these are expo-sqlite v14/v15 patterns. v16 uses `execAsync`/`runAsync`/`getAllAsync`.
- **Blocking startup:** Do not `await AsyncStorage.getItem()` sequentially after auth init — run both in parallel so neither blocks SplashScreen.hideAsync.
- **Double notifications:** Always `cancelAllScheduledNotificationsAsync()` before re-scheduling daily reminders — otherwise every app foreground creates a duplicate.
- **Hard-coded push token request:** `getExpoPushTokenAsync` requires a physical device AND a built app (not Expo Go) — guard with `Device.isDevice` check and skip gracefully in Expo Go.
- **Missing Android notification channel:** On Android 13+, `setNotificationChannelAsync` must be called before requesting permissions or scheduling — skip it and permissions silently fail.
- **FlatList vs ScrollView for carousel:** `FlatList` with `pagingEnabled` is preferred over ScrollView for 3+ screens — it virtualizes off-screen slides and the `onScroll` wiring to `useAnimatedScrollHandler` is cleaner.
- **Onboarding guard ordering:** If `(onboarding)` Stack.Protected is placed AFTER the auth guards, a logged-in user on first launch will route to `(tabs)` before onboarding shows. The onboarding guard MUST be first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Local notification scheduling | Custom timer/setTimeout | expo-notifications `scheduleNotificationAsync` | setTimeout doesn't survive app restart; OS notification system handles persistence |
| Network connectivity detection | XMLHttpRequest ping loop | @react-native-community/netinfo | Handles WiFi vs cellular vs airplane mode; platform-specific event system |
| Offline data persistence | AsyncStorage JSON array | expo-sqlite (already installed) | Transactional, queryable, handles concurrent writes, doesn't corrupt on crash |
| Build number management | Manual version bumps | EAS autoIncrement | Prevents duplicate build number rejections from App Store/Play Store |

**Key insight:** Notification scheduling must survive app restarts. The OS holds scheduled notifications — when the user force-quits and reopens, the schedule is intact. Any JS-timer approach would lose all scheduled notifications on restart.

---

## Common Pitfalls

### Pitfall 1: expo-sqlite v16 API Mismatch
**What goes wrong:** Code written using expo-sqlite v13/v14 docs (which is most training data) calls `db.transaction()`, `db.createTableAsync()`, or `db.execAsync({ sql, args })` — all of which do not exist in v16.
**Why it happens:** Most SQLite examples online predate the v15+ API rewrite.
**How to avoid:** Use only these v16 methods: `openDatabaseAsync`, `execAsync(sql: string)`, `runAsync(sql, ...params)`, `getAllAsync<T>(sql)`, `getFirstAsync<T>(sql)`. Verified in `/node_modules/expo-sqlite/build/SQLiteDatabase.d.ts`.
**Warning signs:** TypeScript error "Property 'createTableAsync' does not exist on type 'SQLiteDatabase'".

### Pitfall 2: Onboarding Route Group Ordering
**What goes wrong:** `(onboarding)` `Stack.Protected` placed after the `(auth)` guard. Authenticated users on first launch skip onboarding entirely and land on `(tabs)`.
**Why it happens:** Auth guard comes first in most examples because auth is the primary guard.
**How to avoid:** Place `<Stack.Protected guard={!onboardingComplete}>` as the FIRST child of `<Stack>` in AppNavigator.
**Warning signs:** Existing users who reinstall see no onboarding on first launch after reinstall.

### Pitfall 3: SplashScreen Hides Before Onboarding Check
**What goes wrong:** `SplashScreen.hideAsync()` called after `isLoading` resolves, but `onboardingChecked` (AsyncStorage read) hasn't completed yet — app briefly shows blank screen or flashes wrong route.
**Why it happens:** Current `_layout.tsx` only guards on `isLoading` from authStore. AsyncStorage read is a second async operation.
**How to avoid:** Add `onboardingStore.isChecked` to the combined guard: `if (!isLoading && isChecked) SplashScreen.hideAsync()`. Return null from RootLayout until both are true.

### Pitfall 4: Push Token in Expo Go
**What goes wrong:** `getExpoPushTokenAsync` throws "Must be a standalone application" error in Expo Go.
**Why it happens:** Expo push tokens require the EAS projectId configured in a native build.
**How to avoid:** Wrap token registration in `if (Device.isDevice && !__DEV__)` or catch the error gracefully. Store null token for Expo Go sessions.

### Pitfall 5: Android Missing Notification Channel
**What goes wrong:** Notification permission granted but notifications never appear on Android 13+.
**Why it happens:** Android 13+ requires an explicit notification channel before displaying local notifications. The default channel is not created automatically.
**How to avoid:** In `useNotifications` hook init, check `Platform.OS === 'android'` and call `setNotificationChannelAsync('default', { ... })` before any scheduling.

### Pitfall 6: bundle ID Mismatch
**What goes wrong:** EAS Build uses `com.veridian.app` from current `app.json` but CONTEXT.md specifies the target bundle ID as `com.vedantlakhani.veridian`.
**Why it happens:** The `app.json` currently has `"bundleIdentifier": "com.veridian.app"` — this must be updated to match the desired App Store bundle ID before the first EAS production build.
**How to avoid:** Update `app.json` iOS `bundleIdentifier` and Android `package` to `com.vedantlakhani.veridian` in the EAS setup plan. Bundle IDs cannot be changed after the first App Store submission.
**Warning signs:** EAS Build creates a new provisioning profile with `com.veridian.app` that won't match an App Store Connect app registered as `com.vedantlakhani.veridian`.

### Pitfall 7: Reanimated 4 vs Reanimated 3 API
**What goes wrong:** Examples reference Reanimated 3 (`~3.x`) but the project has Reanimated 4.1.1 installed (`react-native-reanimated: ~4.1.1`).
**Why it happens:** CONTEXT.md and PROJECT.md say "Reanimated 3" but the installed version is actually 4.x.
**How to avoid:** The core API (`useSharedValue`, `useAnimatedStyle`, `interpolate`, `withTiming`, `withSpring`, `runOnJS`) is backward-compatible between 3 and 4. Use the same patterns as existing VBottomSheet and VProgressRing. The installed version is Reanimated 4.1.7 (confirmed from node_modules).

---

## Code Examples

### Parallel Init in Root Layout

```typescript
// Prevents splash screen flicker — both checks must complete before routing
export default function RootLayout() {
  const { isLoading, initialize: initAuth } = useAuthStore();
  const { isChecked, initialize: initOnboarding } = useOnboardingStore();

  useEffect(() => {
    initAuth();        // reads Supabase session
    initOnboarding();  // reads AsyncStorage 'onboarding_complete'
  }, []);

  useEffect(() => {
    if (!isLoading && isChecked) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, isChecked]);

  if (isLoading || !isChecked) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AppNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

### AsyncStorage Onboarding Store

```typescript
// Source: @react-native-async-storage/async-storage (npx expo install confirmed)
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'onboarding_complete';

export const useOnboardingStore = create<OnboardingState>((set) => ({
  onboardingComplete: false,
  isChecked: false,

  initialize: async () => {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    set({ onboardingComplete: value === 'true', isChecked: true });
  },

  complete: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ onboardingComplete: true });
  },
}));
```

### useNotifications Hook Skeleton

```typescript
// hooks/useNotifications.ts
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import { useAppState } from '@react-native/hooks'; // or AppState from RN
import { supabase } from '@/lib/supabase';

export function useNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    async function setup() {
      // Android channel (must run before scheduling)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Veridian',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      // Fetch user preferences from Supabase
      const { data } = await supabase
        .from('notification_preferences')
        .select('daily_reminder_enabled, reminder_time')
        .eq('user_id', userId)
        .single();

      if (data?.daily_reminder_enabled && data?.reminder_time) {
        const [hour, minute] = data.reminder_time.split(':').map(Number);
        // Cancel all then reschedule — prevents duplicates on re-mount
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Log your carbon today',
            body: 'Keep your streak going with a quick log.',
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
      }
    }

    setup();
  }, [userId]);
}
```

### useOfflineQueue Hook Skeleton

```typescript
// hooks/useOfflineQueue.ts
import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';

// Source: expo-sqlite v16.0.10 SQLiteDatabase.d.ts — openDatabaseAsync, execAsync, runAsync, getAllAsync
let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('offline_queue.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced_at TEXT
      );
    `);
  }
  return db;
}

export async function enqueueEntry(payload: object) {
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO offline_queue (payload, created_at) VALUES (?, ?)',
    JSON.stringify(payload),
    new Date().toISOString()
  );
}

export function useOfflineQueue(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        const database = await getDb();
        const rows = await database.getAllAsync<{ id: number; payload: string }>(
          'SELECT id, payload FROM offline_queue WHERE synced_at IS NULL'
        );
        for (const row of rows) {
          // Use existing useCreateEntry mutation pattern (direct supabase call)
          await syncEntry(JSON.parse(row.payload), userId);
          await database.runAsync(
            'UPDATE offline_queue SET synced_at = ? WHERE id = ?',
            new Date().toISOString(),
            row.id
          );
        }
        // Invalidate caches after flush
        queryClient.invalidateQueries({ queryKey: ['emission_entries'] });
      }
    });

    return unsubscribe;
  }, [userId]);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `db.transaction()` in expo-sqlite | `execAsync`/`runAsync` direct methods | expo-sqlite v15+ | All SQLite code must use the new API |
| Reanimated `Extrapolate.CLAMP` (string enum) | `Extrapolation.CLAMP` (object import) | Reanimated 3.x | Import `Extrapolation` from reanimated, not `Extrapolate` |
| `expo-notifications` trigger as plain object `{ seconds: N }` | `{ type: SchedulableTriggerInputTypes.DAILY, hour, minute }` | expo-notifications 0.22+ | Must use `SchedulableTriggerInputTypes` enum |
| Manual EAS build number bumping | `autoIncrement: true` + `appVersionSource: remote` | EAS CLI 3+ | Build numbers managed server-side; no manual edits |
| `createTableAsync` in expo-sqlite | Does not exist in v16 | expo-sqlite v15 | Breaking — generates runtime error |

**Deprecated/outdated:**
- `Animated.ScrollView` from RN core: replaced by `Animated.FlatList` from reanimated for gesture-driven carousels
- `db.transaction(callback)`: expo-sqlite v16 removes this; use `withTransactionAsync` or direct async methods
- `expo-notifications` trigger `{ seconds, repeats }` shape still valid for `TimeIntervalTrigger` but `DAILY` trigger requires the enum type field

---

## Package Install Audit

Confirmed NOT installed (required for Phase 5):
- `expo-notifications` — NOT in node_modules
- `@react-native-async-storage/async-storage` — NOT in node_modules
- `@react-native-community/netinfo` — NOT in node_modules

Confirmed installed and usable:
- `expo-sqlite` v16.0.10 — installed, new async API verified
- `react-native-reanimated` v4.1.7 — installed, `interpolate` + `useSharedValue` exports verified
- `expo-font` v14.0.11 — installed (already used)
- `expo-constants` v18.0.13 — installed (needed for projectId in push token)

bundle ID discrepancy to resolve:
- Current `app.json`: `"bundleIdentifier": "com.veridian.app"`, `"package": "com.veridian.app"`
- CONTEXT.md target: `com.vedantlakhani.veridian`
- This MUST be corrected in the EAS setup plan before any production build

---

## Open Questions

1. **`expo-device` for push token guard**
   - What we know: `getExpoPushTokenAsync` fails in Expo Go and simulators
   - What's unclear: Whether `expo-device` is installed (need to check) or if `__DEV__` flag is sufficient
   - Recommendation: Use a try/catch around token registration and log the error silently; also check `Constants.easConfig?.projectId` is defined before calling

2. **Supabase `notification_preferences` default row**
   - What we know: The table exists with `daily_reminder_enabled` and `reminder_time` columns
   - What's unclear: Whether a row is created automatically on signup (migration trigger) or must be created on first useNotifications call
   - Recommendation: In `useNotifications`, use `upsert` pattern to ensure a row exists before reading preferences

3. **EAS project ID**
   - What we know: `eas init` creates a project and injects `projectId` into `app.json` under `extra.eas`
   - What's unclear: Whether the EAS project has already been created for this app
   - Recommendation: Plan should include `eas init` as a setup task and document the resulting `projectId` injection

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | jest-expo@54.0.17 + jest@30.3.0 |
| Config file | `jest.config.js` (project root) |
| Quick run command | `npx jest --testPathPattern="useNotifications|useOfflineQueue|VOfflineBanner" --coverage=false` |
| Full suite command | `npx jest --coverage=false` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLSH-01 | Onboarding renders 3 slides; skip sets AsyncStorage key | unit | `npx jest --testPathPattern="onboarding" --coverage=false` | Wave 0 |
| PLSH-02 | useNotifications schedules daily notification from preferences | unit | `npx jest --testPathPattern="useNotifications" --coverage=false` | Wave 0 |
| PLSH-03 | Streak milestone fires immediate notification at correct threshold | unit | `npx jest --testPathPattern="useNotifications" --coverage=false` | Wave 0 |
| PLSH-04 | Cold start <3s — no automated test; manual device benchmark | manual | n/a | manual-only |
| PLSH-05 | Transitions <100ms — no automated test; visual verification | manual | n/a | manual-only |
| PLSH-06 | App Store metadata files exist | manual | n/a | manual-only |
| PLSH-07 | Play Store metadata files exist | manual | n/a | manual-only |
| PLSH-08 | Offline entries enqueued and flushed on reconnect | unit | `npx jest --testPathPattern="useOfflineQueue" --coverage=false` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="useNotifications|useOfflineQueue|VOfflineBanner" --coverage=false`
- **Per wave merge:** `npx jest --coverage=false`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/hooks/useNotifications.test.ts` — covers PLSH-02, PLSH-03
- [ ] `__tests__/hooks/useOfflineQueue.test.ts` — covers PLSH-08
- [ ] `__tests__/components/VOfflineBanner.test.tsx` — covers PLSH-08 UX
- [ ] `__tests__/stores/onboardingStore.test.ts` — covers PLSH-01 persistence logic

Framework install: already installed — jest-expo@54, jest@30. No new packages needed for testing.

---

## Sources

### Primary (HIGH confidence)
- `/Users/vedantlakhani/Desktop/Veridian/node_modules/expo-sqlite/build/SQLiteDatabase.d.ts` — v16 API: execAsync, runAsync, getAllAsync, getFirstAsync, openDatabaseAsync
- `/Users/vedantlakhani/Desktop/Veridian/node_modules/expo-router/build/views/Protected.d.ts` — ProtectedProps type: `{ guard: boolean; children?: ReactNode }`
- `/Users/vedantlakhani/Desktop/Veridian/node_modules/react-native-reanimated/lib/typescript/index.d.ts` — interpolate, useSharedValue, withTiming exports verified
- `https://docs.expo.dev/versions/v54.0.0/sdk/notifications/` — requestPermissionsAsync, scheduleNotificationAsync, SchedulableTriggerInputTypes.DAILY, cancelAllScheduledNotificationsAsync
- `https://docs.expo.dev/push-notifications/push-notifications-setup/` — getExpoPushTokenAsync with projectId, Android channel setup

### Secondary (MEDIUM confidence)
- `https://docs.expo.dev/build-reference/app-versions/` — autoIncrement requires appVersionSource: remote in cli section
- `https://docs.expo.dev/eas/json/` — EAS submit profile structure (ios: appleId/ascAppId, android: track/serviceAccountKeyPath)
- `https://github.com/react-native-netinfo/react-native-netinfo` — addEventListener API, NetInfoState.isConnected, no app.json plugin required
- `https://developer.apple.com/app-store/review/guidelines/` — privacy policy required, account deletion, notification opt-out

### Tertiary (LOW confidence)
- App Store screenshot size requirements (6.7" and 6.1") — from CONTEXT.md, not independently verified against current App Store Connect requirements

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules or official Expo docs
- Architecture: HIGH — Stack.Protected type verified in source; SQLite v16 API verified in node_modules; Reanimated patterns verified against existing code
- Pitfalls: HIGH — SQLite API change verified by inspecting actual type definitions; bundle ID mismatch confirmed by reading app.json
- EAS config: MEDIUM — autoIncrement + appVersionSource requirement verified via official docs; submit profile structure verified

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (Expo SDK 54 stable; expo-notifications API stable)
