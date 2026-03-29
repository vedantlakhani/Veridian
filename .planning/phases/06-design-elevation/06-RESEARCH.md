# Phase 6: Design Elevation & Carbon Calculator — Research

**Researched:** 2026-03-28
**Domain:** React Native dark UI theming, Reanimated 4 animations, ImageBackground hero layouts, carbon footprint calculation
**Confidence:** HIGH (core patterns verified against live codebase + official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dark mode approach:** Hardcoded always-dark. No `useColorScheme` conditional logic. No second token set.

**Token structure:** Replace existing token values in `lib/theme.ts` in-place with dark values:
- `background: '#191C1C'`
- `surface: '#1E2120'`
- `primary: '#006036'`
- `primaryContainer: '#1B7A4A'`
- `secondary: '#006492'`
- `textPrimary: '#FFFFFF'`
- `textSecondary: '#B0B8B4'`
- `border: 'transparent'`

**Hardcoded hex migration:** 06-01 sweeps ALL hardcoded hex before visual redesign begins.

**Carbon calculator placement:** Comes AFTER the Phase 5 carousel. "Get Started" on slide 3 navigates to calculator, not directly to auth.

**Question format:** 8–10 visual tap cards (no text fields). 4 categories: Transport, Food, Home, Shopping.

**Live CO₂ counter:** Persistent footer on every question screen. JetBrains Mono Bold. `withTiming`/`withSpring` from Reanimated 3/4.

**Results before signup:** Calculator → Results screen → Signup prompt.

**Post-signup:** Calculated footprint saved as `baseline_kg` to `profiles` table.

**Home hero:** Full-bleed nature photography via `require()`. 5–8 locally bundled photos. Semi-transparent dark gradient overlay. 72–96sp JetBrains Mono Bold metric.

**All other backgrounds:** Pure `#191C1C`. No texture, gradient, or grain.

**Depth without borders:** Surface `#1E2120` on background `#191C1C`. Elevated modals `#252B29`.

**Execution order:** Base dark pass ALL screens (06-01) → Hero polish (06-03, 06-04, 06-05).

**Hero screens (full redesign):** Home dashboard, Carbon calculator, Log entry, Insights.

**Base dark skin only (token swap):** Auth screens, Phase 5 carousel, Profile, Challenges, Achievements.

### Claude's Discretion

Phase 6 has no areas designated as Claude's discretion — all key decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- System-aware light/dark toggle (Settings preference switch)
- Animated gradient mesh as alternative to photography on lower-end devices
- Full hero redesign for Challenges/Profile (Phase 7)
- Challenges ChallengeCard with nature imagery
- Photography rotation / seasonal photo sets
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DSGN-01 | Full dark mode applied consistently across all 20+ screens | Token replacement strategy, hex sweep inventory |
| DSGN-02 | No flash of light theme on cold start | `userInterfaceStyle: "dark"` + `expo-system-ui` + splash backgroundColor |
| DSGN-03 | Carbon calculator: 4 categories, 8–10 tap-card questions, live annual CO₂ counter | Calculation formulas, Reanimated 4 counter pattern |
| DSGN-04 | Results screen with full breakdown by category, annual tCO₂e, comparison to global average | Carbon reference data, DB schema gap (baseline_kg) |
| DSGN-05 | Post-signup: `baseline_kg` saved to `profiles` table | DB migration needed (column does not exist) |
| DSGN-06 | Home dashboard hero: full-bleed photo, 72–96sp JetBrains Mono metric | `expo-image` ImageBackground, LinearGradient overlay |
| DSGN-07 | Reanimated 4 animated footer counter on calculator screens | `useSharedValue`, `useDerivedValue`, `ReText` pattern |
| DSGN-08 | StatusBar `style="light"` globally for dark mode | Single `<StatusBar style="light" />` in root layout |
| DSGN-09 | TypeScript compiles zero errors, all existing tests pass after token swap | theme.test.ts must be updated to assert new dark values |
| DSGN-10 | Klima-comparable visual quality: bold hero numbers, minimal chrome | Design pattern research |
| DSGN-11 | Shopping category CO₂ estimation formulas (not in DEFRA seed) | Simplified spend-based estimates with hardcoded multipliers |
| DSGN-12 | Breathe Effect transitions on Log entry screen form reveal | Reanimated 4 withSpring / withTiming on opacity + scale |
</phase_requirements>

---

## Summary

Phase 6 is a pure UI/UX phase — no new Supabase tables except one column (`baseline_kg` on `profiles`) and no new Edge Functions. The dominant technical work is: (1) a single token-value replacement that automatically re-skins all 20+ screens because the entire codebase already uses `colors.*` tokens, (2) building the new `app/onboarding/calculator.tsx` multi-step flow with an animated footer counter, and (3) elevating four hero screens to Klima-quality with full-bleed photography and large JetBrains Mono metrics.

The installed library versions are confirmed: Reanimated 4.1.7 (not 3.x — the feedback memory uses "Reanimated 3" as a product name but the actual package is 4.1.7), `expo-image ~3.0.11` (already installed), `react-native-safe-area-context ~5.6.0` (already installed), `expo-status-bar ~3.0.9` (already installed). No new dependencies are required except optionally `expo-linear-gradient` for the photo overlay gradient.

The main surprise in the codebase audit: `profiles` table does NOT yet have a `baseline_kg` column (only `challenge_participants` has it). A new Supabase migration is required in 06-02. Additionally, the DEFRA seed does NOT include a "shopping" category — the calculator's shopping questions must use hardcoded estimated multipliers rather than the `emission_factors` table.

**Primary recommendation:** Replace `lib/theme.ts` token values first (06-01), update `theme.test.ts` assertions, then all 20+ screens go dark automatically. Build the calculator as a single-file multi-step flow using a local `step` state and Reanimated 4 `withTiming` slide transitions between questions.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-reanimated` | 4.1.7 | All animations — counter, slide transitions, Breathe Effect | Already in use project-wide; Reanimated 4 on New Architecture |
| `expo-image` | ~3.0.11 | Full-bleed hero background with `contentFit="cover"` | Already installed; better perf than `ImageBackground` (uses SDWebImage/Glide) |
| `react-native-safe-area-context` | ~5.6.0 | Notch/safe area insets on hero screens | Already in use |
| `expo-status-bar` | ~3.0.9 | Global `style="light"` for white icons on dark backgrounds | Already in use in root layout |
| `expo-system-ui` | ~6.0.9 | Required for `userInterfaceStyle: "dark"` to take effect on Android | Already installed |
| `lib/theme.ts` | local | Single source of truth — token replacement drives full dark re-skin | Entire codebase already imports from here |

### Supporting (may need to add)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-linear-gradient` | latest compatible | Dark gradient overlay on hero photography | Only for Home hero photo overlay |

**Check if already installed:**
```bash
cat package.json | grep linear-gradient
```

If not present:
```bash
npx expo install expo-linear-gradient
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-image` ImageBackground | RN core `ImageBackground` | `expo-image` has better caching and native decoder; `ImageBackground` is simpler but slower |
| `expo-linear-gradient` overlay | SVG gradient via `react-native-svg` | `expo-linear-gradient` is purpose-built for this; SVG is overkill |
| Hardcoded shopping multipliers | New `emission_factors` rows | New rows require a migration + seed update; hardcoded is simpler for 8–10 fixed options |

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
app/
└── onboarding/
    └── calculator.tsx        # NEW — multi-step calculator flow (06-02)
assets/
└── images/
    ├── hero-forest.jpg       # NEW — nature photography (06-03)
    ├── hero-ocean.jpg
    ├── hero-mountain.jpg
    └── ...                   # 5–8 total
supabase/
└── migrations/
    └── 20260328000015_add_baseline_kg_to_profiles.sql  # NEW (06-02)
```

### Pattern 1: In-Place Token Replacement (06-01)

**What:** Overwrite `lib/theme.ts` color values without changing the export shape. All screens pick up the new values at next build/reload with zero code changes elsewhere.

**When to use:** Always-dark strategy — no conditional logic needed anywhere.

**Current shape to preserve:**
```typescript
// lib/theme.ts — EXISTING EXPORT SHAPE (do not rename keys)
export const colors = {
  primary: string,        // '#1B7A4A' → '#006036'
  primaryLight: string,   // keep or map to primaryContainer
  primaryDark: string,    // keep a dark variant
  surface: string,        // '#FFFFFF' → '#1E2120'
  background: string,     // '#F8FAF9' → '#191C1C'
  mist: string,           // '#F8FAF9' → '#191C1C' (alias)
  textPrimary: string,    // '#111827' → '#FFFFFF'
  textSecondary: string,  // '#6B7280' → '#B0B8B4'
  textTertiary: string,   // '#9CA3AF' → keep readable on dark
  error: string,          // keep red — readable on dark
  errorLight: string,     // adjust for dark bg
  errorBorder: string,    // adjust for dark bg
  warning: string,        // keep amber
  success: string,        // keep green
  border: string,         // '#E5E7EB' → 'transparent'
  divider: string,        // '#F3F4F6' → subtle dark divider e.g. '#2A302E'
  food: string,           // category colors — keep vibrant
  transport: string,
  energy: string,
} as const;
```

**CRITICAL:** `theme.test.ts` has hardcoded assertions for old light values (e.g. `expect(colors.primary).toBe('#1B7A4A')`). These MUST be updated in 06-01 or tests will fail.

```typescript
// Source: __tests__/lib/theme.test.ts — UPDATE these assertions
expect(colors.primary).toBe('#006036');       // was '#1B7A4A'
expect(colors.background).toBe('#191C1C');    // was '#F8FAF9'
```

### Pattern 2: Hardcoded Hex Sweep (06-01)

**What:** Replace all inline hex strings in screen files with `colors.*` token references.

**Files confirmed to contain hardcoded hex (from audit):**
- `app/(auth)/login.tsx` — 59 hardcoded hex occurrences
- `app/(auth)/signup.tsx` — hardcoded hex
- `app/(auth)/forgot-password.tsx` — hardcoded hex
- `app/(tabs)/insights.tsx` — hardcoded hex
- `app/(tabs)/_layout.tsx` — hardcoded hex
- `app/+not-found.tsx` — hardcoded hex
- `components/ui/VButton.tsx` — `'#FFFFFF'` in style maps
- `components/ui/VBadge.tsx` — light bg hex for category chips (e.g. `'#FFF7ED'`)
- `components/ui/VInput.tsx` — `color: '#374151'`
- `components/ui/VOfflineBanner.tsx` — hardcoded hex
- `components/themed-text.tsx` — hardcoded hex
- `components/social/AchievementBadge.tsx` — hardcoded hex

**Token mapping for VBadge category chips on dark backgrounds:**
- `food` chip: bg `'#2D1A08'` (dark warm), text `colors.food` (orange — stays vibrant)
- `transport` chip: bg `'#0A1E2E'` (dark blue), text `colors.transport`
- `energy` chip: bg `'#1F1A00'` (dark amber), text `colors.energy`
- `success` chip: bg `'#0A1F12'` (dark green), text `colors.success`

Add these as new token aliases in `colors`:
```typescript
foodBg: '#2D1A08',
transportBg: '#0A1E2E',
energyBg: '#1F1A00',
successBg: '#0A1F12',
errorLightDark: '#2D0A0A',   // replaces errorLight on dark
```

### Pattern 3: Multi-Step Calculator with Local State (06-02)

**What:** Single file `app/onboarding/calculator.tsx` using a `step` index + `answers` record. No Expo Router navigation per step — slide transitions are internal.

**Why local state over router navigation:** Router navigation creates back-stack entries for each question (user can go back to carousel). Local state keeps the entire calculator in one route — cleaner back navigation.

```typescript
// app/onboarding/calculator.tsx — skeleton pattern
type AnswerKey = 'transport' | 'transport_km' | 'diet' | 'meat_freq' |
                 'home_energy' | 'home_size' | 'shopping_freq' | 'shopping_spend';

interface CalculatorState {
  step: number;           // 0 to QUESTIONS.length - 1
  answers: Partial<Record<AnswerKey, string>>;
  totalKgCo2e: number;    // live running total
  phase: 'questions' | 'results' | 'signup';
}
```

**Slide transition between questions:**
```typescript
// Source: react-native-reanimated installed at 4.1.7
import { useSharedValue, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';

const slideX = useSharedValue(0);

const animatedCardStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: slideX.value }],
  opacity: interpolate(Math.abs(slideX.value), [0, SCREEN_WIDTH * 0.5], [1, 0], Extrapolation.CLAMP),
}));

