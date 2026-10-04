/**
 * supabase/functions/receipt-parse/index.ts — receipt parsing + supersede
 * engine (Sprint E Stage R2).
 *
 * SCOPE NOTE (authorized deviation, see task header): only the 'share' and
 * 'import' ingestion channels exist here — Stage R1's inbound-email channel
 * (u_<id>@in.veridian.app) is deferred, no domain configured yet. The
 * receipts schema (migration 20260718000025) is deliberately
 * channel-agnostic so an email channel can add a third `source` value later
 * without a schema rewrite.
 *
 * Auth pattern mirrors plaid-sync-now / plaid-items: verifyUser() (network
 * round-trip against Supabase Auth, not a locally-decoded JWT) gates
 * everything; all writes happen via the service-role client so the
 * Anthropic API key and any cross-user data never reach the caller's role.
 *
 * IDEMPOTENCY: content_hash = SHA-256 of the raw request content (the exact
 * bytes Haiku would otherwise be asked to parse again). It is checked BEFORE
 * calling Haiku or performing any insert — a repeat call with the same
 * content_hash short-circuits straight to the existing receipts row (plus
 * its already-parsed receipt_items), so parsing the same receipt twice can
 * never create a second receipts row, a second set of receipt_items, or a
 * second set of emission_entries. This is provable from the code: the only
 * INSERT into `receipts` is reached from the branch that runs exactly when
 * the SELECT by (user_id, content_hash) (UNIQUE per user, migration
 * 20261004000029) found nothing, and every
 * receipt_items -> emission_entries link goes through the
 * claim_receipt_item_entry RPC, which additionally guards against a
 * *concurrent* duplicate call racing past the content_hash check (see that
 * migration's doc comment) by locking the receipt_items row before ever
 * inserting an emission_entries row.
 *
 * Stage R3 ADDITION: `preParsed` lets a caller supply an already-structured
 * HaikuReceiptResult-shaped payload (used by the Amazon/DoorDash CSV
 * backfill importers, lib/importParsers.ts) and skip the Haiku call
 * entirely — those files are already structured data with nothing to
 * extract, so paying for an LLM call would be pure waste. Every other step
 * (idempotency hash, item-factor resolution, supersede-matching, atomic
 * claim) is identical regardless of which path produced `parsed`.
 */
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authUser.ts';
import { resolveItemFactor, getFactorMeta } from '../_shared/itemFactors.ts';
import { upsertDailySummary, upsertWeeklySummary, getISOWeekStart } from '../_shared/emissions.ts';
import {
  matchReceiptToTransaction,
  type CandidateTransaction,
  type ReceiptForMatching,
} from '../../../lib/receiptMatch.ts';
import { isSupportedCurrency, checkItemBounds } from '../../../lib/receiptValidation.ts';

// ─── Request/response shapes ────────────────────────────────────────────────

interface HaikuItem {
  name: string;
  qty: number;
  priceUsd: number;
  categoryGuess: string | null;
}
interface HaikuReceiptResult {
  merchant: string | null;
  orderDate: string | null; // "YYYY-MM-DD"
  currency: string;
  items: HaikuItem[];
  totalUsd: number | null;
  confidence: number;
}

interface ParseRequestBody {
  content?: string;
  imageBase64?: string;
  /** Stage R3: pre-structured result (CSV backfill importers) — skips Haiku. */
  preParsed?: HaikuReceiptResult;
  source: 'share' | 'import';
}

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'; // Haiku 4.5, per spec's cost target (~$0.004/receipt)

// ─── Content hashing ─────────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Haiku prompt ────────────────────────────────────────────────────────────

const STRUCTURED_OUTPUT_PROMPT = `You are extracting structured data from a purchase receipt. Read the receipt content below and return ONLY valid JSON (no markdown, no code fences, no extra text) matching exactly this shape:

{
  "merchant": string | null,
  "orderDate": string | null,   // "YYYY-MM-DD", null if not determinable
  "currency": string,           // ISO 4217, default "USD" if not stated
  "items": [
    { "name": string, "qty": number, "priceUsd": number, "categoryGuess": string | null }
  ],
  "totalUsd": number | null,
  "confidence": number          // 0-1, your confidence in this extraction
}

Rules:
- Do not invent items, prices, or a merchant name that is not actually present in the receipt content.
- qty defaults to 1 if not stated.
- priceUsd must be the LINE TOTAL for this item (unit price x quantity), NOT a per-unit price. For example, if a receipt shows "2 x Widget @ $5.00 = $10.00", priceUsd must be 10.00, not 5.00. This matches the convention the app's other ingestion paths (CSV import) already use, so downstream emissions math never multiplies by qty again — doing so here would double it.
- categoryGuess should be a short, plain-English product category (e.g. "coffee", "clothing", "electronics"), not a store department code.
- If the content is not a receipt at all, return items: [] and confidence: 0.
- totalUsd should be the receipt's final charged total if stated, else null (do not sum items yourself if a total is not printed).`;

