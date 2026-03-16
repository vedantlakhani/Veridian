# Phase 1: Foundation - Research

**Researched:** 2026-03-15
**Domain:** Expo SDK 52+, Expo Router v4, Supabase Auth + PostgreSQL, React Native Reanimated 3
**Confidence:** HIGH (core stack verified via official docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Expo project scaffolded with TypeScript strict mode, Expo Router v4, correct directory structure | Expo Router installation, tsconfig strict, metro path aliases — fully documented |
| FOUND-02 | Supabase PostgreSQL schema with all 13 tables via migrations | Supabase CLI migration workflow — `supabase migration new` + `supabase db push` |
| FOUND-03 | RLS policies on every table using `auth.uid()` | Supabase RLS official pattern with `(select auth.uid())` performance wrapping |
| FOUND-04 | Supabase Auth — email/password provider | Standard Supabase `signInWithPassword` / `signUp` — no extra config needed |
| FOUND-05 | Supabase Auth — Google OAuth provider | `@react-native-google-signin/google-signin` → `signInWithIdToken({ provider: 'google' })` |
| FOUND-06 | Supabase Auth — Apple Sign-In provider | `expo-apple-authentication` → `signInWithIdToken({ provider: 'apple' })`, iOS only |
| FOUND-07 | Auth session persists across app restarts | `expo-sqlite` localStorage polyfill in supabase client, `AppState` auto-refresh handlers |
| FOUND-08 | `lib/theme.ts` with colors, typography, spacing (4px grid), shadows | Documented pattern — pure TypeScript const object, no library needed |
| FOUND-09 | `VCard` — surface container with elevation variants | Custom Reanimated-style View wrapper — no external dependency |
| FOUND-10 | `VButton` — primary/secondary/ghost/destructive variants | Custom TouchableOpacity/Pressable — Reanimated 3 press scale animation |
| FOUND-11 | `VBadge` — colored label with category variants | Static styled View+Text |
| FOUND-12 | `VInput` — label, error state, icon slot | Controlled TextInput with animated label pattern |
| FOUND-13 | `VProgressBar` — animated horizontal progress with Reanimated 3 | `useSharedValue` + `useAnimatedStyle` width interpolation |
| FOUND-14 | `VProgressRing` — animated circular progress with Reanimated 3 | SVG `Circle` stroke-dashoffset + `useAnimatedProps` |
| FOUND-15 | `VMetricCard` — carbon number with JetBrains Mono | Custom component with `fontFamily: 'JetBrainsMono'` in StyleSheet |
| FOUND-16 | `VChip` — selectable filter/tag chip | Pressable with selected state toggle |
| FOUND-17 | `VBottomSheet` — Reanimated 3 gesture-driven | `useSharedValue` + `Gesture.Pan()` + `GestureHandlerRootView` — no `@gorhom/bottom-sheet` |
| FOUND-18 | `VEmptyState` — illustration + CTA | Static SVG + View layout |
| FOUND-19 | `VSkeleton` — Reanimated 3 shimmer | `withRepeat(withTiming(...))` translateX shimmer on LinearGradient |
| FOUND-20 | TypeScript interfaces in `types/` for all domain models | Pure TypeScript — no runtime cost |
| FOUND-21 | Bottom tab navigator with Home, Log, Insights, Profile tabs | Expo Router `(tabs)/_layout.tsx` with `<Tabs>` component |
| FOUND-22 | `emission_factors` seeded with DEFRA 2025 GHG factors | `supabase/seed.sql` INSERT statements from GOV.UK 2025 XLSX |
</phase_requirements>

---

## Summary

Phase 1 establishes the complete technical foundation for Veridian. The stack is well-supported and all five plan areas have clear, documented implementation paths. The primary technical risks are (1) Google Sign-In on iOS requires the native `@react-native-google-signin` library compiled via EAS Build — it will NOT work in Expo Go, (2) Reanimated 3.x is the correct version for Expo SDK 52 (not v4, which requires React Native 0.81+), and (3) the custom `VBottomSheet` without `@gorhom/bottom-sheet` is doable but requires careful gesture conflict resolution.

The Supabase client initialization changed in late 2024: the current recommended approach uses `expo-sqlite`'s localStorage polyfill rather than `@react-native-async-storage/async-storage` for session storage. Older tutorials showing `storage: AsyncStorage` are valid but the localStorage approach is now the official Expo+Supabase quickstart pattern.

RLS performance is a first-class concern: wrapping `auth.uid()` in `(select auth.uid())` is mandatory for all policies — benchmarks show 95% query speedup. Every user-data table needs a `user_id` index as well.

**Primary recommendation:** Scaffold with `npx create-expo-app@latest --template default@sdk-52` (or use default which gives SDK 54 in mid-2026), configure TypeScript strict in `tsconfig.json` extending `expo/tsconfig.base`, install Reanimated 3.x (`react-native-reanimated@~3.16.7`), and use the Supabase CLI migration workflow (`supabase migration new` → `supabase db push`) from day one.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | SDK 52+ (use 54 for latest stable) | React Native framework | Official Expo SDK with managed workflow |
| expo-router | v4 (ships with SDK 52/53/54) | File-based navigation | Built on React Navigation; typed routes; deep link support |
| @supabase/supabase-js | v2.x | Backend client (auth + database + realtime) | Official Supabase client |
| react-native-reanimated | ~3.16.7 (SDK 52 / RN 0.77) | All animations | Required by project rules; UI-thread worklets |
| react-native-gesture-handler | ^2.x | Gesture input (pan, tap) | Required by Reanimated gesture-driven components |
| @tanstack/react-query | v5.x | Server state / cache | Project-mandated; best-in-class for async data |
| zustand | v5.x | Client state (auth session, UI state) | Project-mandated; minimal boilerplate |
| react-native-svg | 15.x | SVG rendering (progress ring, icons) | Required for `VProgressRing` and DEFRA chart data |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-sqlite | SDK-matched | localStorage polyfill for Supabase session | Required for session persistence (replaces AsyncStorage approach) |
| react-native-url-polyfill | ^2.x | URL global polyfill for Supabase | Required — Supabase JS uses URL internally |
| @react-native-google-signin/google-signin | ^13.x | Native Google Sign-In | Only works in EAS Build (not Expo Go) |
| expo-apple-authentication | SDK-matched | Native Apple Sign-In | iOS only; requires EAS Build or native project |
| expo-font | SDK-matched | Load JetBrains Mono + Inter fonts | Required for custom typography in theme |
| expo-splash-screen | SDK-matched | Keep splash visible during auth loading | Required for async auth state initialization |
| expo-linking | SDK-matched | Deep link config for Expo Router | Required dependency of expo-router |
| expo-constants | SDK-matched | App config access | Required dependency of expo-router |
| expo-status-bar | SDK-matched | Status bar theming | Required dependency of expo-router |
| react-native-safe-area-context | ^4.x | Safe area insets | Required dependency of expo-router |
| react-native-screens | ^3.x | Native screen optimization | Required dependency of expo-router |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-sqlite localStorage | @react-native-async-storage/async-storage | AsyncStorage works but is the older pattern; localStorage polyfill is the current Supabase+Expo quickstart |
| Reanimated 3.x | Reanimated 4.x | v4 requires New Architecture (RN 0.81+); SDK 52 uses RN 0.77, so v3 is correct here |
| @react-native-google-signin | expo-auth-session OAuth web flow | Web flow works in Expo Go but is less native; `signInWithIdToken` native path is better UX |

### Installation

```bash
# Core scaffold
npx create-expo-app@latest veridian --template default@sdk-52

# OR if targeting SDK 54 (default in 2026):
npx create-expo-app@latest veridian

# Navigation dependencies (expo-router comes with template; install peer deps)
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar expo-splash-screen

# Supabase
npx expo install @supabase/supabase-js expo-sqlite react-native-url-polyfill

# Animations & gestures
npx expo install react-native-reanimated@~3.16.7 react-native-gesture-handler

# Auth providers
npx expo install expo-apple-authentication
npm install @react-native-google-signin/google-signin

# State
npm install @tanstack/react-query zustand

# Fonts & SVG
npx expo install expo-font react-native-svg

# TypeScript strict (already in tsconfig — verify)
```

---

## Architecture Patterns

### Recommended Project Structure

```
veridian/
├── app/                          # Expo Router pages (file-based routes)
│   ├── _layout.tsx               # Root layout — providers + auth guard
│   ├── (auth)/                   # Unauthenticated group
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Authenticated tab group
│   │   ├── _layout.tsx           # <Tabs> with 4 tabs
│   │   ├── index.tsx             # Home
│   │   ├── log.tsx               # Log
│   │   ├── insights.tsx          # Insights
│   │   └── profile.tsx           # Profile
│   └── +not-found.tsx
├── components/
│   └── ui/                       # All 11 V* components
│       ├── VCard.tsx
│       ├── VButton.tsx
│       ├── VBadge.tsx
│       ├── VInput.tsx
│       ├── VProgressBar.tsx
│       ├── VProgressRing.tsx
│       ├── VMetricCard.tsx
│       ├── VChip.tsx
│       ├── VBottomSheet.tsx
│       ├── VEmptyState.tsx
│       └── VSkeleton.tsx
├── lib/
│   ├── supabase.ts               # Supabase client singleton
│   ├── theme.ts                  # Design tokens
│   └── queryClient.ts            # TanStack QueryClient instance
├── stores/                       # Zustand stores
│   └── authStore.ts
├── types/                        # TypeScript domain interfaces
│   ├── index.ts
│   ├── user.ts
│   ├── emission.ts
│   └── challenge.ts
├── supabase/                     # Supabase project files
│   ├── migrations/               # 13 numbered .sql files
│   ├── seed.sql                  # DEFRA 2025 emission_factors seed
│   └── config.toml
├── assets/
│   └── fonts/                    # JetBrains Mono + Inter font files
├── app.json
├── babel.config.js
├── metro.config.js               # Only needed for advanced path config
└── tsconfig.json
```

### Pattern 1: Expo Router Auth Guard with Stack.Protected

**What:** Root `_layout.tsx` wraps protected and public screens in `Stack.Protected` guards based on session state.

**When to use:** The entry point for all auth-dependent navigation.

```tsx
// app/_layout.tsx
// Source: https://docs.expo.dev/router/advanced/authentication/
import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { SplashScreen } from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null; // Keep splash screen visible

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
```

### Pattern 2: Supabase Client Initialization

**What:** Single singleton client using `expo-sqlite` localStorage polyfill for session persistence.

**When to use:** Created once in `lib/supabase.ts`, imported everywhere.

```typescript
// lib/supabase.ts
// Source: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install'; // localStorage polyfill
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,         // expo-sqlite polyfill
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,     // Critical: false for React Native
  },
});
```

**AppState handling** (put in `lib/supabase.ts` or root layout):

```typescript
import { AppState } from 'react-native';

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

### Pattern 3: RLS Policy Template

**What:** Consistent RLS pattern for all 13 user-data tables.

**When to use:** Every migration that creates a user-data table.

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Apply to EVERY table with user data
ALTER TABLE emission_entries ENABLE ROW LEVEL SECURITY;

-- Performance: wrap in (select ...) to cache per statement, not per row
CREATE POLICY "Users can view own entries"
  ON emission_entries FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own entries"
  ON emission_entries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own entries"
  ON emission_entries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own entries"
  ON emission_entries FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Index the user_id column — mandatory for RLS performance
CREATE INDEX emission_entries_user_id_idx ON emission_entries(user_id);
```

For `emission_factors` (public read, no user writes from client):

```sql
ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to emission factors"
  ON emission_factors FOR SELECT
  TO anon, authenticated
  USING (true);
-- No INSERT/UPDATE/DELETE policies — only seeded via migrations
```

### Pattern 4: Reanimated 3 Animated Component (VProgressBar example)

**What:** Standard Reanimated 3 pattern for animated numeric values.

**When to use:** All animated UI components (VProgressBar, VProgressRing, VSkeleton).

```typescript
// components/ui/VProgressBar.tsx
// Source: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  progress: number; // 0–1
  color?: string;
}

export function VProgressBar({ progress, color = '#1B7A4A' }: Props) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}
```

### Pattern 5: VSkeleton Shimmer with withRepeat

**What:** Looping shimmer animation for loading states.

```typescript
// components/ui/VSkeleton.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';

export function VSkeleton({ width, height }: { width: number | string; height: number }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1, // infinite
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: 8, backgroundColor: '#E5E7EB' }, style]}
    />
  );
}
```

### Pattern 6: VBottomSheet (custom, no @gorhom/bottom-sheet)

**What:** Gesture-driven bottom sheet using Reanimated 3 + react-native-gesture-handler.

**When to use:** Any bottom drawer UI (no third-party bottom sheet library allowed).

```typescript
// components/ui/VBottomSheet.tsx
// Source: https://reactiive.io/articles/bottom-sheet-animation
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Dimensions, StyleSheet } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;

export function VBottomSheet({ children }: { children: React.ReactNode }) {
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
    })
    .onEnd(() => {
      // Snap to open or closed
      if (translateY.value > -SCREEN_HEIGHT / 3) {
        translateY.value = withSpring(0, { damping: 50 });
      } else {
        translateY.value = withSpring(MAX_TRANSLATE_Y, { damping: 50 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.sheet, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
```

**Critical:** The app root MUST be wrapped in `<GestureHandlerRootView style={{ flex: 1 }}>` in `app/_layout.tsx`.

### Pattern 7: Google Sign-In (Native, requires EAS Build)

```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  // iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  if (userInfo.data?.idToken) {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: userInfo.data.idToken,
    });
    if (error) throw error;
  }
}
```

### Pattern 8: Apple Sign-In (iOS only)

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/apple-authentication/
import * as AppleAuthentication from 'expo-apple-authentication';

async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (credential.identityToken) {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
  }
}
```

**Note:** Apple Sign-In only returns user email/name on the VERY FIRST sign-in. Store these immediately upon first auth.

### Pattern 9: Bottom Tab Navigator (Expo Router)

```typescript
// app/(tabs)/_layout.tsx
// Source: https://docs.expo.dev/router/advanced/tabs/
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B7A4A',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="log" options={{ title: 'Log' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