const goToNextStep = (answer: string) => {
  // 1. Slide out left
  slideX.value = withTiming(-SCREEN_WIDTH, { duration: 200, easing: Easing.in(Easing.ease) }, () => {
    // 2. Update step + reset position (on UI thread)
    runOnJS(advanceStep)(answer);
  });
};

const advanceStep = (answer: string) => {
  // update answers, compute new total, increment step
  slideX.value = SCREEN_WIDTH;  // reset to right
  slideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
};
```

### Pattern 4: Animated CO₂ Counter Footer (06-02)

**What:** Persistent footer on every calculator question screen. Shared value animates from current total to new total on each answer tap.

**Reanimated 4 animated Text — the correct pattern:**

Reanimated 4 (like 3) does NOT allow `useAnimatedProps` directly on RN `Text` children (they are not native nodes). The correct approach is one of two options:

**Option A — `useDerivedValue` + formatted string + `Animated.Text` via `createAnimatedComponent`:**
Known issue: `Animated.createAnimatedComponent(Text)` with a `text` prop does not reliably update on all platforms (GitHub issue #6173).

**Option B — `useDerivedValue` + interpolated display via `useAnimatedStyle` on a containing View + plain Text re-render:** Works correctly but re-renders on every frame.

**Option C — `useDerivedValue` with `useAnimatedProps` on `TextInput` (read-only, no cursor):** This is the battle-tested pattern used by `react-native-redash`'s `ReText` component.

```typescript
// Recommended: ReText-style pattern — NO external library needed
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// In component:
const co2Value = useSharedValue(0);  // in kg

