# Sprint E — Receipts Precision Layer + Ambient Presence (Executable Spec)

*Authored by the Fable orchestrator (July 2026) as a banked blueprint — same execution pattern as
SPRINT_D_SPEC.md (staged agents → gate → adversarial review → human walkthrough). Read NORTH_STAR §6 and §8
first; vendor and architecture decisions there are final. Sprint E has TWO independent halves — Receipts
(no gates, fully free) and Ambient (gated on a paid Apple Developer account). Ship Receipts first; Ambient
whenever the $99 decision lands. The Carbon Passport belongs to Ambient's stage list but has no paid gate.*

## Half 1 — Receipts (item-level precision, $0 infra at small scale)

### Goal / exit criteria
A user forwards (or shares) an Amazon/Uber/DoorDash order confirmation and it becomes precise line-item
emissions that **supersede** the matching coarse spend estimate from Sprint D. Gmail API / CASA is
explicitly rejected (NORTH_STAR §6) — do not revisit.

### Stage R1 — Inbound email channel
- Vendor: pick at execution time by checking current free-tier inbound-parse allowances (Postmark inbound,
  Mailgun routes, SendGrid Inbound Parse — decision criteria: free volume ≥100/mo, JSON webhook, spam
  filtering; record the choice + pricing snapshot in the PR description). MX on a subdomain
  (in.veridian.app or similar the human must configure at their DNS host — human prerequisite).
- Addressing: per-user alias `u_<shortid>@in.veridian.app` (shortid stored on profiles; generated lazily,
  shown in Profile → "Email receipts here" with copy button + a one-time setup explainer for auto-forward
  rules per mail provider).
- `supabase/functions/receipt-inbound` — webhook: verify vendor signature, resolve alias → user, store raw
  in a `receipts_raw` table (RLS none/service-only; retention: purge raw body after successful parse — the
  privacy posture in NORTH_STAR §6 is load-bearing), enqueue parse.

### Stage R2 — Parsing (Claude Haiku via edge function)
- `supabase/functions/receipt-parse`: Haiku 4.5 (ANTHROPIC_API_KEY in function secrets), structured-output
  prompt → {merchant, orderDate, currency, items: [{name, qty, priceUsd, categoryGuess}], totalUsd,
  confidence}. Text-first (email HTML→text); image support (shared screenshots) via the vision path.
  Budget note: ~$0.004/receipt — log token usage per parse for cost visibility.
- `receipt_items` table: user_id, receipt_id, name, qty, price_usd, category, kg_co2e, factor_ref,
  entry_id. Item→factor mapping reuses lib/spendFactors.ts NAICS engine at item granularity, with a small
  keyword→category table for common product types (data/item_categories.json, tested).
- **Supersede rule** (the visible magic): match receipt total against bank_transactions (amount ±5%,
  date ±3 days, merchant fuzzy) → mark transaction superseded_by=receipt_id, delete/replace its coarse
  entry with the item-level entries (source 'receipt', confidence higher), recompute summaries for the
  affected date. Idempotent; a receipt parsed twice must not double anything (unique on receipt content
  hash). Pure matching logic in lib/receiptMatch.ts with exhaustive tests — this is the adversarial
  reviewer's #1 target.

### Stage R3 — Share extension + manual imports
- `expo-share-intent` config plugin (pre-approved new dependency; requires dev-client rebuild — remember
  the ios/ persistence lesson: run prebuild-affecting steps deliberately and verify Info.plist changes
  actually land). Shared text/screenshot → `app/import.tsx` → same parse pipeline (client calls
  receipt-parse with the payload).
- One-time backfills: `app/import.tsx` also accepts Amazon Privacy-Center zip (Retail.OrderHistory CSV
  inside) and DoorDash export zip via expo-document-picker (already-installed? verify; if not, it is the
  one additional pre-approved dep). Parse client-side (CSV, no LLM needed), entries created with
  loggedAt = order date (backfill works — Sprint A's summary-date fix and Sprint C's Earlier-this-week
  section were built for exactly this).

### Stage R4 — Feed/UX integration
- Receipt-derived entries: distinct glyph, merchant + item count sentence in feedCopy ("Amazon order —
  3 items · 6.1 kg est."), tappable → entry detail listing items.
- The supersede moment must be visible: when a receipt upgrades a transaction estimate, the feed row
  animates its chip from "~4.2 kg est." to the refined number (this is the accuracy-ladder promise made
  in NORTH_STAR §3 — treat it as a first-class design beat, not a silent data swap).

## Half 2 — Ambient presence (GATED: paid Apple Developer account, $99/yr)

**Do not start until the human confirms the paid account exists** (App Groups + widget/Live Activity
entitlements are unavailable on free personal teams — verified in Sprint B research).

### Stage A1 — Shared plumbing
- `@bacons/apple-targets` (pre-approved dep; the previously-standard expo-live-activity was archived
  June 2026 — do not use it). One App Group shared by both targets; RN side writes today's
  {ringKg, budgetKg, trend7d} to the group on every summary change.

### Stage A2 — Widgets
- Small: today's ring + number. Medium: 7-day trend. SwiftUI, reading the App Group; timeline reload
  triggered from RN on data change. Palette/typography must match lib/theme.ts tokens exactly.

### Stage A3 — Trip Live Activity
- Started when detectActiveTrip flips isInMotion (already exposed by useTrips): Lock Screen live
  distance + accruing CO₂; Dynamic Island compact ring. Ended on trip close. Flighty's reduction is the
  reference bar (NORTH_STAR §8 pattern 10).

### Stage A4 — Carbon Passport (NO paid gate — pure RN; can ship with Half 1)
- Monthly/annual auto-generated story (reuse the Weekly Recap engine from Sprint C at month/year scale):
  totals, trend, top wins, mode split, "N trips tracked themselves". Final page = the shareable artifact —
  per Flighty's founder this class of artifact was a top-3 organic growth driver; it IS the growth loop
  (NORTH_STAR §2/§8). Design investment here should exceed every other screen in the app.

## Verification
Sprint A–C pattern per half. Receipts adversarial focus: supersede idempotency/double-count, alias abuse
(someone else emailing a user's alias — signature + sender heuristics + everything lands needs_confirmation
when sender is unrecognized), raw-body retention/purge, currency≠USD handling. Ambient focus: App Group
data staleness, widget timeline budget, Live Activity lifecycle leaks. Human walkthroughs scripted at the
end of each half.

## Explicitly out of scope
Gmail OAuth/CASA (rejected), Android widgets (later), watch complication (deferred per NORTH_STAR §8),
Uber API (none exists for consumers — email/share path only).