### Pattern 10: TypeScript Strict tsconfig

```json
// tsconfig.json
// Source: https://docs.expo.dev/guides/typescript/
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**No metro.config.js changes needed** — Expo CLI automatically resolves `paths` from tsconfig since SDK 50+.

### Anti-Patterns to Avoid

- **`detectSessionInUrl: true` in React Native**: Causes crashes; always set `false` for native apps.
- **`auth.uid()` without `(select ...)`**: Evaluates per-row, catastrophic on large tables. Always use `(select auth.uid())`.
- **RLS without explicit TO role**: Without `TO authenticated`, the anon role still evaluates the policy body, wasting cycles.
- **`@ts-ignore` or `any`**: Project rule violation; fix the type instead.
- **Using `Animated` from `react-native`**: Project forbids RN Animated API; use `react-native-reanimated` exclusively.
- **Wrapping GestureDetector without GestureHandlerRootView at app root**: Gestures silently fail; add GestureHandlerRootView in `_layout.tsx`.
- **Calling Apple Sign-In on Android**: `expo-apple-authentication` is iOS-only; gate behind `Platform.OS === 'ios'`.
- **Hardcoding emission factors**: All calculations must use the `emission_factors` table; never hardcode kg CO₂e values.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session storage | Custom AsyncStorage wrapper | `expo-sqlite` localStorage polyfill (official Supabase pattern) | Handles serialization, token refresh |
| Auth token refresh | Manual JWT decode + timer | `autoRefreshToken: true` in Supabase client | Edge cases: background, app resume |
| File-based routing type safety | Manual route string constants | Expo Router `typedRoutes: true` + `experiments` in app.json | Catches bad hrefs at compile time |
| Deep link handling | Custom Linking listeners | Expo Router built-in | Handles every edge case including cold start |
| Navigation state | Custom route tracking | `useSegments()` / `usePathname()` from expo-router | Typed, no global state needed |
| Bottom sheet accessibility | Manual Modal | Custom VBottomSheet with backdropPress dismiss | @gorhom/bottom-sheet is not banned, but project explicitly requires custom Reanimated implementation |

**Key insight:** The Supabase client handles nearly all auth complexity. Fight the urge to add custom token logic.

---

## Common Pitfalls

### Pitfall 1: Reanimated Version Mismatch

**What goes wrong:** Installing `react-native-reanimated@latest` on Expo SDK 52 installs v4.x, which requires New Architecture (RN 0.81+). SDK 52 uses RN 0.77. Build fails at the native layer.

**Why it happens:** npm resolves `latest` to v4.x, but v4 only supports RN 0.81+. SDK 52 uses RN 0.77.

**How to avoid:** Pin to `react-native-reanimated@~3.16.7` for SDK 52 / RN 0.77. Use `npx expo install` which resolves compatible versions from Expo's package manifest.

**Warning signs:** "Fabric not enabled" error at startup; worklet crashes on iOS simulator.

### Pitfall 2: Google Sign-In Fails in Expo Go

**What goes wrong:** `@react-native-google-signin/google-signin` is a native module that requires a compiled binary. Expo Go does not bundle it. The app throws "GoogleSignIn is null" or similar.

**Why it happens:** Expo Go only includes Expo SDK native modules, not third-party native modules.

**How to avoid:** Test Google Sign-In only via `npx expo run:ios` / `npx expo run:android` (local build) or EAS Build. For Expo Go testing, comment out the Google Sign-In button.

**Warning signs:** `NativeModule is null` runtime error.

### Pitfall 3: Apple Sign-In Email Only Available Once

**What goes wrong:** After the first Apple Sign-In, subsequent sign-ins return `null` for email and full name.

**Why it happens:** Apple's privacy design — user data is sent only on the first auth.

**How to avoid:** In the auth handler, immediately upsert the user's name and email into the `users` table profile before navigating away. On subsequent logins, look up by `user.id`.

**Warning signs:** `null` email in Supabase `auth.users` after first sign-in.

### Pitfall 4: RLS "Blocks Everything" on New Table

**What goes wrong:** Developer enables RLS on a table but forgets to add policies. All queries return empty arrays with no error — silent data starvation.

**Why it happens:** Supabase RLS with no policies = deny all. No error is thrown; queries just return 0 rows.

**How to avoid:** Always add at least one policy in the same migration that enables RLS. Test with `supabase db reset` locally.

**Warning signs:** Supabase Studio shows data in table but app shows empty list.

### Pitfall 5: Session Not Persisting Across App Restarts

**What goes wrong:** User logs in, closes app, reopens — lands on login screen again.

**Why it happens:** Missing `expo-sqlite/localStorage/install` import, or the `localStorage` polyfill isn't set up before `createClient` is called.

**How to avoid:** The `import 'expo-sqlite/localStorage/install'` line must be the FIRST import in `lib/supabase.ts`, before `createClient` is imported or called.

**Warning signs:** Auth works in-session but not after app restart.

### Pitfall 6: Babel Plugin Order for Reanimated

**What goes wrong:** Worklet functions don't run on UI thread; Reanimated throws "Calling the function from the worklet context not possible."

**Why it happens:** `react-native-reanimated/plugin` (or `react-native-worklets/plugin`) must be the LAST plugin in `babel.config.js`.

**How to avoid:** With Expo SDK 52+, `babel-preset-expo` auto-includes the worklets plugin — do NOT manually add it unless troubleshooting. If you do add it manually, ensure it's last.

**Warning signs:** Console warning "seems like you are using a Babel plugin."

### Pitfall 7: `detectSessionInUrl: true` Crashing React Native

**What goes wrong:** App crashes on startup with URL parsing errors.

**Why it happens:** `detectSessionInUrl` uses `window.location` which doesn't exist in React Native.

**How to avoid:** Always set `detectSessionInUrl: false` in Supabase client config for React Native.

### Pitfall 8: path alias `@/*` not resolving in EAS Build

**What goes wrong:** Paths work locally but EAS Build fails with "Cannot resolve module '@/components/ui/VCard'".

**Why it happens:** Known EAS Build issue where tsconfig paths are not picked up in certain configurations.

**How to avoid:** Verify `metro.config.js` uses `withNativeWind` or the default Expo metro config that reads tsconfig. If issues persist, add explicit `resolver.alias` in `metro.config.js`.

---

## Code Examples

### Supabase Migration File Naming Convention

```
supabase/migrations/
├── 20240101000000_create_users.sql
├── 20240101000001_create_emission_factors.sql
├── 20240101000002_create_emission_entries.sql
├── 20240101000003_create_challenges.sql
├── 20240101000004_create_challenge_participants.sql
├── 20240101000005_create_achievements.sql
├── 20240101000006_create_user_achievements.sql
├── 20240101000007_create_user_profiles.sql
├── 20240101000008_create_daily_summaries.sql
├── 20240101000009_create_weekly_summaries.sql
├── 20240101000010_create_ai_insights.sql
├── 20240101000011_create_notification_prefs.sql
├── 20240101000012_create_audit_log.sql
```

Use: `supabase migration new <name>` to generate with correct timestamp prefix.

### emission_factors Table Schema

```sql
-- supabase/migrations/..._create_emission_factors.sql
CREATE TABLE emission_factors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,              -- 'food', 'transport', 'energy'
  subcategory TEXT NOT NULL,              -- 'beef', 'car_petrol', 'electricity_uk'
  item        TEXT NOT NULL,              -- human-readable label
  unit        TEXT NOT NULL,              -- 'kg', 'km', 'kWh', 'litre'
  kg_co2e     NUMERIC(10, 6) NOT NULL,   -- kg CO₂e per unit
  source      TEXT NOT NULL DEFAULT 'DEFRA 2025',
  year        INTEGER NOT NULL DEFAULT 2025,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on emission_factors"
  ON emission_factors FOR SELECT
  TO anon, authenticated
  USING (true);

-- Index for query performance
CREATE INDEX emission_factors_category_idx ON emission_factors(category);
CREATE INDEX emission_factors_subcategory_idx ON emission_factors(subcategory);
```

### TypeScript Domain Interfaces

```typescript
// types/emission.ts
export interface EmissionFactor {
  id: string;
  category: 'food' | 'transport' | 'energy';
  subcategory: string;
  item: string;
  unit: string;
  kg_co2e: number;
  source: string;
  year: number;
  created_at: string;
}

export interface EmissionEntry {
  id: string;
  user_id: string;
  factor_id: string;
  quantity: number;
  kg_co2e_total: number;
  logged_at: string;
  created_at: string;
}

// types/user.ts
export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}
```

### Theme Tokens Pattern

```typescript
// lib/theme.ts
export const colors = {
  primary: '#1B7A4A',
  primaryLight: '#2DA661',
  primaryDark: '#145C38',
  surface: '#FFFFFF',
  background: '#F5F7F5',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  error: '#DC2626',
  warning: '#F59E0B',
  success: '#10B981',
  border: '#E5E7EB',
} as const;

export const spacing = {
  xs: 4,    // 1 grid unit
  sm: 8,    // 2 grid units
  md: 16,   // 4 grid units
  lg: 24,   // 6 grid units
  xl: 32,   // 8 grid units
  xxl: 48,  // 12 grid units
} as const;

export const typography = {
  fontFamilyDefault: 'Inter',
  fontFamilyMono: 'JetBrainsMono',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 28,
    display: 40,
  },
} as const;

export const shadows = {
  sm: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  md: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  lg: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
} as const;
```

### Supabase Migration Workflow Commands

```bash
# Initialize Supabase in project root (once)
npx supabase init

# Start local Supabase stack
npx supabase start

# Create a new migration
npx supabase migration new create_users

# Apply all migrations locally (+ runs seed.sql)
npx supabase db reset

# Diff local DB vs code (for dashboard-driven changes)
npx supabase db diff --schema public

# Link to remote project
npx supabase link --project-ref <project-ref>

# Push migrations to production
npx supabase db push

# Push seed data to production (manual)
psql $DATABASE_URL < supabase/seed.sql
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `storage: AsyncStorage` in Supabase client | `expo-sqlite/localStorage/install` polyfill | Late 2024 | Simpler setup; no explicit import of AsyncStorage package |
| `useSegments` + `useEffect` redirect for auth | `Stack.Protected` guard prop | Expo Router v4 (SDK 54+) | Declarative; no race conditions from useEffect redirect |
| Manual Reanimated babel plugin in babel.config.js | Auto-included by `babel-preset-expo` | SDK 50+ | No manual config needed for basic usage |
| `@gorhom/bottom-sheet` | Custom Reanimated 3 implementation | Ongoing (project choice) | Full control; no external dep; requires more code |
| Reanimated 4 for all new projects | Reanimated 3.x for SDK 52; Reanimated 4 from SDK 55+ | Early 2026 | v4 needs New Architecture; v3 is correct for SDK 52 |

**Deprecated/outdated:**
- `expo-auth-session` for Google OAuth: Still works but provides web-redirect UX. `@react-native-google-signin` provides native bottom sheet UX which is the current recommendation.
- `@react-native-async-storage/async-storage` as Supabase storage: Still works; `expo-sqlite` localStorage polyfill is the current official quickstart pattern.

---

## Open Questions

1. **Which Expo SDK to target: 52, 53, or 54?**
   - What we know: Project spec says "SDK 52+". As of March 2026, SDK 54 is the latest stable (SDK 55 is in beta/transition). `create-expo-app@latest` without a flag creates SDK 54.
   - What's unclear: Whether the project has existing native code or will use managed workflow exclusively.
   - Recommendation: Use SDK 54 (default for `create-expo-app@latest` in 2026) unless there's a specific reason to pin to 52. Reanimated version would shift to `~3.16.x` for SDK 54 (RN 0.81).

2. **EAS Build required for Google Sign-In?**
   - What we know: `@react-native-google-signin` is a native module; does NOT work in Expo Go.
   - What's unclear: Whether the project plans to use EAS Build from day 1 or start with Expo Go.
   - Recommendation: The auth plan should include a note that the Google Sign-In button should be conditionally shown/tested only in dev builds. For the Foundation phase, a dev build via `npx expo run:ios` is sufficient.

3. **13 Supabase tables — exact schema?**
   - What we know: Requirements reference 13 tables. Identifiable tables: `users/profiles`, `emission_factors`, `emission_entries`, `challenges`, `challenge_participants`, `achievements`, `user_achievements`. That's 7.
   - What's unclear: The remaining 6 table names and schemas.
   - Recommendation: Planner should enumerate all 13 tables explicitly in Plan 2 before writing migration files. Likely candidates: `daily_summaries`, `weekly_summaries`, `ai_insights`, `notification_preferences`, `friendships`, `push_tokens`.

4. **DEFRA 2025 seed data volume**
   - What we know: DEFRA 2025 factors cover energy, transport, water, waste. Full dataset is an XLSX file from gov.uk.
   - What's unclear: How many rows are relevant for the food/transport/energy scope of Phase 1–2.
   - Recommendation: Seed only the categories used in Phase 2 (food, transport, energy). A curated subset of ~150–300 rows is practical. The full DEFRA dataset has thousands of rows.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 must install |
| Config file | `jest.config.js` — Wave 0 |
| Quick run command | `npx jest --testPathPattern=__tests__/unit --passWithNoTests` |
| Full suite command | `npx jest --passWithNoTests` |

**Note:** React Native / Expo testing typically uses Jest with `@testing-library/react-native`. Most Phase 1 validation is visual/functional (component render, auth flow, Supabase connection). The primary test type for this phase is **smoke tests** and **TypeScript compilation checks** rather than unit tests of business logic (which is minimal in Phase 1).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | TypeScript strict compiles with zero errors | type-check | `npx tsc --noEmit` | Wave 0 |
| FOUND-02 | All 13 migration files apply without error | smoke (CLI) | `npx supabase db reset` | Wave 0 |
| FOUND-03 | RLS blocks unauthenticated access | manual / SQL | `supabase db test` (Wave 0) | Wave 0 |
| FOUND-04 | Email/password auth signs in + returns session | integration | `npx jest __tests__/auth/email.test.ts` | Wave 0 |
| FOUND-05 | Google Sign-In completes (device only) | manual | N/A — native module | Manual |
| FOUND-06 | Apple Sign-In completes (iOS device only) | manual | N/A — native module | Manual |
| FOUND-07 | Session persists after simulated restart | smoke | `npx jest __tests__/auth/session.test.ts` | Wave 0 |
| FOUND-08 | Theme exports colors, spacing, typography | unit | `npx jest __tests__/lib/theme.test.ts` | Wave 0 |
| FOUND-09–19 | All 11 components render without error | snapshot | `npx jest __tests__/components/` | Wave 0 |
| FOUND-20 | TypeScript interfaces compile correctly | type-check | `npx tsc --noEmit` | Wave 0 (same) |
| FOUND-21 | Tab navigator renders 4 tabs | snapshot | `npx jest __tests__/navigation/tabs.test.ts` | Wave 0 |
| FOUND-22 | `emission_factors` table has seeded rows | smoke (SQL) | `supabase db reset` + count check | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit` (catches type regressions instantly)
- **Per wave merge:** `npx jest --passWithNoTests && npx tsc --noEmit`
- **Phase gate:** Full suite green + `npx expo export --platform all` (no bundle errors) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `jest.config.js` — jest with `@testing-library/react-native` preset; install: `npm install --save-dev jest @testing-library/react-native @types/jest`
- [ ] `__tests__/lib/theme.test.ts` — covers FOUND-08: validates color/spacing/typography exports
- [ ] `__tests__/components/VButton.test.tsx` — covers FOUND-10: renders without crash
- [ ] `__tests__/components/VCard.test.tsx` — covers FOUND-09
- [ ] `__tests__/components/VProgressBar.test.tsx` — covers FOUND-13
- [ ] `__tests__/components/VProgressRing.test.tsx` — covers FOUND-14
- [ ] `__tests__/components/VBottomSheet.test.tsx` — covers FOUND-17 (mock gesture handler)
- [ ] `__tests__/components/VSkeleton.test.tsx` — covers FOUND-19
- [ ] `__tests__/auth/session.test.ts` — covers FOUND-07 (mock supabase client)
- [ ] `jest.setup.js` — mock `react-native-reanimated`, `react-native-gesture-handler`

---

## Sources

### Primary (HIGH confidence)

- [Expo Router Installation Docs](https://docs.expo.dev/router/installation/) — setup, tsconfig, directory structure
- [Expo Router Authentication Docs](https://docs.expo.dev/router/advanced/authentication/) — Stack.Protected pattern
- [Expo Router Tabs Docs](https://docs.expo.dev/router/advanced/tabs/) — tab navigator structure
- [Supabase Expo React Native Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — client init, localStorage polyfill
- [Supabase RLS Official Guide](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy patterns, performance
- [Supabase Local Development](https://supabase.com/docs/guides/local-development/overview) — migration workflow
- [React Native Reanimated Getting Started](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) — APIs, setup
- [expo-apple-authentication Docs](https://docs.expo.dev/versions/latest/sdk/apple-authentication/) — setup, configuration
- [Expo TypeScript Guide](https://docs.expo.dev/guides/typescript/) — strict mode, path aliases
- [Expo SDK 52 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52) — RN 0.77, New Architecture opt-in
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) — RN 0.81, final Legacy Architecture support
- [DEFRA 2025 GHG Conversion Factors](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025) — emission factor source data

### Secondary (MEDIUM confidence)

- [Supabase Google Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google) — `signInWithIdToken` Google flow
- [React Native Reanimated Compatibility Table](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) — version/RN compatibility
- [Bottom Sheet from Scratch Tutorial](https://reactiive.io/articles/bottom-sheet-animation) — custom bottom sheet pattern with Reanimated 3
- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — `(select auth.uid())` caching

### Tertiary (LOW confidence — flag for validation)

- WebSearch results on Reanimated 3 vs 4 version specifics for SDK 52: cross-checked with changelog but exact `~3.16.7` version for RN 0.77 is from SDK 52 changelog commentary, not from a single authoritative pinned source
- DEFRA 2025 seed row count estimate (150–300 rows for food/transport/energy): estimated from category knowledge, not from parsing the actual XLSX

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via official Expo/Supabase/Reanimated docs
- Architecture patterns: HIGH — verified against official docs with working code examples
- Auth patterns: MEDIUM-HIGH — Google Sign-In on iOS note verified via multiple sources; Apple idToken fix for OIDC issuer mismatch is from July 2025 Supabase Auth v2.177.0 release
- Pitfalls: HIGH — each backed by official documentation or known issue tracking
- DEFRA seed data: MEDIUM — official source confirmed; row count estimate is LOW

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable stack; Supabase client init pattern could change with major releases)