const animatedProps = useAnimatedProps(() => ({
  value: `${co2Value.value.toFixed(0)} kg CO₂e / year`,
}));

// Animate on new answer:
co2Value.value = withTiming(newTotal, {
  duration: 600,
  easing: Easing.out(Easing.cubic),
});

// Render:
<AnimatedTextInput
  animatedProps={animatedProps}
  editable={false}        // prevents focus / keyboard
  style={counterStyle}    // JetBrains Mono, white text
/>
```

**Known issue with `ReText` on iOS (#6752):** Numeric text in fitting containers can end with ellipsis. Fix: set `minWidth` explicitly on the TextInput container so it never clips.

### Pattern 5: Full-Bleed Hero Image (06-03)

**What:** `expo-image`'s `ImageBackground` component fills the entire screen including behind the notch. An absolutely-positioned gradient overlay ensures text readability.

```typescript
// Source: expo-image documentation (expo-image ~3.0.11 already installed)
import { ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const HERO_IMAGES = [
  require('@/assets/images/hero-forest.jpg'),
  require('@/assets/images/hero-ocean.jpg'),
  // ...
];

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={HERO_IMAGES[currentPhotoIndex]}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      {/* Bottom-to-top gradient so metric text is readable over any photo */}
      <LinearGradient
        colors={['transparent', 'rgba(25,28,28,0.7)', '#191C1C']}
        locations={[0, 0.45, 0.85]}
        style={[StyleSheet.absoluteFillObject, { top: '35%' }]}
      />
      {/* Safe area content sits ON TOP */}
      <SafeAreaView style={{ flex: 1 }}>
        {/* Hero metric — 72–96sp JetBrains Mono Bold */}
        <Text style={heroMetricStyle}>{todayTotal.toFixed(1)}</Text>
      </SafeAreaView>
    </View>
  );
}
```

**Safe area:** Do NOT use `backgroundColor` on `SafeAreaView` — it will block the photo. Render `SafeAreaView` transparently over the `ImageBackground` stack.

**Image sizing:** Bundle locally with `require()` — Expo Metro bundler resolves static `require()` at build time. PNG or JPEG under 500KB each. The `expo-image` component will decode and cache them on first render.

### Pattern 6: Always-Dark StatusBar + No Light Flash on Cold Start

**Three required changes (all in existing files):**

1. **`app.json` — force dark UI globally:**
```json
{
  "expo": {
    "userInterfaceStyle": "dark",
    "plugins": [
      ["expo-splash-screen", {
        "backgroundColor": "#191C1C",
        "image": "./assets/images/splash-icon.png",
        "imageWidth": 200,
        "resizeMode": "contain"
      }]
    ]
  }
}
```
`userInterfaceStyle: "dark"` requires `expo-system-ui` on Android (already installed at `~6.0.9`).

2. **`app/_layout.tsx` — change `style="dark"` to `style="light"`:**
```typescript
// Currently: <StatusBar style="dark" />
// Change to:
<StatusBar style="light" />
```
`style="light"` = white status bar icons (correct for dark backgrounds).
`style="dark"` = black icons (current setting — WRONG for dark backgrounds).

3. **Splash screen background** must match `#191C1C` (already covered in app.json change above). This eliminates the white → dark flash during cold start.

