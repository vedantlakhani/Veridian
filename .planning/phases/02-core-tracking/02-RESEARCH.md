# Phase 2: Core Tracking - Research

**Researched:** 2026-03-16
**Domain:** React Native emission logging, TanStack Query v5, Supabase Realtime, react-native-svg charts
**Confidence:** HIGH

---

## Summary

Phase 2 builds on a complete Phase 1 foundation. All 13 Supabase tables, RLS policies, TypeScript interfaces, V* component design system, and TanStack React Query are already in place. The work is wiring together real data flows: a Log screen → emission_factors lookup → kg_co2e_total calculation → INSERT → summary upsert → Home dashboard display → History chart view → edit/delete management.

The most important architectural insight: the calculation is trivially simple (quantity × kg_co2e = total) but the summary maintenance pattern — keeping daily_summaries and weekly_summaries tables consistent — requires careful upsert logic. Supabase Realtime (broadcast channel on `emission_entries`) enables cross-device sync for TRACK-12. Victory Native is not installed, so bar charts will be drawn directly with react-native-svg (Rect + Text primitives), which avoids adding a new dependency.

**Primary recommendation:** Build in plan order — Log UI → calculation engine → dashboard → history/charts → entry management. The calculation engine (lib/emissions.ts) is the hub that every other plan depends on; complete it in plan 2 before any UI that needs to display totals.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRACK-01 | User can log a food emission entry by selecting category, item, and quantity | Log screen calls emission_factors with category='food', quantity × kg_co2e = total, INSERT to emission_entries |
| TRACK-02 | User can log a transport emission entry (car, public transit, flight, cycling) with distance | Same flow; transport factors use unit='km' so quantity = distance in km |
| TRACK-03 | User can log a home energy emission entry (electricity kWh, gas m³, heating) | Energy factors have mixed units (kWh, m3, litre, tonne) — UI must display the correct unit label from the factor |
| TRACK-04 | Emission calculation uses emission_factors table values (never hardcoded) | lib/emissions.ts reads factor.kg_co2e; formula: quantity × kg_co2e |
| TRACK-05 | User can view today's total carbon footprint on the Home screen | Query daily_summaries for today; fall back to summing emission_entries if no summary row yet |
| TRACK-06 | User can view weekly carbon breakdown by category (food/transport/energy) | weekly_summaries.breakdown JSONB has food/transport/energy keys |
| TRACK-07 | User can view monthly carbon totals with trend comparison | Aggregate daily_summaries by month; compare to previous month total |
| TRACK-08 | User can view emission history list with date filtering | Query emission_entries joined to emission_factors with date range filter; use EmissionEntryWithFactor type |
| TRACK-09 | Bar chart showing daily/weekly emission breakdown | react-native-svg (already installed, 15.12.1); Victory Native is NOT installed — build with SVG primitives |
| TRACK-10 | User can edit a logged emission entry | UPDATE emission_entries (quantity + recalculate kg_co2e_total); re-upsert daily/weekly summaries |
| TRACK-11 | User can delete a logged emission entry | DELETE emission_entries; re-upsert daily/weekly summaries (subtract contribution) |
| TRACK-12 | Emission entries sync via Supabase Realtime across devices | supabase.channel('emission_entries').on('postgres_changes', ...) subscription |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 | DB queries + Realtime subscriptions | Singleton at lib/supabase.ts already configured |
| @tanstack/react-query | 5.90.21 | Server state, caching, mutations | Already installed; queryClient at lib/queryClient.ts (5 min staleTime) |
| react-native-svg | 15.12.1 | Bar chart rendering for TRACK-09 | Already installed and working (VProgressRing uses it) |
| react-native-reanimated | ~3.16.7 | Animated transitions in log/dashboard | Required by project rules; already installed |
| react-native-gesture-handler | ~2.28.0 | Swipe-to-delete on history entries | Already installed; GestureHandlerRootView wraps root |
| zustand | ^5.0.12 | Auth user_id access in mutations | useAuthStore already in stores/authStore.ts |