function buildTextMessage(content: string) {
  return [{ role: 'user' as const, content: `${STRUCTURED_OUTPUT_PROMPT}\n\nReceipt content:\n${content}` }];
}
function buildImageMessage(imageBase64: string) {
  return [
    {
      role: 'user' as const,
      content: [
        { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: imageBase64 } },
        { type: 'text' as const, text: STRUCTURED_OUTPUT_PROMPT },
      ],
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, errorResponse } = await verifyUser(req);
    if (errorResponse) return errorResponse;

    const body = (await req.json()) as ParseRequestBody;
    if (body.source !== 'share' && body.source !== 'import') {
      return new Response(JSON.stringify({ error: "source must be 'share' or 'import'" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!body.content && !body.imageBase64 && !body.preParsed) {
      return new Response(JSON.stringify({ error: 'content, imageBase64, or preParsed is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Idempotency check: hash the raw content BEFORE calling Haiku or
    // writing anything. A second parse of identical content short-circuits
    // here, returning the existing receipt + its items untouched. For
    // preParsed input there is no "raw content" — hash its JSON form instead,
    // so re-importing the same CSV row twice is still a no-op.
    const rawForHash = body.preParsed ? JSON.stringify(body.preParsed) : body.content ?? body.imageBase64!;
    const contentHash = await sha256Hex(rawForHash);

    const { data: existingReceipt, error: existingErr } = await admin
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .eq('content_hash', contentHash)
      .maybeSingle();
    if (existingErr) throw existingErr;

    if (existingReceipt) {
      console.log(`receipt-parse: content_hash ${contentHash} already parsed (receipt ${existingReceipt.id}) — returning existing row, skipping Haiku call and all writes`);
      const { data: items, error: itemsErr } = await admin
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', existingReceipt.id);
      if (itemsErr) throw itemsErr;
      return new Response(JSON.stringify({ receipt: existingReceipt, items: items ?? [], deduped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: HaikuReceiptResult;
    if (body.preParsed) {
      // Stage R3 CSV backfill path — already structured, no Haiku call.
      console.log(`receipt-parse: preParsed input (source=${body.source}) — skipping Haiku call`);
      parsed = body.preParsed;
    } else {
    // ── Call Haiku for structured extraction.
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const messages = body.imageBase64 ? buildImageMessage(body.imageBase64) : buildTextMessage(body.content!);
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1536,
      messages,
    });

    // Cost/usage visibility per spec — Haiku 4.5 pricing as of this writing
    // is $1/$5 per Mtok (input/output); logged as an estimate, not billed truth.
    const inputTokens = message.usage?.input_tokens ?? 0;
    const outputTokens = message.usage?.output_tokens ?? 0;
    const estCostUsd = (inputTokens / 1_000_000) * 1 + (outputTokens / 1_000_000) * 5;
    console.log(
      `receipt-parse: Haiku usage — input_tokens=${inputTokens} output_tokens=${outputTokens} est_cost_usd=${estCostUsd.toFixed(6)}`
    );

    const rawText = (message.content[0] as { type: string; text: string }).text
      .replace(/^```json\s*|```\s*$/g, '')
      .trim();
    try {
      parsed = JSON.parse(rawText) as HaikuReceiptResult;
    } catch (parseErr) {
      // Failed extraction: still record the receipt row (parse_status
      // 'failed') so the caller has something to show/retry against, rather
      // than silently dropping the attempt.
      const { data: failedReceipt, error: insertErr } = await admin
        .from('receipts')
        .insert({
          user_id: user.id,
          source: body.source,
          content_hash: contentHash,
          parse_status: 'failed',
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      return new Response(
        JSON.stringify({ receipt: failedReceipt, items: [], error: `Haiku output was not valid JSON: ${(parseErr as Error).message}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    } // end preParsed-vs-Haiku branch

    // ── CURRENCY GATE (adversarial-review Fix 1): a non-USD receipt must
    // never be priced/computed as if it were USD — that would silently
    // under/overcount emissions by the FX gap. This MUST be decided before
    // any factor resolution or supersede-matching happens, since
    // bank_transactions.amount_usd is always USD and is therefore not
    // comparable to a non-USD receipt total at all.
    const currencySupported = isSupportedCurrency(parsed.currency);

    // ── Insert the receipts row (service-role — no client write path exists).
    // parse_status/notes distinguish "Haiku output wasn't usable JSON"
    // ('failed', handled earlier) from "we understood the receipt fine but
    // can't process its currency yet" ('unsupported_currency') — see
    // migration 20260718000027 for the schema rationale.
    const { data: receipt, error: receiptInsertErr } = await admin
      .from('receipts')
      .insert({
        user_id: user.id,
        source: body.source,
        content_hash: contentHash,
        merchant: parsed.merchant,
        order_date: parsed.orderDate,
        currency: parsed.currency || 'USD',
        total_usd: parsed.totalUsd,
        parse_status: !currencySupported
          ? 'unsupported_currency'
          : parsed.items.length > 0
            ? 'parsed'
            : 'failed',
        notes: !currencySupported
          ? `Receipt currency "${parsed.currency}" is not USD — no FX conversion is implemented yet, so item prices/emissions were not computed. The receipt and its items are still recorded for visibility.`
          : null,
      })
      .select()
      .single();
    if (receiptInsertErr) throw receiptInsertErr;

    // ── STEP 1 (Fix 2 ordering): bounds-check + resolve a factor for every
    // item and build the receipt_items insert payload, but do NOT touch
    // bank_transactions/emission_entries yet. This must happen fully before
    // any supersede/delete so that a bad item (negative price, absurd qty)
    // can never abort the request AFTER an existing correct entry has
    // already been destroyed with nothing to replace it.
    const insertedItems: Array<Record<string, unknown>> = [];
    for (const item of parsed.items) {
      if (!currencySupported) {
        // Non-USD: never fabricate a USD price or a kg_co2e number out of a
        // foreign-currency amount. Still record the item (name/qty/category)
        // so the user sees what was on the receipt, with price_usd/kg_co2e
        // left NULL (receipt_items.price_usd was made nullable in migration
        // 20260718000027 for exactly this case).
        const bounds = checkItemBounds({ name: item.name, qty: item.qty ?? 1, priceUsd: 0 });
        insertedItems.push({
          receipt_id: receipt.id,
          user_id: user.id,
          name: item.name,
          qty: bounds.qty,
          price_usd: null,
          category_guess: item.categoryGuess,
          kg_co2e: null,
          factor_ref: null,
        });
        continue;
      }

      // Bounds validation BEFORE any DB write (Fix 2): reject a negative
      // priceUsd outright (e.g. a "-$5.00 coupon" line — realistic ordinary
      // receipt content, not just adversarial input) rather than writing a
      // negative value anywhere; clamp an absurd qty rather than rejecting
      // the whole item.
      const bounds = checkItemBounds({ name: item.name, qty: item.qty ?? 1, priceUsd: item.priceUsd });
      if (bounds.skip) {
        console.warn(`receipt-parse: skipping item — ${bounds.reason}`);
        continue;
      }
      if (bounds.qtyClamped) {
        console.warn(`receipt-parse: ${bounds.reason}`);
      }

      const resolution = resolveItemFactor(item.name, item.categoryGuess);
      let kgCo2e: number | null = null;
      let factorRef: string | null = null;
      if (resolution) {
        const meta = getFactorMeta(resolution.naicsCode);
        if (meta) {
          // Same CPI-deflator convention as spendFactors.ts: raw 2022-USD
          // factor applied to nominal price. Item-level receipts have no
          // separate CPI concern documented in the spec beyond what
          // spendFactors.ts already applies at the transaction level, so we
          // apply the factor directly to priceUsd (receipts are near-term,
          // not multi-year-old transactions, so no deflator is applied here
          // — consistent with treating price_usd as already-current USD).
          //
          // Fix 3 (qty convention): priceUsd is defined (Haiku prompt above,
          // and lib/importParsers.ts's pre-multiplication of unitPrice*qty)
          // to already be the LINE TOTAL, not a per-unit price — so it is
          // NOT multiplied by qty again here. Doing so would double-count
          // whenever priceUsd already reflects the full line. qty is stored
          // on the row for display only; it plays no further part in this
          // kg calculation.
          kgCo2e = Math.round(item.priceUsd * meta.kgCo2ePerUsd2022 * 1e4) / 1e4;
          factorRef = resolution.factorRef;
        }
      }
      insertedItems.push({
        receipt_id: receipt.id,
        user_id: user.id,
        name: item.name,
        qty: bounds.qty,
        price_usd: item.priceUsd,
        category_guess: item.categoryGuess,
        kg_co2e: kgCo2e,
        factor_ref: factorRef,
      });
    }

    let insertedItemRows: Array<{ id: string; kg_co2e: number | null; factor_ref: string | null; name: string }> = [];
    if (insertedItems.length > 0) {
      const { data: itemRows, error: itemsInsertErr } = await admin
        .from('receipt_items')
        .insert(insertedItems)
        .select();
      if (itemsInsertErr) throw itemsInsertErr;
      insertedItemRows = itemRows as typeof insertedItemRows;
    }

    // ── STEP 2 (Fix 2 ordering): only now, with every item's factor already
    // resolved and its receipt_items row already written, decide whether to
    // touch bank_transactions at all. If currency isn't supported, or zero
    // items resolved to a real kg_co2e, leave any matched transaction's
    // existing coarse entry completely alone — an unimproved-but-correct
    // estimate beats a destroyed one with nothing to replace it.
    const anyItemResolved = insertedItemRows.some((r) => r.kg_co2e != null && r.factor_ref != null);

    let matchedTransactionId: string | null = null;
    if (
      currencySupported &&
      anyItemResolved &&
      parsed.merchant &&
      parsed.orderDate &&
      parsed.totalUsd != null
    ) {
      const orderDate = new Date(`${parsed.orderDate}T12:00:00Z`);
      const windowStart = new Date(orderDate);
      windowStart.setUTCDate(windowStart.getUTCDate() - 3);
      const windowEnd = new Date(orderDate);
      windowEnd.setUTCDate(windowEnd.getUTCDate() + 3);
      const startStr = windowStart.toISOString().slice(0, 10);
      const endStr = windowEnd.toISOString().slice(0, 10);

      const { data: candidates, error: candidatesErr } = await admin
        .from('bank_transactions')
        .select('id, amount_usd, merchant_name, txn_date, entry_id')
        .eq('user_id', user.id)
        .is('superseded_by', null)
        .gte('txn_date', startStr)
        .lte('txn_date', endStr);
      if (candidatesErr) throw candidatesErr;

      const candidateInputs: CandidateTransaction[] = (candidates ?? []).map((c) => ({
        id: c.id as string,
        amountUsd: c.amount_usd as number,
        merchantName: c.merchant_name as string | null,
        txnDate: c.txn_date as string,
      }));
      const receiptForMatch: ReceiptForMatching = {
        merchant: parsed.merchant,
        orderDate: parsed.orderDate,
        totalUsd: parsed.totalUsd,
      };
      matchedTransactionId = matchReceiptToTransaction(receiptForMatch, candidateInputs);

      if (matchedTransactionId) {
        const matchedTxn = candidates!.find((c) => c.id === matchedTransactionId)!;

        // Mark the transaction superseded + clear its own coarse entry. By
        // construction this only runs once at least one item-level entry is
        // guaranteed to exist to replace it (anyItemResolved, checked
        // above) — never delete-then-fail-to-replace.
        //
        // Delete-then-clear here is safe (not a race target) because
        // `superseded_by IS NULL` was already part of the candidate query
        // above and this is the only writer of `superseded_by`; the
        // claim-based race guard matters for the *entry creation* below,
        // which is why that part uses the RPC rather than this direct path.
        if (matchedTxn.entry_id) {
          await admin.from('emission_entries').delete().eq('id', matchedTxn.entry_id as string);
        }
        await admin
          .from('bank_transactions')
          .update({ superseded_by: receipt.id, entry_id: null })
          .eq('id', matchedTransactionId);

        await admin.from('receipts').update({ matched_transaction_id: matchedTransactionId }).eq('id', receipt.id);
      }
    }

    // ── Create one emission_entries row per receipt_item with a resolved
    // factor, via the same atomic lock-before-insert claim discipline as
    // Sprint D's claim_bank_transaction_entry (see migration 20260718000026
    // for why this avoids that stage's original insert-then-delete-on-loss
    // bug).
    const affectedDates = new Set<string>();
    const loggedAt = parsed.orderDate
      ? new Date(`${parsed.orderDate}T12:00:00`).toISOString()
      : new Date().toISOString();

    for (const row of insertedItemRows) {
      if (row.kg_co2e == null || row.factor_ref == null) continue; // unresolved item — never fabricate an entry
      // The NAICS code is needed again here only to look up/create the
      // emission_factors row id. Parse it back out of the already-persisted
      // factor_ref string rather than re-calling resolveItemFactor — that
      // keeps this loop consistent with exactly what was stored on the row,
      // rather than depending on resolveItemFactor being deterministic
      // across two calls within the same request.
      const naicsMatch = row.factor_ref.match(/NAICS (\d+)/);
      if (!naicsMatch) continue;
      const naicsCode = naicsMatch[1];

      const factorId = await findOrCreateFactorId(admin, naicsCode);

      const { data: claim, error: claimErr } = await admin.rpc('claim_receipt_item_entry', {
        p_item_id: row.id,
        p_user_id: user.id,
        p_factor_id: factorId,
        p_kg_co2e: row.kg_co2e,
        p_logged_at: loggedAt,
        p_confidence: 0.3, // low ceiling — same numeric proxy convention as CONFIDENCE_NUMERIC.low in plaidSync.ts
        // Stage R4 (feed/UX) additions to the Stage 1 shape:
        //   - merchant_name: lets the feed reuse the exact same
        //     `metadata.merchant_name` field Sprint D's transaction entries
        //     already read (app/(tabs)/index.tsx already destructures this
        //     key generically), rather than inventing a parallel field.
        //   - item_count: total items on this receipt, so the feed sentence
        //     ("Amazon order — 3 items") doesn't need a second query — every
        //     row from the same receipt carries the same denormalized count.
        //   - matched_transaction_id: present only when this receipt
        //     superseded a bank_transactions estimate; the feed uses its
        //     presence (+ recency of created_at) to fire the one-time
        //     "upgraded" micro-animation (see FeedRow in index.tsx).
        p_metadata: {
          receipt_id: receipt.id,
          item_name: row.name,
          merchant_name: parsed.merchant ?? null,
          item_count: insertedItemRows.length,
          matched_transaction_id: matchedTransactionId,
        },
        p_factor_ref: row.factor_ref,
      });
      if (claimErr) throw claimErr;
      if (claim.was_created) {
        if (parsed.orderDate) affectedDates.add(parsed.orderDate);
      }
    }

    // ── Recompute affected day/week summaries.
    for (const date of affectedDates) {
      const [y, m, d] = date.split('-').map(Number);
      await upsertDailySummary(admin, user.id, date);
      await upsertWeeklySummary(admin, user.id, getISOWeekStart(new Date(y, m - 1, d)));
    }

    const { data: finalItems, error: finalItemsErr } = await admin
      .from('receipt_items')
      .select('*')
      .eq('receipt_id', receipt.id);
    if (finalItemsErr) throw finalItemsErr;

    return new Response(
      JSON.stringify({ receipt: { ...receipt, matched_transaction_id: matchedTransactionId }, items: finalItems ?? [], deduped: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/** find-or-create the emission_factors row for a resolved NAICS code — same
 * defensive pattern as plaidSync.ts's findOrCreateFactorId. */
async function findOrCreateFactorId(admin: ReturnType<typeof createClient>, naicsCode: string): Promise<string> {
  const { data: existing, error: findError } = await admin
    .from('emission_factors')
    .select('id')
    .eq('subcategory', naicsCode)
    .eq('source', 'EPA USEEIO v1.3.0')
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id as string;

  const meta = getFactorMeta(naicsCode);
  if (!meta) {
    throw new Error(`No emission_factors row and no factor-file metadata for NAICS ${naicsCode}`);
  }
  const { data: created, error: insertError } = await admin
    .from('emission_factors')
    .insert({
      category: meta.appCategory,
      subcategory: naicsCode,
      item: meta.naicsTitle,
      unit: 'USD',
      kg_co2e: meta.kgCo2ePerUsd2022,
      source: 'EPA USEEIO v1.3.0',
      year: 2022,
    })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return created.id as string;
}