**Why the current setting is wrong:** `app._layout.tsx` currently has `<StatusBar style="dark" />` which renders BLACK icons. On a dark background that will look wrong. Changing to `style="light"` renders WHITE icons.

### Pattern 7: Breathe Effect Transition (06-04)

**What:** On the Log entry screen, when the category is selected and the sub-form is revealed, the form "breathes in" — scales from 0.95 → 1.0 and fades from 0 → 1.

```typescript
// Source: Reanimated 4.1.7 withSpring + withTiming
import { useSharedValue, withSpring, withTiming, useAnimatedStyle } from 'react-native-reanimated';

const breatheScale = useSharedValue(0.95);
const breatheOpacity = useSharedValue(0);

const breatheStyle = useAnimatedStyle(() => ({
  transform: [{ scale: breatheScale.value }],
  opacity: breatheOpacity.value,
}));

// On category select:
breatheScale.value = withSpring(1, { damping: 18, stiffness: 180 });
breatheOpacity.value = withTiming(1, { duration: 250 });

// Render:
<Animated.View style={[formContainer, breatheStyle]}>
  {/* CategoryForm */}
</Animated.View>
```

### Anti-Patterns to Avoid

- **`useColorScheme` in any component:** The app is hardcoded dark. No conditional `isDark ? darkColor : lightColor` anywhere.
- **`Animated` from `react-native`:** All animations use `react-native-reanimated`. The project memory rule is firm.
- **Third-party UI component libraries:** NativeBase, React Native Paper etc are banned. Build new `QuestionCard` as a V-prefixed component.
- **`createAnimatedComponent(Text)` with animated children:** Use `createAnimatedComponent(TextInput)` with `value` prop instead.
- **`SafeAreaView` with `backgroundColor` on hero screens:** Blocks the full-bleed photo. Keep `SafeAreaView` transparent.
- **Network-fetched hero photos:** All 5–8 photos must be `require()` — no runtime fetches, no performance dependency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animated number counter | Custom digit-slot animation | `AnimatedTextInput` with `useAnimatedProps` | Battle-tested; avoids layout jank from digit swap |
| Full-bleed image | CSS-style absolute positioning manually | `expo-image` `ImageBackground` with `StyleSheet.absoluteFillObject` | Handles platform-specific scale/crop correctly |
| Gradient overlay | Custom SVG fade | `expo-linear-gradient` | Purpose-built; hardware accelerated |
| Slide transitions | Manual `Animated.Value` + `setNativeProps` | Reanimated 4 `withTiming` + `useAnimatedStyle` | Runs on UI thread, no JS jank |
| Shopping emission factors | New DB rows | Hardcoded multipliers in `calculator.tsx` | DEFRA has spend-based factors but they require the full spreadsheet import; simpler to hardcode for 8–10 tap options |