### Victory Native Status

Victory Native 41.x is listed in the roadmap description but is NOT in package.json and NOT installed. Do not add it. Build bar charts with react-native-svg primitives directly (Rect, Text, Line from react-native-svg). This avoids a new dependency, keeps bundle size smaller, and leverages the already-installed library.

### New Files Required (Phase 2 creates these)

| File | Purpose |
|------|---------|
| `lib/emissions.ts` | Calculation utilities: calcTotal(), queryFactors(), upsertDailySummary(), upsertWeeklySummary() |
| `stores/emissionStore.ts` | Zustand store for selected category/factor in the Log flow (ephemeral UI state) |
| `hooks/useEmissionEntries.ts` | TanStack Query hooks: useEntries, useCreateEntry, useUpdateEntry, useDeleteEntry |
| `hooks/useDailySummary.ts` | Query hooks for daily_summaries, weekly_summaries |
| `components/charts/EmissionBarChart.tsx` | SVG bar chart component (pure react-native-svg) |

---

## Architecture Patterns

### Recommended File Structure (Phase 2 additions)

```
lib/
├── supabase.ts          # existing
├── theme.ts             # existing
├── queryClient.ts       # existing
└── emissions.ts         # NEW — calculation engine

stores/
├── authStore.ts         # existing
└── emissionStore.ts     # NEW — ephemeral log UI state

hooks/
├── useEmissionEntries.ts  # NEW — CRUD hooks
├── useEmissionFactors.ts  # NEW — factor lookup (cached aggressively)
└── useSummaries.ts        # NEW — daily/weekly/monthly summary hooks

components/
├── ui/                  # existing V* components
├── charts/
│   └── EmissionBarChart.tsx  # NEW — react-native-svg bar chart
└── log/
    ├── CategorySelector.tsx  # food / transport / energy chips
    ├── FoodForm.tsx          # food sub-form (item picker + kg quantity)
    ├── TransportForm.tsx     # transport sub-form (vehicle picker + km)
    └── EnergyForm.tsx        # energy sub-form (source picker + unit quantity)

app/(tabs)/
├── index.tsx           # HOME — replace stub with dashboard
├── log.tsx             # LOG — replace stub with logging UI
└── insights.tsx        # INSIGHTS — history list + chart views

app/entry/
└── [id].tsx            # Edit entry modal (pushed as modal route)
```

### Pattern 1: Emission Calculation Engine (lib/emissions.ts)

**What:** Pure TypeScript utility — no React, no Supabase calls. Takes a factor and quantity, returns kg_co2e_total. Also contains upsert helpers for daily/weekly summaries.

**When to use:** Called by mutation handlers before INSERT, and again on edit/delete to recompute summaries.

**Formula:**
```typescript
// Source: DEFRA 2025 specification — multiply factor rate by quantity
export function calcEmission(factorKgCo2e: number, quantity: number): number {
  return factorKgCo2e * quantity;
}
```

**Summary upsert pattern (daily):**
```typescript
// Use Supabase's ON CONFLICT DO UPDATE — never manual read-then-write
await supabase.from('daily_summaries').upsert(
  {
    user_id: userId,
    date: todayIso,           // "2026-03-16" — DATE column, pass as string
    total_kg_co2e: newTotal,
    food_kg: newFoodKg,
    transport_kg: newTransportKg,
    energy_kg: newEnergyKg,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'user_id,date' }  // UNIQUE constraint from migration
);
```

**Key insight:** daily_summaries has `UNIQUE (user_id, date)`. Use `upsert` with `onConflict: 'user_id,date'` — do not try INSERT then UPDATE separately.

### Pattern 2: TanStack Query v5 Mutation for Entry Creation

**What:** useMutation with onSuccess cache invalidation.

