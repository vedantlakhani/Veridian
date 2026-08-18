# Snap-a-Plate — Feature Specification (v1 proposal)

*Status: proposal, awaiting product-owner approval. No implementation has started. Written August 2026.*

*Prerequisite reading: `docs/NORTH_STAR.md` §6 (receipts posture) and §8 (design bar), `docs/DESIGN_RESEARCH.md` (Persona #1), and `supabase/functions/receipt-parse/index.ts` — the shipped harness this feature extends.*

---

## 0. Summary

Food is the highest-frequency logging category and the only one with no autopilot signal behind it. Movement is covered by sensors, spend by Plaid, purchases by receipts. Food eaten at home or in a restaurant that was paid for in cash, split, or expensed is still typed in by hand, factor by factor, gram by gram, through the picker in `app/log.tsx`.

Snap-a-Plate replaces that typing with a photograph. The user points the camera at what they are about to eat; the app returns a plain-English identification, an estimated portion, a preparation note, and a carbon estimate, as a card the user taps once to accept or one tap to correct.

The feature is deliberately **not** a new pipeline. It is the `receipt-parse` harness — auth, content-hash idempotency, base64-image-to-Haiku, structured JSON out, token-cost logging, service-role writes — pointed at a different prompt and a different resolver. Everything that was hard to get right in Sprint E stays exactly as it is.

### What is reused vs. what is new

| Concern | Source | Status |
|---|---|---|
| Auth gate (`verifyUser`, network round-trip, not a decoded JWT) | `supabase/functions/_shared/authUser.ts` | Reused unchanged |
| CORS preamble | `supabase/functions/_shared/cors.ts` | Reused unchanged |
| Client → edge call pattern | `lib/edgeFunction.ts` `callEdgeFunction` | Reused unchanged |
| Anthropic SDK usage, base64 image message shape | `receipt-parse` `buildImageMessage` | Reused, new prompt |
| Content-hash idempotency (SHA-256 before any model call or write) | `receipt-parse` `sha256Hex` + unique column | Reused, new table |
| Token usage / cost logging | `receipt-parse` lines 199-206 | Reused unchanged |
| Structured-output prompt discipline | `receipt-parse` `STRUCTURED_OUTPUT_PROMPT` | Pattern reused, new prompt |
| Summary recomputation on write | `lib/emissions.ts` `upsertDailySummary` / `upsertWeeklySummary` | Reused unchanged |
| Entry creation shape (`factor_id`, `quantity`, `kg_co2e_total = calcEmission(...)`) | `hooks/useEmissionEntries.ts` `useCreateEntry` | Reused, see §3.6 |
| Manual food picker fallback | `app/log.tsx` category chips + search + factor list | Reused as-is, plus a pre-filled entry point |
| Food emission factors | `supabase/seed.sql`, 35 DEFRA 2025 food rows | Reused, plus 3 new fallback rows |
| Food keyword → factor resolution | — | **New** (`data/food_keywords.json`) |
| Photo capture affordance | — | **New** (`app/log.tsx`) |
| To-confirm plate card | — | **New** component |
| `plate_scans` / `plate_scan_items` / `plate_scan_verdicts` | — | **New** migration |
| `plate-scan` edge function | — | **New**, sibling of `receipt-parse` |

### Sibling function, not a new mode on `receipt-parse`

`receipt-parse` should not grow a `mode: 'plate'` branch. Its body past the model call is entirely spend-shaped: it writes `receipts`/`receipt_items`, resolves NAICS codes through `_shared/itemFactors.ts`, prices items in USD against USEEIO factors, and runs supersede-matching against `bank_transactions`. A food photo has no merchant, no price, no transaction to supersede, and resolves against mass-based DEFRA factors instead. Sharing that function would mean two disjoint bodies behind one door.

The proposal is `supabase/functions/plate-scan/index.ts` — same imports, same helper modules, same top-to-bottom structure, roughly a third the length because there is no supersede logic. The parts worth sharing (auth, CORS, hashing, cost logging, summaries) are already in `_shared/`; `sha256Hex` is the one helper currently inlined in `receipt-parse` and should be lifted into `_shared/hash.ts` and imported by both rather than copy-pasted.

---

## 1. User flow

### 1.1 Where the camera lives

`app/log.tsx` opens on a horizontal "One-tap log" row of up to four `QuickSlotCard`s, derived from the user's own logging frequency. Snap-a-Plate is proposed as a **persistent leading card in that same row**, before the frequency-derived slots:

- Same 128 × 124 footprint and `radii.lg` corner as `QuickSlotCard`, so the row reads as one rail.
- `colors.food` accent, `colors.foodBg` ground, a camera glyph instead of the fork.
- Label: "Snap a plate". Sub-label: "Photo instead of typing".
- No kilogram figure on the card (there is nothing to preview yet) — the absence is deliberate and visually distinguishes it from a loggable slot.

Second entry point: when `activeCategory === 'food'`, a small camera button appears inside the existing `styles.searchRow`, right of the text input. A user who has already drilled into Food and started typing is exactly the user this feature exists for, and they should not have to scroll back up.

Whether the leading card is persistent or only appears when Food is selected is a product call, not an engineering one — see Open Question 1.

### 1.2 Capture

Tapping either affordance opens a two-option sheet (`VBottomSheet`, matching the existing log sheet):

- **Take a photo** — `expo-image-picker` `launchCameraAsync`.
- **Choose from library** — `launchImageLibraryAsync`.

The library option is not an afterthought. The realistic capture moment is at the table, mid-conversation; the realistic logging moment is twenty minutes later. `expo-image-picker` is already a dependency (`~17.0.11`) and returns base64 directly, so no new capture dependency is needed. A hard pixel cap (longest edge 1024 px) keeps the image-token cost predictable — `quality` alone does not bound dimensions, so this needs either `expo-image-manipulator` added or an accepted variance in per-scan cost. Recommend adding the dependency; it is small and the cost predictability is worth it.

Camera permission is requested at first tap, never at app launch, consistent with the silent-by-default posture in NORTH_STAR §8.6. Denial falls through to the library option; denial of both falls through to the manual picker with a single non-nagging line.

### 1.3 The wait (about 1-3 seconds)

The result sheet opens **immediately on capture**, before the model returns. It is not a spinner over a dimmed screen.

- The captured photo appears at the top of the sheet at its final position and size (64 × 64 rounded thumbnail, left-aligned). It does not move when the result arrives.
- To its right, two skeleton lines (`VSkeleton`) occupy exactly the space the food name and portion line will occupy. Nothing reflows on arrival.
- One line of copy under them: "Reading the plate…". No percentage, no fake progress bar. We do not know how long it will take and pretending otherwise is the kind of small dishonesty this persona notices.
- No haptic during the wait. One `Haptics.impactAsync(Light)` when the result lands — feedback, not decoration (NORTH_STAR §8.7).
- At 12 seconds the copy changes to "This is taking longer than usual" and a "Enter it manually" button appears alongside. At 25 seconds the request is abandoned and the sheet transitions to the manual food picker with the sheet already scrolled to the food list. A hung network never becomes a dead end.

### 1.4 The result card

Top to bottom, inside the same `VBottomSheet`:

1. **Photo thumbnail** (64 × 64, `radii.md`) — proof the app looked at the right thing, and the fastest way for a user to notice they photographed the wrong plate.
2. **The guess, as the hero line.** Plain English, sentence case: "Chicken curry with rice". Not "Poultry, cooked, mixed dish". If the plate resolved to multiple items, this line names the plate ("Chicken curry with rice") and the items are itemised below it.
3. **Portion line**, secondary weight: "About 350 g — one plate". "About" is load-bearing; the number is tappable and opens a stepper. Grams are never presented as measured.
4. **Preparation / provenance note**, tertiary weight, one line: "Looks restaurant-made — estimated with a richer, oil-heavier base." This is the line that makes the number auditable. A user who disagrees with the carbon figure can see *why* it came out where it did, and disagree with the reason rather than with the app.
5. **The carbon estimate**, number-as-hero (`VCountUp`, `colors.food`, the treatment already used in the log sheet's preview): "≈ 2.4 kg CO₂e". When overall confidence is below the display threshold, a range chip sits beside it: "1.8 – 3.1 kg". The tilde and the range are not hedging for its own sake; they are the difference between an estimate the user can accept and a claim they can catch us being wrong about.
6. **"We also noticed"**, smallest text tier, muted: "≈ 640 kcal". Explicitly framed as an aside. This number is displayed and discarded — it is not stored on the entry, not summed anywhere, not shown on Today, Trends, or the Passport, and there is no daily calorie figure anywhere in the app. Veridian is not a nutrition tracker and must not accidentally become a bad one (§6).
7. **Alternative chips**, a horizontal row of 2-3: "Beef curry", "Lamb curry", "Vegetable curry", then a final visually-distinct chip: "Something else". Tapping an alternative swaps the guess in place, recomputes the number locally (no network call — see §4.2), and re-renders. Tapping "Something else" opens the manual picker.
8. **Primary action: "Log it".** Not "Confirm" — "confirm" presumes we were right and casts disagreement as a correction of the user. Secondary, text-only: "Discard".

On "Log it": the sheet plays the existing success ritual (`ParticleBurst`, `Haptics.notificationAsync(Success)`, 750 ms auto-close) and the entry or entries appear in Today's Log. Nothing new needs designing here; the ritual already exists and reusing it makes the photo path feel like the app rather than like a bolted-on feature.

### 1.5 Multi-item plates

When the model returns more than one item, the card itemises beneath the hero line:

```
Chicken thigh      140 g     0.78 kg
Rice               180 g     0.17 kg
Green beans         90 g     0.03 kg
```

Each row is independently tappable and carries its own alternative chips when expanded. The plate total is the sum — 0.98 kg here. (The rice figure is 180 g cooked reduced to 64 g dry before the factor is applied; see §3.3, without which it would read 0.48 kg.) Whether these become one entry or three is Open Question 3.

### 1.6 When the model finds nothing

If `foodItems` is empty or `overallConfidence` is 0, the card does not guess. It says so in one line — "I couldn't make out any food in that photo" — and offers two buttons: "Try another photo" and "Enter it manually". No fabricated fallback guess, ever. A confident wrong answer is more expensive than an admitted blank one.

---

## 2. The Claude vision prompt

### 2.1 The pattern being followed

`receipt-parse`'s `STRUCTURED_OUTPUT_PROMPT` (lines 92-111) established a shape worth copying exactly. Its discipline, in its own words: it opens by naming the task and demanding `ONLY valid JSON (no markdown, no code fences, no extra text)`; it then prints the literal JSON skeleton with inline `//` comments on the ambiguous fields; and it closes with a `Rules:` block whose first rule is a prohibition — `Do not invent items, prices, or a merchant name that is not actually present`. Two further properties are worth naming because they are what make it hold up in production:

- **Every rule that encodes a downstream convention explains the downstream consequence.** The `priceUsd` rule does not merely say "use the line total"; it works a numeric example and states that the emissions math would otherwise double the number. The model is told why, so it generalises correctly to cases the rule did not anticipate.
- **There is an explicit escape hatch for the null case.** `If the content is not a receipt at all, return items: [] and confidence: 0.` The model is given a way to say nothing rather than being cornered into inventing something.

Both properties matter more here than they did for receipts, because a receipt is text that either parses or does not, whereas a photograph always contains *something* the model could name.

### 2.2 The proposed prompt

Constant `PLATE_STRUCTURED_OUTPUT_PROMPT` in `supabase/functions/plate-scan/index.ts`, sent as the text block alongside the base64 image in the same `buildImageMessage`-shaped user turn:

```
You are identifying food in a photograph so that its carbon footprint can be
estimated. Look at the image and return ONLY valid JSON (no markdown, no code
fences, no extra text) matching exactly this shape:

{
  "foodItems": [
    {
      "label": string,               // plain English, as a person would say it
      "primaryIngredient": string,   // ONE dominant ingredient noun, lower case
      "estimatedGrams": number,      // edible mass as served, in grams
      "confidence": number,          // 0-1, your confidence in THIS item
      "top3Alternatives": [
        { "label": string, "primaryIngredient": string, "estimatedGrams": number }
      ]
    }
  ],
  "cuisineOrPreparationHint": string | null,
  "likelySource": "home-cooked" | "restaurant" | "packaged" | "unknown",
  "estimatedCalories": number | null,   // whole plate, secondary information
  "overallConfidence": number,          // 0-1
  "notes": string | null
}

Rules:
- Do not name food that is not visible in the photograph. If the image contains
  no food at all, return foodItems: [] and overallConfidence: 0. Returning
  nothing is always better than returning a guess you do not believe.
- Split the plate into SEPARATE items only where the components are visually
  distinct and would be weighed separately — protein, starch, vegetable, sauce.
  Do NOT decompose a homogeneous dish (a stew, a curry, a smoothie) into
  ingredients you cannot see. Return it as one item and describe its likely
  composition in cuisineOrPreparationHint instead.
- estimatedGrams is the AS-SERVED, cooked mass of the portion in this photo.
  It is not a dry or raw weight and not a package size. Scale from visible
  reference objects: a dinner plate rim is typically 26-28 cm, a fork is
  typically 19 cm, a standard drinks can is 66 mm across.
- primaryIngredient must be a single common ingredient noun in lower case
  ("chicken", "rice", "lentils", "salmon"). Prefer the most specific term the
  photo actually supports — "salmon" over "fish" only if you can see it is
  salmon. This field is matched against a fixed ingredient table downstream,
  so an invented or compound term resolves to nothing and the estimate falls
  back to a much coarser number. Plain and common beats clever and precise.
- top3Alternatives must contain 2 or 3 genuinely plausible DIFFERENT readings
  of the same item, ordered most to least likely, each different from `label`
  and from each other. These are shown to the user as one-tap corrections, so
  every entry must be something a real person might say and plausible enough
  to be worth a tap. Never pad the list to reach three. Two good alternatives
  are better than three where one is filler.
- cuisineOrPreparationHint: short free text naming cuisine and cooking method
  where the photo supports it ("north indian, cream-based curry", "deep-fried
  and breaded", "raw salad, undressed", "stir-fried in oil"). Null when
  genuinely unclear. Do not infer a cuisine from tableware or decor alone.
- likelySource: "restaurant" for restaurant or takeaway plating, disposable
  containers, or delivery packaging; "packaged" for visible branded packaging,
  wrappers, or ready-meal trays; "home-cooked" for domestic crockery, pans, or
  kitchen surfaces; "unknown" where there is no evidence either way. Do not
  default to "home-cooked" — "unknown" is a real and useful answer.
- estimatedCalories is secondary information for the whole plate, or null. It
  must never influence your identification of the food.
- confidence and overallConfidence are honest self-assessments, not politeness.
  Below 0.4 means "I would not be surprised to be wrong about what this is".
- notes: at most one short sentence naming the single biggest thing you are
  unsure about, or null. No advice, no nutrition commentary, no judgment about
  the food or the person eating it.
```

### 2.3 Why `cuisineOrPreparationHint` is the highest-value field

It is tempting to treat gram-weight precision as the accuracy problem. It is not, and the arithmetic says so plainly.

The DEFRA food factors in `supabase/seed.sql` span **two orders of magnitude**: potatoes 0.21 kg CO₂e/kg, vegetables 0.32, lentils 0.90, rice 2.66, chicken 5.54, pork 7.61, lamb 24.5, beef 27.0. Choosing lentils where the truth is lamb is a **27× error**. Meanwhile a portion estimate that is wrong by a third — 350 g called as 250 g, a large miss by eye — is a **1.4× error**.

`cuisineOrPreparationHint` is the field that decides *which factor row applies*, because the visible surface of a dish frequently does not. A brown curry in a bowl is visually compatible with lamb rogan josh (24.5), chicken tikka masala (5.54), and dal makhani (0.90). Nothing in the pixels separates them reliably; the cuisine and preparation context does — "north indian, cream-based, dark red" narrows very differently from "south indian, thin, yellow". The same is true of "deep-fried and breaded" (which implies an oil load the visible mass does not account for) and of "raw salad, undressed" (which excludes it).

`likelySource` does the same job one level up: a restaurant plate and a home plate of nominally the same dish differ in fat content, portion norm, and ingredient grade in ways that shift the answer more than a gram or two either way.

So the prompt spends its detail budget on composition, not on measurement. Portion estimation gets one rule with three physical reference objects; composition gets four rules. That allocation is deliberate and should survive prompt iteration.

---

## 3. Resolver logic

All of this runs server-side in `plate-scan/index.ts` and in a new pure module `lib/foodFactors.ts` (pure so it can be exhaustively tested without a network, the same discipline as `lib/receiptMatch.ts` and `lib/spendFactors.ts`).

### 3.1 Ingredient → factor row

New data file `data/food_keywords.json`, mirroring the shape of the existing `data/item_categories.json`:

```json
{
  "keywords": [
    { "keyword": "steak",   "subcategory": "beef" },
    { "keyword": "mince",   "subcategory": "beef" },
    { "keyword": "bacon",   "subcategory": "pork" },
    { "keyword": "prawn",   "subcategory": "prawns" },
    { "keyword": "paneer",  "subcategory": "cheese" },
    { "keyword": "dal",     "subcategory": "lentils" },
    { "keyword": "chapati", "subcategory": "bread" },
    { "keyword": "fries",   "subcategory": "potatoes" }
  ],
  "cookedWeightRatios": {
    "rice":    2.8,
    "pasta":   2.5,
    "lentils": 2.4,
    "beans":   2.5,
    "oats":    3.0
  }
}
```

The synonym list and the cooked-weight ratios are keyed differently on purpose. Synonyms map an incoming word to a subcategory; ratios are a property of the **resolved subcategory**, so they apply identically whether the item arrived as "rice" (a direct subcategory match, precedence step 1) or as "pilau" (a synonym, step 2). A ratio hung off the keyword row would silently not apply to the direct-match case, which is the common one.

Resolution precedence for each returned item, giving up rather than guessing at each step, exactly as `_shared/itemFactors.ts` does:

1. `primaryIngredient` matches an `emission_factors.subcategory` value directly (`chicken`, `rice`, `beef`, …). This is the common case and the reason the prompt insists on a single lower-case common noun.
2. `primaryIngredient` matches a `keyword` in `food_keywords.json` (synonyms, regional names, prepared forms).
3. The item's `label` text contains a subcategory name or a keyword, longest match first.
4. No textual match anywhere → the mixed-meal fallback (§3.4). Never a default ingredient.

### 3.2 Unit reconciliation

`estimatedGrams` is grams. The factor's `unit` is not always kg. The seed contains `kg`, `litre`, `bottle`, `pint`, and `measure`. The entry that gets written must have `quantity` expressed **in the factor's own unit**, because `useCreateEntry` computes `kg_co2e_total = calcEmission(factor.kg_co2e, quantity)` with no unit awareness at all.

- `unit = 'kg'` → `quantity = grams / 1000`.
- `unit = 'litre'` → `quantity = grams / 1000 / density`, with density from a small table (milk 1.03, oil 0.92). Documented as an approximation.
- `unit ∈ {'bottle', 'pint', 'measure'}` → **excluded from the photo path in v1.** A photographed pint is a counting problem, not a weighing problem, and forcing it through a gram estimate produces a number that looks precise and is not. If an item resolves to one of these, it is dropped from the plate and surfaced as a chip: "Also saw a beer — add it?" which opens the manual picker at that factor. This is a small amount of extra work that avoids a whole class of embarrassing numbers.

### 3.3 The cooked-vs-dry correction

This is the single largest systematic error a naive implementation will ship with, and it is worth stating plainly because it will not be visible in casual testing.

Several DEFRA rows in the seed are explicitly **dry weight**: `Rice (dry weight)` 2.66, `Pasta (dry)` 1.22, `Lentils (dry)` 0.90, `Beans (dried)` 0.82. The model returns as-served cooked mass, which for rice and pasta is roughly 2.5-3× the dry mass they were made from.

Applying the factor directly to cooked mass overstates a 200 g serving of rice as 0.53 kg CO₂e instead of roughly 0.19 kg — a **2.8× overcount on one of the most commonly photographed foods on earth**. Every plate with rice on it would be wrong in the same direction, which is exactly the kind of consistent bias a numerate user eventually notices and cannot un-notice.

The `cookedWeightRatios` map in `food_keywords.json` (§3.1) handles it: where the resolved subcategory has a ratio, `quantity = (grams / ratio) / 1000`; where it does not, the ratio is 1 and the mass passes through. The ratios must be sourced and cited in the file, and `lib/foodFactors.ts` must carry a test asserting the rice case specifically.

### 3.4 The mixed-meal fallback

When step 4 of §3.1 is reached, the item resolves against a coarse composite factor rather than being dropped. Three new rows, added via a seed migration alongside the existing DEFRA rows:

```sql
INSERT INTO emission_factors (category, subcategory, item, unit, kg_co2e, source, year) VALUES
('food', 'mixed_meal_plant', 'Mixed meal — plant-based (coarse estimate)', 'kg',  1.2000, 'DEFRA 2025 (Veridian derived basket)', 2025),
('food', 'mixed_meal_mixed', 'Mixed meal — mixed composition (coarse estimate)', 'kg', 3.5000, 'DEFRA 2025 (Veridian derived basket)', 2025),
('food', 'mixed_meal_meat',  'Mixed meal — meat-containing (coarse estimate)', 'kg',  6.5000, 'DEFRA 2025 (Veridian derived basket)', 2025);
```

Three rows rather than one, because the plant-to-meat spread is roughly 5×: a single all-purpose number would sit about 3× above a plant plate and about 2× below a meat plate, in every direction, forever. The choice between the three needs no ingredient identification at all — only whether the model named any meat or fish anywhere in the item's `label`, `cuisineOrPreparationHint`, or alternatives.

**The three values above are placeholders.** They must be replaced by a derivation the reviewer can check: a stated basket of the existing seed rows, stated mass weights, and the resulting weighted average, committed as a comment block in the migration and asserted by a test — the same standard `spendFactors.ts` is held to. Shipping an unsourced number into a product whose entire proposition is trustworthy numbers would be self-defeating.

Two consequences to handle:

- Fallback-resolved items carry a **hard confidence ceiling of 0.3**, the same low-confidence numeric convention `receipt-parse` uses (`p_confidence: 0.3`), and their card copy says so in plain words: "Estimated as a mixed meal — I couldn't identify the ingredients."
- These rows will otherwise appear in the manual food picker in `app/log.tsx`, where a user hand-picking "Mixed meal — coarse estimate" makes no sense. The `grouped` memo should filter subcategories prefixed `mixed_meal_`. A `hidden` boolean column on `emission_factors` would be cleaner but changes the `EmissionFactor` type and every consumer of it; the prefix filter is the proportionate v1 choice.

### 3.5 What `likelySource` does and does not do

It selects **which factor row and which composition assumption applies** (§2.3). It does **not** apply a numeric multiplier in v1.

There is an obvious temptation to multiply restaurant meals by, say, 1.3 for food-service overhead and waste. That number does not exist in the seed, is not in DEFRA's published factors, and inventing one would put an unsourced fudge factor directly into the number the user is asked to trust. Persona #1 is precisely the person who will eventually go looking for where a number came from. If a defensible food-service overhead factor can be sourced (WRAP and DEFRA's hospitality reporting are the places to look), it can be added later with a citation. Until then, no multiplier.

### 3.6 Writing the entry

Plate items become `emission_entries` rows **only on user confirmation** (§4.1), through the existing client path, not through a service-role write in the edge function.

- One entry per resolved item, `factor_id` from resolution, `quantity` in factor units per §3.2, so the ledger invariant `kg_co2e_total = calcEmission(factor.kg_co2e, quantity)` holds with no bespoke arithmetic path. The same `metadata.plate_scan_id` on each row lets the feed group them into one sentence, exactly as `receipt-parse` uses `metadata.receipt_id` and `item_count` today.
- `source: 'photo'` — a new value requiring the `CHECK` constraint on `emission_entries.source` to be widened (currently `('manual', 'sensor', 'transaction', 'receipt')`, migration `20260710000019_emission_entries_provenance.sql`) and `EntrySource` in `types/emission.ts` extended.
- `status: 'user_confirmed'` — the user tapped. There is no `pending` photo entry, because a photo entry that has not been confirmed is not an entry at all; it lives in `plate_scan_items` until it is.
- `confidence`: `min(0.6, item.confidence)`. The ceiling reflects that even a correctly identified food still has an estimated portion mass. If the user edits the grams by hand, the ceiling stays — they estimated too. If the user picks the factor *and* types the quantity through the manual fallback, the entry is indistinguishable from a manual entry and follows manual conventions (`source: 'manual'`, `confidence: null`).

Implementation note worth catching at review time: **do not loop `useCreateEntry` once per item.** It recomputes daily and weekly summaries, runs the achievement check, and fires a streak query on every call; a three-item plate would do all of that three times and could fire a streak notification mid-loop. The confirm path should be a new `useConfirmPlateScan` mutation that inserts the rows, then calls `upsertDailySummary` / `upsertWeeklySummary` once, then runs the achievement and streak checks once — reusing the same helpers, not duplicating the logic.

### 3.7 Idempotency and photo retention

Same discipline as `receipt-parse`, with one difference in intent.

`content_hash = sha256(imageBase64)`, computed and checked **before** the Anthropic call. For receipts, dedup prevents double-counting the same purchase. Here, identical bytes can only mean a retry or a double-tap — two genuinely identical meals produce two different photographs — so dedup is a pure double-submit guard. A hash hit returns the existing `plate_scans` row and its items without a second model call and without a second charge. Because nothing is written to `emission_entries` until confirmation, a dedup hit is entirely harmless.

**The photograph is never stored.** It is sent as base64 in the request body, forwarded to Anthropic, and discarded when the function returns. Nothing goes to Supabase Storage; only the hash persists. The thumbnail the user sees on the card is the local file URI on their own device and dies with the sheet. This matches the receipts posture in NORTH_STAR §6 (purge raw content after parse) and means "Veridian keeps photos of your meals" is never a true sentence. See Open Question 4 — there is a real product argument for the opposite choice, and it should be made deliberately rather than drifted into.

---

## 4. The trust and confidence UX

This is the section the feature lives or dies on.

`docs/DESIGN_RESEARCH.md` is explicit that Persona #1 — the paying core — "churns on a broken-trust moment (miscategorised transaction, wrong trip mode) far more than on price". A wrong food guess is a strictly worse version of that failure, for a reason specific to this category: **the user has direct sensory ground truth.** When the app miscategorises a bank transaction, the user is comparing our guess against a memory. When it says "beef curry" about the chicken they are actively chewing, they are comparing our guess against their mouth. There is no interpretive room, no benefit of the doubt, and no version of the story where we were arguably right.

The corresponding risk is not that the feature is inaccurate. It is that the feature is inaccurate *while appearing confident*, in a moment when the user cannot fail to notice. Everything below follows from that.

### 4.1 Photo entries never auto-commit. Ever.

Other auto-detected entries in this app do commit without asking. `receipt-parse` writes entries with `status: 'auto_confirmed'` through `claim_receipt_item_entry`. High-confidence detected trips auto-confirm. Both are defensible: a receipt is documentary evidence, and a trip the user does not remember taking is rare.

Snap-a-Plate does not get that latitude, **at any confidence level, including 1.0**. Every scan lands as a to-confirm card and creates nothing until a tap.

The reasoning is not "the model might be wrong" — it is that the cost function is asymmetric. The cost of asking for a tap on a correct guess is one tap on a card the user is already looking at, on a screen they deliberately opened, with the phone in their hand. The cost of silently committing a wrong guess is a user discovering, later, that their ledger contains a meal they did not eat, and correctly concluding that the number at the top of the Home screen is fiction. One of those is an interaction. The other is the churn event.

This should be written into the code as a comment at the write path, not left as a convention, because "we should auto-confirm above 0.9 to reduce friction" is a suggestion that will absolutely be made again in six months by someone reading a funnel chart.

### 4.2 Alternatives are precomputed in the same call

`top3Alternatives` comes back inside the original `plate-scan` response, per item, in one model call. Correcting a wrong guess costs **one tap and zero milliseconds of network time.**

This is not a cost optimisation, though it is cheaper. It is the whole correction experience. The moment a user sees a wrong guess is the moment their trust is most fragile; making them wait a second and a half for the app to think again about a question they already know the answer to converts a recoverable miss into an irritating one. Chips must be instant, and the only way to make them instant is to have them already in memory.

Because the alternatives arrive with their own `estimatedGrams` and `primaryIngredient`, tapping one re-runs the resolver **client-side** against the already-loaded `emission_factors` (`useAllEmissionFactors` is already mounted on this screen) and the number updates in place with the existing `VCountUp` animation. No round trip. `lib/foodFactors.ts` being a pure module is what makes this possible — the same resolution code runs in the function and on the device.

Consequence for the prompt: the alternatives have to be genuinely plausible, which is why that rule in §2.2 explicitly forbids padding to three. A filler third chip is worse than two chips, because it teaches the user that the chips are decoration.

### 4.3 "Something else" falls through to the existing picker

The final chip in the row is "Something else". It closes the plate card and returns the user to `app/log.tsx` with `activeCategory` set to `'food'`, the search field pre-filled with the model's `label`, and the food factor list showing — the exact picker that exists today, unchanged.

This path is permanent and load-bearing, not a v1 stopgap. It should never be framed apologetically in the UI, never buried behind a "more options" disclosure, and never removed if usage of it drops. It is the app's promise that the photo feature is a shortcut around the manual path and not a replacement for it, and that a user who cannot get a good result from the camera is never stuck. The picker is dignified: it is fast, it is searchable, it is the same tool the app has always offered. A user who ends up there has not failed and should not be made to feel they have.

Pre-filling the search with the model's guess is a small thing that matters: if the model said "beef curry" and the truth is lamb, the user is one word away, not one full search away.

### 4.4 Log every verdict from day one

New table, written on every resolution of a plate card:

```sql
CREATE TABLE plate_scan_verdicts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id               UUID NOT NULL REFERENCES plate_scans(id) ON DELETE CASCADE,
  item_index            INT  NOT NULL,

  -- what the model said
  model                 TEXT NOT NULL,          -- e.g. 'claude-haiku-4-5-20251001'
  prompt_version        TEXT NOT NULL,          -- bumped on every prompt edit
  guessed_label         TEXT NOT NULL,
  guessed_ingredient    TEXT NOT NULL,
  guessed_grams         NUMERIC(8,1) NOT NULL,
  guessed_factor_id     UUID REFERENCES emission_factors(id),
  guessed_confidence    NUMERIC(3,2) NOT NULL,
  guessed_source        TEXT,                   -- likelySource
  guessed_hint          TEXT,                   -- cuisineOrPreparationHint
  alternatives          JSONB,                  -- the top3Alternatives as offered

  -- what the user did
  verdict               TEXT NOT NULL CHECK (verdict IN
                          ('accepted', 'chose_alternative', 'manual_search', 'discarded')),
  chosen_factor_id      UUID REFERENCES emission_factors(id),
  chosen_grams          NUMERIC(8,1),
  chosen_alt_index      INT,                    -- which chip, when applicable

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Named **verdicts**, not **corrections**, deliberately: a table that only records corrections gives you a numerator with no denominator and cannot answer "how often are we right?" — which is the only question that matters. `accepted` rows are the most valuable rows in the table.

No personalisation or learning loop is being built (§6). This is data collection only, and it exists now because the day this feature has an accuracy problem, the difference between having six months of labelled verdicts and having none is the difference between a week of work and a quarter of it. `prompt_version` and `model` are on the row so that a prompt edit or a model swap is measurable rather than merely hoped about.

Privacy note: these rows contain food descriptions, not photographs, and are subject to the same RLS-read-own / service-role-write policy as `receipts`. Worth an explicit line in the privacy policy before ship.

### 4.5 Confidence in the interface

- Above the display threshold: a single figure, "≈ 2.4 kg CO₂e".
- Below it: a range, "1.8 – 3.1 kg", derived from the spread of the item's own alternatives rather than from an invented error bar — if the plausible readings are chicken and lamb, the honest range *is* that wide, and showing it is more useful than picking a midpoint.
- Fallback-resolved (mixed meal): the range plus the plain-words explanation from §3.4.
- Copy never moralises and never celebrates. "Beef is high" is a fact the number already conveys; saying it out loud is the moralising register Persona #1 is explicitly repelled by.

What confidence value, if any, should suppress the guess entirely is Open Question 2.

---

## 5. Cost

### 5.1 Per-scan estimate, Haiku 4.5

`receipt-parse` states the rate it assumes in a comment at the usage-logging site: Haiku 4.5 at **$1 / $5 per million tokens** (input / output), used there to compute `estCostUsd` and to justify a stated target of roughly $0.004 per receipt.

Applying the same rates to a plate scan:

| Component | Tokens | Rate | Cost |
|---|---|---|---|
| Image, 1024 × 768, at approximately (w × h) / 750 | ~1,050 | $1/Mtok | $0.0011 |
| Prompt text (§2.2) | ~750 | $1/Mtok | $0.0008 |
| JSON output, 2-3 items each with 3 alternatives | ~600 | $5/Mtok | $0.0030 |
| **Total per scan** | | | **≈ $0.005** |

Half a cent, in the same band as a receipt parse — which makes sense, since it is the same model doing a similarly sized job. At an assumed 1.5 scans per active day, that is roughly **$0.22 per user per month**. Against a subscription in the range NORTH_STAR §9 contemplates, this is not a material line item.

The image dimension cap matters: image tokens scale with area, so an uncapped 4032 × 3024 phone photo would be roughly 16,000 tokens and push the scan to about $0.020. This is the concrete reason for the 1024 px cap in §1.2.

### 5.2 Is Haiku strong enough? Unknown, and it should stay unknown until measured

Sonnet 4.5, at publicly listed rates of $3 / $15 per million tokens, would put the same scan at roughly **$0.014** — about 3× Haiku, or roughly $0.65 per user per month at the same usage. Both figures are comfortably affordable. (Both rates should be re-verified against current pricing at implementation time rather than trusted from this document.)

**Cost is therefore not the deciding variable. Accuracy is, and this spec does not know the answer.** Haiku 4.5 handles receipt images well in production today, but reading printed text off a receipt and identifying a cooked dish and estimating its mass are different visual tasks, and success at the first says very little about the second. Asserting either "Haiku is fine" or "we'll need Sonnet" here would be a confident guess dressed as a finding, which is the exact failure mode this feature is supposed to avoid.

**Proposed gate: a small eval before any UI work begins.**

- **Set:** 100 photographs. Sourced from the team's own meals plus a public food-image dataset, deliberately weighted toward hard cases — mixed curries, wrapped items, poor lighting, restaurant plating, homogeneous dishes. Hand-labelled with ground-truth primary ingredient, and with weighed grams for the subset where weighing is practical.
- **Run:** the §2.2 prompt against Haiku 4.5 and Sonnet 4.5, unchanged, same images.
- **Metrics, in priority order:**
  1. **Top-3-inclusive accuracy** — is the correct ingredient present in `label` *or* in `top3Alternatives`? This is the metric that matters most, because the correction UX only requires the right answer to be one tap away, not first.
  2. **Top-1 accuracy** — how often is the primary guess right.
  3. **False-confidence rate** — how often is the guess wrong at `confidence > 0.7`. This is the churn metric from §4; it should be weighted more heavily than raw accuracy when choosing between models.
  4. Gram MAPE, on the weighed subset.
  5. `likelySource` accuracy.
- **Decision:** Haiku ships if it clears the bar; Sonnet ships if the gap is material; if neither clears it, the feature does not ship and that is a legitimate outcome. A version of this that is right 60% of the time is worse for the business than no version at all, because the manual picker already works and never lies.

The bar itself is a product decision — Open Question 5.

An intermediate option worth keeping in view but not building in v1: Haiku by default, escalating to Sonnet only when Haiku returns `overallConfidence` below some threshold. It roughly doubles the code paths for a fraction of the cost saving and should not be built before the eval shows it is needed.

---

## 6. Explicitly out of scope for v1

Each of these is a deliberate exclusion, not an oversight.

- **No barcode or label scanning.** A packaged item photographed with a visible barcode is a different problem with a different solution (a product database lookup, not a vision model). `likelySource: "packaged"` is captured in the data so the demand is measurable, but v1 routes packaged items through the same ingredient resolver or the mixed-meal fallback.
- **No nutrition tracking, and no drift toward it.** The calorie figure is displayed once on the result card as an aside and is not stored, not summed, not trended, and not shown anywhere else in the app. Veridian does not compete with MyFitnessPal, Whoop, or Oura on nutrition, and a half-built calorie tracker inside a carbon app would be both worse than the dedicated tools and off-message. The moment there is a daily calorie total on any screen, this line has been crossed.
- **No personalisation or learning loop.** Nothing adapts to the individual user: no "you usually have oat milk", no per-user priors, no fine-tuning, no retrieval over past scans. `plate_scan_verdicts` (§4.4) collects the data that a future loop would need, and that is the entire extent of it in v1.
- **No multi-photo or video capture.** One still image per scan. No before-and-after, no plate-plus-packaging pairs, no burst. Multi-image would multiply the image-token cost and complicate the prompt for an accuracy gain nobody has demonstrated.
- **No editing of a logged plate as a plate.** Once confirmed, the resulting rows are ordinary `emission_entries` and are edited or deleted through the existing per-entry paths (`SwipeableEntryRow`, `app/entry/[id].tsx`). There is no plate-level edit screen.
- **No sharing of plate photos.** The photo never leaves the device except to the model, and never appears in the Carbon Passport or any share artifact.

---

## 7. Open questions for the product owner

Five decisions needed before implementation starts.

**1. Is the camera affordance persistent, or conditional on the Food category?**
A persistent leading card in the one-tap row gives the feature permanent discoverability, at the cost of a permanently occupied slot on the app's most valuable rail — a slot otherwise held by a frequency-derived quick slot the user actually uses daily. Showing it only when Food is selected costs nothing but hides it from the exact user who would benefit most: the one who has not yet realised there is an alternative to typing. Recommendation leans persistent for the first release with a usage review at 60 days, but this is a judgement about the Log screen's information budget, not an engineering call.

**2. What confidence threshold, if any, suppresses the guess entirely?**
Two coherent positions. (a) Always show something, flagged low-confidence with a wide range — the user can always correct, and a bad starting point still beats a blank field. (b) Below some `overallConfidence` floor, skip the guess and go straight to the manual picker with the search pre-filled — on the argument from §4 that a visibly-wrong card is the specific thing that breaks trust, and that a card the user has to fix is worse than a picker they expected. This choice determines what the feature *feels* like more than any other single number in this spec.

**3. Does a multi-item plate become one entry or several?**
Several (one per ingredient) is the honest ledger shape, matches how receipts already work, and is the only version where Trends and Top Moves can say anything useful about beef versus chicken. One rolled-up "meal" entry keeps the Today feed calm and matches how a person thinks about lunch. The feed can group several entries into one visual row via `metadata.plate_scan_id`, which softens the argument for rolling up — but not for free. This affects data model, feed rendering, and every downstream aggregate.

**4. Is the photo really discarded, or stored?**
§3.7 proposes discarding it, which makes the strongest possible privacy claim and costs nothing to run. The counter-argument is a genuine product one: a stored thumbnail on the entry detail screen turns the ledger into a visual food diary, which is a more emotionally sticky artifact than a list of ingredient names and would sit naturally in the Carbon Passport. That version requires a Storage bucket, a retention policy, a privacy-policy revision, and an explicit user-facing opt-in. Worth deciding on purpose now rather than discovering the decision was already made.

**5. What accuracy bar must the eval clear, and who signs off?**
§5.2 proposes the metrics but deliberately does not set the numbers. Concretely: what top-3-inclusive accuracy is the minimum to ship (80%? 90%?), what false-confidence rate is unacceptable, and who looks at the eval output and says yes or no. Without an agreed bar set *before* the numbers come back, the bar will be set by whatever the numbers turn out to be — which is how features that should not ship, ship.

---

## Appendix — files touched

New:

- `supabase/functions/plate-scan/index.ts`
- `supabase/functions/_shared/hash.ts` (lifted from `receipt-parse`'s inlined `sha256Hex`, imported by both)
- `lib/foodFactors.ts` (pure resolver, exhaustively tested)
- `data/food_keywords.json`
- `hooks/usePlateScan.ts`, `hooks/useConfirmPlateScan.ts`
- `components/ui/VPlateCard.tsx`
- `supabase/migrations/<ts>_create_plate_scans.sql` (`plate_scans`, `plate_scan_items`, `plate_scan_verdicts`)
- `supabase/migrations/<ts>_seed_mixed_meal_factors.sql`
- `supabase/migrations/<ts>_emission_entries_photo_source.sql` (widen the `source` CHECK)

Modified:

- `app/log.tsx` — leading capture card, in-search camera button, "Something else" return path
- `types/emission.ts` — `EntrySource` gains `'photo'`
- `supabase/functions/receipt-parse/index.ts` — import `sha256Hex` from `_shared/hash.ts` instead of defining it
- `package.json` — `expo-image-manipulator` (pixel cap)
- `docs/privacy-policy.html` — photo handling and verdict logging