**Key insight:** The counter animation is the subtlest trap — `createAnimatedComponent(Text)` sounds logical but has documented cross-platform rendering bugs in Reanimated. The `TextInput` route is the only reliably correct path.

---

## Carbon Calculator: Formulas and Reference Data

### Shopping Category — Hardcoded Estimates (not in DEFRA seed)

The `emission_factors` table has no shopping rows. The calculator's shopping questions use hardcoded kg CO₂e estimates per tap-card option. These are derived from DEFRA spend-based factors (kg CO₂e per £ of category spend):

| Option | Annual kg CO₂e | Reference |
|--------|---------------|-----------|
| "I buy very little — mostly second-hand" | 100 | ~£200 spend × 0.5 kg/£ |
| "A few items per season" | 300 | ~£600 × 0.5 kg/£ |
| "Regular shopping trips" | 600 | ~£1,200 × 0.5 kg/£ |
| "Frequent buyer, new items often" | 1,000 | ~£2,000 × 0.5 kg/£ |

(DEFRA 2025 spend-based factor for clothing: ~0.50 kg CO₂e per £. Source: DEFRA GHG Conversion Factors 2025.)

### Question Design (8 questions across 4 categories)

**Transport (2 questions):**
1. "How do you usually travel?" → [Walk/cycle | Public transit | Petrol/diesel car | Electric car | Frequent flights]
   - Annualised: walk=0, transit~500, petrol~2,500, electric~800, flights~3,500 kg
2. "Roughly how far do you travel each week?" → [Under 50km | 50–200km | 200–500km | Over 500km]
   - Multiplier applied to Q1 answer

**Food (2 questions):**
3. "What's your diet?" → [Vegan | Vegetarian | Flexitarian | Omnivore | Meat daily]
   - Annual food kg: vegan~900, veg~1,200, flex~1,700, omni~2,200, meat_daily~3,300
4. "How often do you eat beef or lamb?" → [Never | Once a week | A few times/week | Daily]
   - Modifier on Q3 baseline: ×1.0 / ×1.2 / ×1.5 / ×2.0

**Home (2 questions):**
5. "What heats your home?" → [Heat pump/solar | Gas central heating | Oil/coal | Electric storage heaters]
   - Annual kg: heat_pump~400, gas~2,400, oil~3,500, electric~1,800
6. "Home size?" → [Studio/1-bed | 2–3 bed | 4+ bed]
   - Multiplier: ×0.7 / ×1.0 / ×1.5

**Shopping (2 questions):**
7. "How often do you buy new clothes?" → 4 options (see table above)
8. "How often do you buy new electronics/appliances?" → [Rarely (every few years) | Occasionally | Frequently]
   - Annual kg: rare~150, occasional~400, frequent~800

**Total → annualKgCo2e:** Sum of all category estimates. Convert to tCO₂e for display: `(total / 1000).toFixed(1)`.

**Global average comparison:**
- Global average: ~4.7 tCO₂e/year
- UK average: ~9.5 tCO₂e/year (production-based)
- Paris-aligned target: <2.5 tCO₂e/year

### Saving Baseline to Profiles

`profiles` table currently has: `id`, `display_name`, `avatar_url`, `created_at`.

**Missing column — requires new migration (06-02):**
```sql
-- supabase/migrations/20260328000015_add_baseline_kg_to_profiles.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS baseline_kg NUMERIC(10, 2);

COMMENT ON COLUMN profiles.baseline_kg IS
  'Annual kg CO₂e baseline from onboarding calculator. Null if calculator not completed.';
```

After signup, the `useProfile` hook's `useUpdateProfile` mutation can write:
```typescript
await supabase
  .from('profiles')
  .update({ baseline_kg: calculatedTotal })
  .eq('id', user.id);
```

---

## Common Pitfalls

### Pitfall 1: theme.test.ts Will Fail After Token Swap
**What goes wrong:** `__tests__/lib/theme.test.ts` has assertions like `expect(colors.primary).toBe('#1B7A4A')` and `expect(colors.background).toBe('#F8FAF9')`. After replacing token values these will fail.
**Why it happens:** Test was written against the light theme values.
**How to avoid:** Update `theme.test.ts` in the same commit as `lib/theme.ts` changes. Run Jest before marking 06-01 complete.
**Warning signs:** Jest red immediately after token swap.