```typescript
// Source: @tanstack/react-query 5.x (installed version 5.90.21)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      const { data, error } = await supabase
        .from('emission_entries')
        .insert({
          user_id: input.userId,
          factor_id: input.factorId,
          quantity: input.quantity,
          kg_co2e_total: calcEmission(input.factorKgCo2e, input.quantity),
          logged_at: new Date().toISOString(),
        })
        .select('*, emission_factors(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all entry + summary queries so UI refreshes
      queryClient.invalidateQueries({ queryKey: ['emission_entries'] });
      queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['weekly_summary'] });
    },
  });
}
```

**TanStack Query v5 breaking change:** `useMutation` no longer accepts `mutationFn` as first argument. Must use object form `useMutation({ mutationFn: ... })`. This is already the installed version (5.90.21) — use object form only.

### Pattern 3: Emission Factors Query (aggressive caching)

**What:** emission_factors table is read-only (seeded data, no client writes). Cache it forever — no staleTime limit.

```typescript
export function useEmissionFactors(category: EmissionCategory) {
  return useQuery({
    queryKey: ['emission_factors', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emission_factors')
        .select('*')
        .eq('category', category)
        .order('subcategory');
      if (error) throw error;
      return data as EmissionFactor[];
    },
    staleTime: Infinity,  // factors never change — cache forever
    gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection
  });
}
```

### Pattern 4: Supabase Realtime Subscription (TRACK-12)

**What:** Subscribe to postgres_changes on emission_entries filtered by user_id. Invalidate TanStack Query cache on any INSERT/UPDATE/DELETE.