### Pitfall 2: StatusBar `style="dark"` Is Currently Set (Wrong for Dark BG)
**What goes wrong:** `app/_layout.tsx` currently has `<StatusBar style="dark" />`. After the dark re-skin, this renders BLACK status bar icons on a near-black `#191C1C` background — invisible.
**Why it happens:** Phase 1 was built light-first.
**How to avoid:** Change to `style="light"` in 06-01 as part of the global sweep.
**Warning signs:** Status bar time/battery icons invisible on dark screens.

### Pitfall 3: `userInterfaceStyle: "light"` in app.json Causes Flash
**What goes wrong:** `app.json` currently has `"userInterfaceStyle": "light"` and splash `backgroundColor: "#F8FAF9"`. On cold start, iOS renders the splash with a white background before the dark UI loads — visible white flash.
**Why it happens:** Phase 5 set these for the original light design.
**How to avoid:** Change `userInterfaceStyle` to `"dark"` and `splash.backgroundColor` to `"#191C1C"` in 06-01.
**Warning signs:** Brief white screen on app launch.

### Pitfall 4: VBadge Light Category Chips Look Broken on Dark
**What goes wrong:** `VBadge.tsx` uses light pastel backgrounds (`'#FFF7ED'`, `'#EFF6FF'`, `'#FAF5FF'`) designed for white surfaces. On `#1E2120` these pastels have poor contrast and look jarring.
**Why it happens:** Hardcoded hex not using theme tokens.
**How to avoid:** Replace category chip backgrounds with dark equivalents (see token mapping above) in 06-01 hex sweep.
**Warning signs:** Category badges look washed out or too bright against dark cards.

### Pitfall 5: AnimatedTextInput Counter Clips on iOS (Known Reanimated Bug)
**What goes wrong:** GitHub issue #6752 — `useAnimatedProps` on TextInput with numeric text can show ellipsis on iOS when the container is sized to the text.
**Why it happens:** iOS text layout runs before animated value updates.
**How to avoid:** Set an explicit `minWidth` on the counter container (not just `flex: 1`). Use a fixed-width font (JetBrains Mono is monospaced — width is predictable).
**Warning signs:** "1,234..." truncation instead of full number.

### Pitfall 6: `runOnJS` Call in withTiming Callback Required for Step Advance
**What goes wrong:** Calling `setState` directly inside a Reanimated worklet callback throws a runtime error — React state updates cannot be called from the UI thread.
**Why it happens:** Reanimated worklets run on the UI thread; `setState` must run on JS thread.
**How to avoid:** Always wrap state updates called from animation callbacks with `runOnJS`:
```typescript
import { runOnJS } from 'react-native-reanimated';
slideX.value = withTiming(-SCREEN_WIDTH, {}, () => {
  runOnJS(advanceStep)(selectedAnswer);
});
```
**Warning signs:** "Tried to synchronously call a non-worklet function on the UI thread" error.

### Pitfall 7: baseline_kg Column Does Not Exist Yet
**What goes wrong:** If 06-02 tries to `UPDATE profiles SET baseline_kg = ...` without first running the migration, Supabase returns a "column does not exist" error.
**Why it happens:** `profiles` was created in migration 00000 with only 4 columns.
**How to avoid:** Create migration 20260328000015 before wiring the post-signup save.
**Warning signs:** Supabase client error on calculator completion.

### Pitfall 8: `app/(onboarding)/index.tsx` Carousel Routes to `/(auth)/login` Directly
**What goes wrong:** The current `handleGetStarted` in the carousel calls `router.replace('/(auth)/login')`. After Phase 6, it should route to `app/onboarding/calculator.tsx` instead. Forgetting this means the calculator is never reachable.
**Why it happens:** Phase 5 built a direct carousel → auth flow.
**How to avoid:** In 06-02, change `handleGetStarted` to `router.push('/onboarding/calculator')`.
**Warning signs:** Tapping "Get Started" skips the calculator entirely.

---

## Code Examples

### Dark Token Replacement (lib/theme.ts)

```typescript
// Source: CONTEXT.md locked decisions + Veridian Stitch design system
export const colors = {
  primary: '#006036',           // Forest Green (darker for WCAG on dark bg)
  primaryLight: '#1B7A4A',      // was primary — kept as lighter green
  primaryDark: '#004A29',       // darkest green
  primaryContainer: '#1B7A4A', // elevated surfaces
  secondary: '#006492',         // Ocean Blue
  surface: '#1E2120',           // card background (floats on bg)
  surfaceElevated: '#252B29',   // modals, bottom sheets
  background: '#191C1C',        // near-black
  mist: '#191C1C',              // alias
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B8B4',
  textTertiary: '#6B7670',
  error: '#CF6679',             // softer red on dark bg
  errorLight: '#2D0A0A',
  errorBorder: '#7B2535',
  warning: '#F59E0B',
  success: '#4CAF82',
  border: 'transparent',
  divider: '#2A302E',           // subtle dark divider
  // Category colors (kept vibrant — they work on dark)
  food: '#F97316',
  transport: '#0EA5E9',
  energy: '#EAB308',
  // Dark category chip backgrounds
  foodBg: '#2D1A08',
  transportBg: '#0A1E2E',
  energyBg: '#1F1A00',
  successBg: '#0A1F12',
} as const;
```

### AnimatedTextInput CO₂ Counter

```typescript
// Source: Reanimated 4.1.7 docs + battle-tested TextInput pattern
import Animated, {
  useSharedValue, useDerivedValue, useAnimatedProps, withTiming, Easing
} from 'react-native-reanimated';
import { TextInput, StyleSheet } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function Co2CounterFooter({ totalKg }: { totalKg: number }) {
  const animatedKg = useSharedValue(0);

  useEffect(() => {
    animatedKg.value = withTiming(totalKg, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [totalKg]);

  const animatedProps = useAnimatedProps(() => ({
    // toFixed(0) inside worklet — Reanimated 4 supports standard JS in worklets
    value: `${Math.round(animatedKg.value).toLocaleString()} kg CO₂e / yr`,
  }));

  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      editable={false}
      style={styles.counter}
    />
  );
}

const styles = StyleSheet.create({
  counter: {
    fontFamily: 'JetBrainsMono',
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 280,            // prevents iOS ellipsis clipping bug
    textAlign: 'center',
  },
});
```

### Full-Bleed Hero with Gradient

```typescript
// Source: expo-image 3.0.x docs + react-native-safe-area-context
import { ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HERO_PHOTOS = [
  require('@/assets/images/hero-forest.jpg'),
  require('@/assets/images/hero-ocean.jpg'),
  require('@/assets/images/hero-mountain.jpg'),
];

function HeroSection({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height: 380 + insets.top }}>
      <ImageBackground
        source={HERO_PHOTOS[0]}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(25,28,28,0.75)', '#191C1C']}
        locations={[0, 0.5, 1.0]}
        style={[StyleSheet.absoluteFillObject, { top: '30%' }]}
      />
      <View style={{ paddingTop: insets.top + 16, flex: 1, alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
}
```

### Calculator Step Slide Transition

```typescript
// Source: Reanimated 4.1.7 + runOnJS pattern from Phase 05 onboarding
import Animated, {
  useSharedValue, withTiming, useAnimatedStyle,
  Extrapolation, interpolate, runOnJS, Easing
} from 'react-native-reanimated';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const slideX = useSharedValue(0);
const animStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: slideX.value }],
  opacity: interpolate(
    Math.abs(slideX.value), [0, SCREEN_WIDTH * 0.4], [1, 0], Extrapolation.CLAMP
  ),
}));

const onAnswerSelected = (answer: string) => {
  slideX.value = withTiming(-SCREEN_WIDTH, { duration: 200, easing: Easing.in(Easing.ease) }, () => {
    runOnJS(handleAnswer)(answer);   // state update on JS thread
  });
};

const handleAnswer = (answer: string) => {
  // update answers, recalculate total, increment step
  slideX.value = SCREEN_WIDTH;      // reset to right (instant, no animation)
  slideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
};
```

---

## State of the Art

| Old Approach | Current Approach | Impact on Phase 6 |
|--------------|------------------|-------------------|
| `Animated` from `react-native` | `react-native-reanimated` 4.x | All new animations use Reanimated 4 worklets — consistent with codebase |
| `ImageBackground` from `react-native` | `ImageBackground` from `expo-image` | `expo-image` version has `contentFit`, better native caching, and `imageStyle` prop |
| `useColorScheme` for dark mode | `userInterfaceStyle: "dark"` in app.json | Forces system-level dark, eliminates conditional logic |
| `SafeAreaView` with background color on hero | Transparent `SafeAreaView` over `ImageBackground` stack | Photo extends behind status bar; content respects safe area |
| Per-screen `StatusBar` | Single `<StatusBar style="light" />` in root `_layout.tsx` | One change, all screens covered |

**Deprecated/outdated in this codebase:**
- `StatusBar style="dark"` in root layout — must become `style="light"` for dark backgrounds
- `userInterfaceStyle: "light"` in app.json — must become `"dark"` for always-dark app
- `splash.backgroundColor: "#F8FAF9"` — must become `"#191C1C"` to prevent cold-start flash

---

## Open Questions

1. **`expo-linear-gradient` — is it already installed?**
   - What we know: Not visible in `package.json`
   - What's unclear: The `expo-image` package is installed; `expo-linear-gradient` is separate
   - Recommendation: 06-01 or 06-03 plan should include `npx expo install expo-linear-gradient` if not present. Check with `cat package.json | grep linear-gradient` before assuming it's missing.

2. **Photo licensing for bundled nature photography**
   - What we know: CONTEXT.md says "5–8 curated photos bundled locally"
   - What's unclear: Source of photos — Unsplash (free with attribution)? Custom photography?
   - Recommendation: Use Unsplash free-tier images (`unsplash.com/license`). Download as JPEG at 1080×1920, compress to ≤300KB each with `imageoptim` or `squoosh` before bundling.