```typescript
// Source: @supabase/supabase-js 2.x — postgres_changes event
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useEmissionRealtime(userId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`emission_entries:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emission_entries',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['emission_entries'] });
          queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
          queryClient.invalidateQueries({ queryKey: ['weekly_summary'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);
}
```

**Realtime requirement:** Supabase postgres_changes requires the table to have Realtime enabled in the Supabase dashboard (or via migration). Migration 00002 does not call `ALTER PUBLICATION supabase_realtime ADD TABLE emission_entries`. A migration must be added if Realtime is not already enabled for this table.

### Pattern 5: Bar Chart with react-native-svg

**What:** SVG bar chart built from Rect + Text primitives. No Victory Native required.

```typescript
// Source: react-native-svg 15.x installed API
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

// Each bar: width determined by availableWidth / numBars, height proportional to value/maxValue
const barWidth = (chartWidth - padding * 2) / data.length - barGap;
const barHeight = (value / maxValue) * maxBarHeight;
// Rect y = chartHeight - barHeight (SVG y-axis goes down)
```

### Pattern 6: Log Screen — VBottomSheet for sub-forms

**What:** The Log tab shows a category selector (VChip row: Food / Transport / Energy). Selecting a category opens a VBottomSheet with the appropriate sub-form. This matches the existing VBottomSheet API (isOpen, onClose, title, children).

```typescript
// Log screen state
const [category, setCategory] = useState<EmissionCategory | null>(null);
const [sheetOpen, setSheetOpen] = useState(false);

// On chip press: set category and open sheet
const handleCategorySelect = (cat: EmissionCategory) => {
  setCategory(cat);
  setSheetOpen(true);
};
```

### Anti-Patterns to Avoid

- **Hardcoding emission factors:** TRACK-04 explicitly forbids this. All kg_co2e values come from the DB.
- **Calling supabase directly in components:** All DB calls go through TanStack Query hooks in `hooks/`. Components call hooks.
- **Manual summary calculation on read:** Summaries are maintained on write (upsert after each INSERT/UPDATE/DELETE), not recalculated on every read.
- **Using the RN Animated API:** Project-wide rule — only Reanimated 3. Any animated component uses `useSharedValue`, `useAnimatedStyle`, or `withTiming/withSpring`.
- **Importing ReactNode from react-native:** Import from `'react'` only (established in Phase 1 decisions).
- **Using Victory Native:** Not installed. Building charts with react-native-svg directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server state / cache invalidation | Custom fetch + useState | TanStack Query v5 useQuery + useMutation | Cache coherence, background refetch, error states |
| Optimistic updates | Manual rollback logic | useMutation onMutate + onError context | React Query handles rollback automatically |
| Summary upsert conflicts | Read-then-write pattern | Supabase upsert with onConflict | Race conditions; UNIQUE constraint handles it atomically |
| Cross-device sync | Polling | Supabase Realtime postgres_changes | Server-push; no polling overhead |
| Swipe-to-delete gesture | Custom PanResponder | Gesture.Pan() from react-native-gesture-handler | Already installed; consistent with VBottomSheet pattern |
| Animated list entry | RN Animated API | Reanimated 3 entering/exiting layout animations | Project rule; Reanimated is mandatory |

---

## Common Pitfalls

### Pitfall 1: Date Timezone Drift in daily_summaries

**What goes wrong:** Inserting `new Date().toISOString()` into a DATE column passes a UTC timestamp. If the user is in UTC-5, midnight local = 05:00 UTC next day → logs appear on wrong date.
**Why it happens:** PostgreSQL DATE columns strip the time component but use server timezone.
**How to avoid:** Compute today's date as a local string: `new Date().toLocaleDateString('en-CA')` which produces "2026-03-16" in ISO format using the device's local timezone. Store that as the `date` field.
**Warning signs:** Tests pass but entries appear on the wrong date for non-UTC users.

### Pitfall 2: Summary Drift on Edit/Delete

**What goes wrong:** When an entry is edited (quantity changed) or deleted, the daily_summary totals become stale if you only recompute the delta.
**Why it happens:** Delta logic (subtract old, add new) is error-prone across category changes.
**How to avoid:** After any edit or delete, re-sum all entries for that day from emission_entries directly (one aggregate query) and upsert the result. Never apply deltas. This is slightly less efficient but guaranteed correct.

```typescript
// Correct approach: recompute from scratch for the affected date
const { data } = await supabase.rpc('recompute_daily_summary', {
  p_user_id: userId,
  p_date: affectedDate,
});
// OR: aggregate query in the client for simplicity since 73-factor dataset is small
const { data: entries } = await supabase
  .from('emission_entries')
  .select('*, emission_factors(category)')
  .eq('user_id', userId)
  .gte('logged_at', startOfDay)
  .lte('logged_at', endOfDay);
// Then sum by category client-side and upsert
```

### Pitfall 3: Realtime Not Enabled on the Table

**What goes wrong:** Supabase Realtime subscription returns no events even though inserts are happening.
**Why it happens:** Realtime in Supabase requires the table to be added to the `supabase_realtime` publication. This is a separate step from creating the table.
**How to avoid:** Add a migration: `ALTER PUBLICATION supabase_realtime ADD TABLE emission_entries;`
**Warning signs:** Channel subscribes without error but onChange callback never fires.

### Pitfall 4: VBottomSheet Content Overflow

**What goes wrong:** Log sub-forms (especially energy with its multiple unit variants) overflow the VBottomSheet's `maxHeight: SCREEN_HEIGHT * 0.9`.
**Why it happens:** VBottomSheet wraps content in a plain `<View>` with `paddingHorizontal`. No scroll.
**How to avoid:** Wrap the form content inside `<ScrollView>` inside the VBottomSheet children. The sheet's inner content container must not have `flex: 1` or it will fight with the ScrollView.

### Pitfall 5: TanStack Query v5 — useQuery requires enabled guard for userId

**What goes wrong:** Queries fire before auth is ready, sending null user_id to Supabase → RLS blocks → empty results cached.
**Why it happens:** useQuery runs on mount; auth state loads asynchronously.
**How to avoid:** Pass `enabled: !!userId` to all user-scoped queries.

```typescript
const { user } = useAuthStore();
const { data } = useQuery({
  queryKey: ['emission_entries', user?.id],
  queryFn: () => fetchEntries(user!.id),
  enabled: !!user?.id,  // CRITICAL: guard against null user
});
```

### Pitfall 6: SVG Chart Text Clipping on Android

**What goes wrong:** SvgText labels outside the Svg viewBox are clipped on Android (unlike iOS which overflows).
**Why it happens:** Android SVG rendering clips to viewBox by default.
**How to avoid:** Add bottom padding to chart height to account for axis labels. Set `overflow="visible"` on the Svg element (react-native-svg supports this prop).

### Pitfall 7: Weekly Summary week_start Calculation

**What goes wrong:** `week_start` must be the Monday (ISO week start), not Sunday. Inconsistent week boundary = wrong totals.
**Why it happens:** JavaScript `getDay()` returns 0 for Sunday. ISO weeks start Monday.
**How to avoid:**
```typescript
function getISOWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  d.setDate(diff);
  return d.toLocaleDateString('en-CA'); // "2026-03-16"
}
```

---

## Code Examples

### Emission Factor Query (Supabase)
```typescript
// Source: @supabase/supabase-js 2.x with TypeScript
const { data, error } = await supabase
  .from('emission_factors')
  .select('id, category, subcategory, item, unit, kg_co2e')
  .eq('category', 'food')
  .order('subcategory', { ascending: true })
  .order('item', { ascending: true });