3. **`useUpdateProfile` hook — does it exist and does it accept `baseline_kg`?**
   - What we know: `useProfile` hook exists from Phase 04-01; `useUpdateProfile` is part of it
   - What's unclear: Whether the TypeScript type for the update payload accepts `baseline_kg` once the migration runs
   - Recommendation: In 06-02, update the `Profile` TypeScript interface in `types/` to add `baseline_kg?: number | null` alongside the migration.

4. **`app/(onboarding)/index.tsx` — does `router.push('/onboarding/calculator')` work from inside `(onboarding)` group?**
   - What we know: Expo Router file-based routing; `app/onboarding/calculator.tsx` is outside the `(onboarding)` group (no parentheses in path)
   - What's unclear: Whether a `Stack.Protected` guard needs to be added for the calculator route
   - Recommendation: Place calculator at `app/onboarding/calculator.tsx` (no group parentheses). The route becomes `/onboarding/calculator`. From the onboarding carousel use `router.push('/onboarding/calculator')`. After signup completes, use `router.replace('/(tabs)')`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest-expo@54.0.17 |
| Config file | `jest.config.js` (inferred from `package.json` scripts) |
| Quick run command | `npx jest --testPathPattern="theme\|calculator" --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSGN-01/09 | Token values match dark design system | unit | `npx jest __tests__/lib/theme.test.ts` | ✅ (needs value updates) |
| DSGN-03 | `computeAnnualKg` returns correct totals per answer combination | unit | `npx jest __tests__/lib/calculator.test.ts` | ❌ Wave 0 |
| DSGN-05 | `baseline_kg` column exists in profiles schema | smoke | `npx jest __tests__/hooks/useProfile.test.ts` | ✅ (needs baseline_kg stub) |
| DSGN-07 | AnimatedTextInput counter renders without crash | unit/render | `npx jest __tests__/components/Co2CounterFooter.test.tsx` | ❌ Wave 0 |
| DSGN-11 | Shopping multipliers sum to plausible annual totals | unit | `npx jest __tests__/lib/calculator.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest __tests__/lib/theme.test.ts --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `__tests__/lib/calculator.test.ts` — covers DSGN-03, DSGN-11: pure function `computeAnnualKg(answers) → number`
- [ ] `__tests__/components/Co2CounterFooter.test.tsx` — covers DSGN-07: renders without crash, snapshots counter text
- [ ] Update `__tests__/lib/theme.test.ts` — update assertions to assert dark token values (DSGN-01/09)

---

## Sources

### Primary (HIGH confidence)
- Live codebase audit (`lib/theme.ts`, `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(onboarding)/index.tsx`, `supabase/migrations/`, `supabase/seed.sql`, `package.json`) — confirmed all dependency versions, current token values, hardcoded hex locations
- [Expo Color Themes Documentation](https://docs.expo.dev/develop/user-interface/color-themes/) — `userInterfaceStyle: "dark"` + `expo-system-ui` requirement
- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/) — `ImageBackground` with `contentFit`, `imageStyle` prop
- [Reanimated `withTiming` documentation](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/) — animation API confirmed

### Secondary (MEDIUM confidence)
- [react-native-reanimated Issue #6752](https://github.com/software-mansion/react-native-reanimated/issues/6752) — iOS ellipsis bug with animated TextInput numeric text
- [react-native-reanimated Issue #6173](https://github.com/software-mansion/react-native-reanimated/issues/6173) — createAnimatedComponent TextInput value prop issue
- [DEFRA 2025 GHG Conversion Factors — GOV.UK](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025) — Shopping spend-based factor ~0.5 kg CO₂e/£
- [Our World in Data — UK CO₂ Profile](https://ourworldindata.org/co2/country/united-kingdom) — UK average 9.5 tCO₂e/year; global 4.7 tCO₂e/year

### Tertiary (LOW confidence — verify before implementing)
- [GoClimate — Carbon Footprint of Shopping](https://www.goclimate.com/blog/the-carbon-footprint-of-shopping/) — shopping category estimates cross-checked against DEFRA order-of-magnitude
- WebSearch results on Reanimated 4 animated number patterns — verified pattern exists; implementation detail from ReText convention

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions confirmed from live `node_modules` + `package.json`
- Architecture: HIGH — patterns verified against existing working code in the repo
- Token replacement: HIGH — `lib/theme.ts` read directly; export shape confirmed
- Pitfalls: HIGH — identified from direct codebase audit (wrong StatusBar style, missing baseline_kg column, light app.json values)
- Carbon formulas: MEDIUM — DEFRA transport/food/energy from live seed.sql (HIGH); shopping multipliers are derived estimates (MEDIUM)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable ecosystem — Expo SDK 54 + Reanimated 4 are not in active breaking-change cycle)