```

### Insert Emission Entry with Join Return
```typescript
// Source: @supabase/supabase-js 2.x — select with nested relation
const { data, error } = await supabase
  .from('emission_entries')
  .insert({
    user_id: userId,
    factor_id: factorId,
    quantity: quantity,
    kg_co2e_total: quantity * factorKgCo2e,
    logged_at: new Date().toISOString(),
  })
  .select('*, emission_factors(*)')  // denormalized join
  .single();
// Returns EmissionEntryWithFactor shape matching types/emission.ts
```

### Daily Summary Upsert
```typescript
// Source: @supabase/supabase-js 2.x upsert API
await supabase.from('daily_summaries').upsert(
  {
    user_id: userId,
    date: new Date().toLocaleDateString('en-CA'), // local timezone date
    total_kg_co2e: totals.total,
    food_kg: totals.food,
    transport_kg: totals.transport,
    energy_kg: totals.energy,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'user_id,date' }
);
```

### Realtime Channel Cleanup
```typescript
// Source: @supabase/supabase-js 2.x channel management
const channel = supabase.channel('user-emissions').on(...).subscribe();
// Must clean up in useEffect return to prevent memory leaks + duplicate subscriptions
return () => { supabase.removeChannel(channel); };
```

### SVG Bar Chart (react-native-svg 15.x)
```typescript
// Source: react-native-svg 15.12.1 — Rect and Text primitives
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';

// Inside render (assume data = [{ label, value, color }], maxValue, chartHeight, chartWidth)
const barCount = data.length;
const barWidth = (chartWidth - 32) / barCount - 4;
const maxBarHeight = chartHeight - 24; // reserve 24px for labels

data.map((item, i) => {
  const barH = maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 0;
  const x = 16 + i * (barWidth + 4);
  const y = chartHeight - 24 - barH;
  return (
    <G key={item.label}>
      <Rect x={x} y={y} width={barWidth} height={barH} fill={item.color} rx={4} />
      <SvgText x={x + barWidth / 2} y={chartHeight - 6} textAnchor="middle" fontSize={10} fill="#6B7280">
        {item.label}
      </SvgText>
    </G>
  );
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useMutation(fn, options) | useMutation({ mutationFn: fn, ...options }) | TanStack Query v5 | First-arg function form removed |
| useQuery(key, fn, options) | useQuery({ queryKey, queryFn, ...options }) | TanStack Query v5 | Object-only form |
| supabase.from().on() | supabase.channel().on().subscribe() | @supabase/supabase-js v2 | Old real-time API removed entirely |
| AnimatedFlatList (Animated API) | Animated.FlatList from reanimated | Project rule from day 1 | Project policy |

**Deprecated/outdated:**
- Victory Native: Listed in roadmap prose but not in package.json and not installed. Using react-native-svg directly.
- RN Animated API: Banned. All animations use Reanimated 3.

---

## Open Questions

1. **Realtime publication — is emission_entries already added?**
   - What we know: Migration 00002 creates emission_entries but does not contain `ALTER PUBLICATION supabase_realtime ADD TABLE`.
   - What's unclear: Whether Supabase auto-includes new tables in the realtime publication or if it must be explicit.
   - Recommendation: Add a new migration `20260315000013_enable_realtime.sql` with `ALTER PUBLICATION supabase_realtime ADD TABLE emission_entries;` to be safe. Confirm by testing a Realtime subscription in dev.

2. **daily_summaries update strategy — DB trigger vs. client upsert?**
   - What we know: No DB trigger exists in the migrations. The schema has the table with updated_at.
   - What's unclear: Whether a DB-side trigger would be cleaner for maintaining summary consistency.
   - Recommendation: Use client-side upsert in mutations for Phase 2. A DB trigger would require a new migration and more complexity. Client upsert is fine at this scale (single user, <365 rows/year).

3. **Monthly totals: aggregate from daily_summaries or emission_entries directly?**
   - What we know: There is no `monthly_summaries` table in the schema.
   - Recommendation: Aggregate from daily_summaries (already summed by day/category). Query: `SELECT sum(total_kg_co2e), sum(food_kg), sum(transport_kg), sum(energy_kg) FROM daily_summaries WHERE user_id = $1 AND date >= $2 AND date < $3`. Do not create a monthly_summaries table for Phase 2.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | jest-expo 54.0.17 (pinned to Expo 54) |
| Config file | jest.config.js (root) |
| Quick run command | `npx jest --testPathPattern="lib/emissions" --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRACK-01 | Food emission entry creation | unit | `npx jest __tests__/lib/emissions.test.ts -t "food" --no-coverage` | ❌ Wave 0 |
| TRACK-02 | Transport emission entry creation | unit | `npx jest __tests__/lib/emissions.test.ts -t "transport" --no-coverage` | ❌ Wave 0 |
| TRACK-03 | Energy emission entry creation | unit | `npx jest __tests__/lib/emissions.test.ts -t "energy" --no-coverage` | ❌ Wave 0 |
| TRACK-04 | Calculation uses factor values not hardcoded | unit | `npx jest __tests__/lib/emissions.test.ts -t "calcEmission" --no-coverage` | ❌ Wave 0 |
| TRACK-05 | Today's total on Home screen | unit | `npx jest __tests__/lib/emissions.test.ts -t "daily summary" --no-coverage` | ❌ Wave 0 |
| TRACK-06 | Weekly breakdown by category | unit | `npx jest __tests__/lib/emissions.test.ts -t "weekly" --no-coverage` | ❌ Wave 0 |
| TRACK-07 | Monthly totals with trend | unit | `npx jest __tests__/lib/emissions.test.ts -t "monthly" --no-coverage` | ❌ Wave 0 |
| TRACK-08 | History list with date filter | unit | `npx jest __tests__/hooks/useEmissionEntries.test.ts --no-coverage` | ❌ Wave 0 |
| TRACK-09 | Bar chart renders correct bars | unit | `npx jest __tests__/components/EmissionBarChart.test.tsx --no-coverage` | ❌ Wave 0 |
| TRACK-10 | Edit entry updates totals | unit | `npx jest __tests__/lib/emissions.test.ts -t "update" --no-coverage` | ❌ Wave 0 |
| TRACK-11 | Delete entry updates totals | unit | `npx jest __tests__/lib/emissions.test.ts -t "delete" --no-coverage` | ❌ Wave 0 |
| TRACK-12 | Realtime sync invalidates cache | manual | Manual test: two devices/simulators | N/A |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="lib/emissions" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/lib/emissions.test.ts` — covers TRACK-01 through TRACK-07, TRACK-10, TRACK-11 (calcEmission, daily/weekly summary upsert logic)
- [ ] `__tests__/components/EmissionBarChart.test.tsx` — covers TRACK-09 (bar chart renders correct number of bars)
- [ ] `__tests__/hooks/useEmissionEntries.test.ts` — covers TRACK-08 (history query with date filter)

---

## Key Integration Points from Phase 1

These Phase 1 decisions directly affect Phase 2 implementation:

| Decision | Phase 2 Impact |
|----------|---------------|
| `(select auth.uid())` in RLS | All queries automatically scoped; no manual user_id filter needed on SELECT |
| `expo-sqlite/localStorage` polyfill | lib/supabase.ts already configured; no changes needed |
| `useAuthStore` with `user` field | Access `useAuthStore().user?.id` in hooks; guard with `enabled: !!user?.id` |
| `VBottomSheet` (gesture, pan-dismiss) | Log sub-forms open inside VBottomSheet; no new sheet component needed |
| `VProgressRing` (SVG, Reanimated) | Home dashboard daily progress ring: `progress={todayKg / DAILY_CARBON_BUDGET_KG}` |
| `VMetricCard` (JetBrains Mono) | Dashboard metric display: `<VMetricCard value={todayKg} unit="kg CO₂e" label="Today" />` |
| `VChip` (selectable) | Category selector in Log screen: `<VChip label="Food" selected={cat === 'food'} onPress={...} />` |
| `VEmptyState` | History list empty state: `<VEmptyState title="No entries yet" cta="Log your first entry" />` |
| `VSkeleton` | Loading state while queries fetch: `<VSkeleton width={200} height={24} />` |
| `GestureHandlerRootView` | Already wraps root layout; VBottomSheet and swipe-to-delete will work without change |
| `queryClient` (5 min staleTime) | Override with `staleTime: Infinity` for emission_factors (read-only seed data) |
| `runOnJS` imported at top level | If any worklet callbacks needed in gesture handlers for log forms, follow this pattern |

---

## Sources

### Primary (HIGH confidence)
- `/Users/vedantlakhani/Desktop/Veridian/supabase/seed.sql` — all 73 emission factors, units, categories confirmed
- `/Users/vedantlakhani/Desktop/Veridian/supabase/migrations/` — exact table schemas, constraints, indexes, RLS policies
- `/Users/vedantlakhani/Desktop/Veridian/types/emission.ts` — interfaces including DAILY_CARBON_BUDGET_KG = 22, TARGET_CARBON_BUDGET_KG = 7
- `/Users/vedantlakhani/Desktop/Veridian/package.json` — confirmed @tanstack/react-query 5.90.21, react-native-svg 15.12.1; Victory Native NOT present
- `/Users/vedantlakhani/Desktop/Veridian/components/ui/VBottomSheet.tsx` — confirmed API: isOpen, onClose, title, children
- `/Users/vedantlakhani/Desktop/Veridian/components/ui/VProgressRing.tsx` — confirmed API: progress (0-1), size, color
- `/Users/vedantlakhani/Desktop/Veridian/components/ui/VMetricCard.tsx` — confirmed API: value, unit, label, trend
- `/Users/vedantlakhani/Desktop/Veridian/components/ui/VChip.tsx` — confirmed API: label, selected, onPress
- `/Users/vedantlakhani/Desktop/Veridian/.planning/STATE.md` — confirmed Phase 1 architectural decisions

### Secondary (MEDIUM confidence)
- TanStack Query v5 object-only API — confirmed by installed version 5.90.21 and known v5 breaking changes
- Supabase channel().on('postgres_changes').subscribe() API — confirmed by @supabase/supabase-js v2 (installed 2.99.1)
- react-native-svg Rect/Text/G primitives — confirmed by existing VProgressRing usage of Svg/Circle from same package

### Tertiary (LOW confidence)
- Android SVG overflow clipping behavior — known community pitfall, not directly verified in 15.12.1 changelog
- ISO week start (Monday) convention — JavaScript date behavior is well-known but test coverage recommended

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from package.json and node_modules; Victory Native absence confirmed
- Architecture: HIGH — based on actual migration schemas and existing component APIs
- Pitfalls: MEDIUM/HIGH — date timezone and summary drift from established patterns; Realtime publication gap from schema inspection
- Test gaps: HIGH — all test files confirmed absent via filesystem scan

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (dependencies stable; Supabase JS v2 API stable)
