/**
 * supabase/functions/_shared/plaidSync.ts — core Plaid transactions/sync
 * logic (Sprint D Stage 3), factored out so plaid-exchange (first sync),
 * plaid-sync (HTTP entrypoint), plaid-webhook, and plaid-sync-now can all
 * call the SAME implementation in-process rather than one HTTP-invoking
 * another.
 *
 * WHY IN-PROCESS RATHER THAN SELF-INVOKING HTTP: an edge function calling
 * its own (or a sibling's) public URL would need a second round-trip through
 * the Supabase gateway, a second JWT/service-key handshake, and doubles
 * cold-start latency — with no upside, since Deno lets any function in this
 * project import a plain TS module from another function's directory
 * directly (this is exactly the existing `_shared/cors.ts` pattern, just for
 * logic instead of constants). In-process calls also make errors propagate
 * as normal exceptions/return values instead of having to parse another
 * function's HTTP response, which matters here because plaid-exchange must
 * know synchronously whether the first sync succeeded.
 *
 * IDEMPOTENCY / RACE GUARD (see SPRINT_D_SPEC.md Stage 3): a webhook-triggered
 * sync and a manual sync-now call can run concurrently for the same
 * linked_items row. The guard against double-creating an emission_entries row
 * for one transaction is the claim_bank_transaction_entry Postgres function
 * (migration 20260718000024), called via claimEntryForTransaction below. It
 * takes a row lock on bank_transactions (SELECT ... FOR UPDATE) BEFORE ever
 * inserting an emission_entries row: a second concurrent caller blocks on
 * that lock, then — once the first caller commits — sees entry_id already
 * set and returns the existing id without inserting anything. The losing
 * side never creates a row in the first place, so there is no compensating
 * delete and no window for a failed cleanup to leave an orphan behind (an
 * earlier insert-then-conditional-update-then-delete-on-loss design had
 * exactly that gap; adversarial review caught it, since a serverless
 * function can be recycled between the failed update and its delete).
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { plaidFetch } from './plaid.ts';
import { estimateTransactionKg, getFactorMeta, type SpendConfidence } from './spendFactors.ts';
import { upsertDailySummary, upsertWeeklySummary, getISOWeekStart } from './emissions.ts';

// ─── Plaid /transactions/sync response shapes (per Plaid's documented schema —
// this repo has no live sandbox call available in this environment, so these
// interfaces are typed from Plaid's published API reference, not a captured
// response; see the final report / DEVELOPER_TESTING notes for how to
// confirm against a real sandbox call). ─────────────────────────────────────
interface PlaidPersonalFinanceCategory {
  primary: string;
  detailed: string;
  confidence_level?: string;
}
interface PlaidSyncTransaction {
  transaction_id: string;
  account_id: string;
  amount: number; // positive = money OUT (spend); negative = inflow/refund
  iso_currency_code?: string | null;
  date: string; // posted date, YYYY-MM-DD
  authorized_date?: string | null;
  name: string;
  merchant_name?: string | null;
  personal_finance_category?: PlaidPersonalFinanceCategory | null;
  pending: boolean;
}
interface PlaidRemovedTransaction {
  transaction_id: string;
}
interface PlaidSyncResponse {
  added: PlaidSyncTransaction[];
  modified: PlaidSyncTransaction[];
  removed: PlaidRemovedTransaction[];
  next_cursor: string;
  has_more: boolean;
  request_id: string;
}

interface LinkedItemRow {
  id: string;
  user_id: string;
  access_token: string;
  cursor: string | null;
  status: string;
}

interface BankTransactionRow {
  id: string;
  user_id: string;
  item_id: string;
  plaid_transaction_id: string;
  amount_usd: number;
  merchant_name: string | null;
  plaid_category: string | null;
  mcc: string | null;
  txn_date: string;
  kg_co2e: number | null;
  factor_ref: string | null;
  confidence: SpendConfidence | null;
  entry_id: string | null;
}

export interface SyncResult {
  itemId: string;
  pagesProcessed: number;
  added: number;
  modified: number;
  removed: number;
  entriesCreated: number;
  entriesAdjusted: number;
  entriesRemoved: number;
}

// Numeric confidence proxy for emission_entries.confidence (NUMERIC(3,2), 0..1)
// — spendFactors' engine only ever returns 'low'|'medium' (never 'high': a
// sector-average $-based estimate can't earn full confidence, see
// spendFactors.ts's own doc comment). These constants are this port's
// deliberate, documented mapping from that qualitative ceiling to the
// numeric column the rest of the ledger already uses.
const CONFIDENCE_NUMERIC: Record<SpendConfidence, number> = { medium: 0.6, low: 0.3 };

function encodePlaidCategory(cat: PlaidPersonalFinanceCategory | null | undefined): string | null {
  if (!cat) return null;
  return `${cat.primary}.${cat.detailed}`;
}
function decodePlaidCategory(encoded: string | null): { primary: string; detailed: string } | null {
  if (!encoded) return null;
  const idx = encoded.indexOf('.');
  if (idx < 0) return null;
  return { primary: encoded.slice(0, idx), detailed: encoded.slice(idx + 1) };
}

// txn_date (a DATE, "YYYY-MM-DD") -> logged_at at LOCAL noon, per Stage 3
// spec ("loggedAt txn_date midday local"). Using noon (not midnight) avoids
// any single day of DST slop pushing the entry into the adjacent calendar
// day when later read back and bucketed by getLocalDateString-equivalent
// logic — the exact same reasoning lib/emissions.ts uses for date-bucketing
// elsewhere in this codebase. "Local" here is the server/runtime's local
// time zone (edge functions have no device time zone to defer to); this is
// an acknowledged approximation for users far from UTC — see final report.
function txnDateToLoggedAt(txnDate: string): string {
  const [y, m, d] = txnDate.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

async function fetchLinkedItem(admin: SupabaseClient, itemId: string): Promise<LinkedItemRow> {
  const { data, error } = await admin
    .from('linked_items')
    .select('id, user_id, access_token, cursor, status')
    .eq('id', itemId)
    .single();
  if (error || !data) throw new Error(`linked_items row not found for id=${itemId}: ${error?.message}`);
  return data as LinkedItemRow;
}

/** find-or-create the emission_factors row for a resolved NAICS code. */
async function findOrCreateFactorId(admin: SupabaseClient, naicsCode: string): Promise<string> {
  const { data: existing, error: findError } = await admin
    .from('emission_factors')
    .select('id')
    .eq('subcategory', naicsCode)
    .eq('source', 'EPA USEEIO v1.3.0')
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id as string;

  // Defensive fallback: the Stage 2 seed should already contain every NAICS
  // code the crosswalk can produce (including the fallback code) — this path
  // only fires if the crosswalk/data files were updated without a matching
  // seed migration (see spendFactors.ts's reconciliation note).
  const meta = getFactorMeta(naicsCode);
  if (!meta) {
    throw new Error(
      `No emission_factors row and no factor-file metadata for NAICS ${naicsCode} — data/useeio_factors.json and the Stage 2 seed have drifted out of sync`
    );
  }
  const { data: created, error: insertError } = await admin
    .from('emission_factors')
    .insert({
      category: meta.appCategory,
      subcategory: naicsCode,
      item: meta.naicsTitle,
      unit: 'USD',
      // Mirrors the Stage 2 seed's convention exactly: this column holds the
      // raw USEEIO kg-CO2e-per-2022-USD factor (pre-CPI-adjustment), the
      // same number data/useeio_factors.json carries for this NAICS code —
      // NOT a placeholder.
      kg_co2e: meta.kgCo2ePerUsd2022,
      source: 'EPA USEEIO v1.3.0',
      year: 2022,
    })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return created.id as string;
}

/**
 * Atomically claims a transaction's entry via the claim_bank_transaction_entry
 * RPC (migration 20260718000024): a row lock on bank_transactions serializes
 * concurrent callers BEFORE any emission_entries insert happens, so the
 * losing side never creates a row at all — no compensating delete, no window
 * for an orphan to survive a failed cleanup.
 */
async function claimEntryForTransaction(
  admin: SupabaseClient,
  txnId: string,
  userId: string,
  factorId: string,
  estimate: { kgCo2e: number; factorRef: string; confidence: SpendConfidence },
  loggedAt: string,
  merchantName: string | null
): Promise<{ entryId: string; wasCreated: boolean }> {
  const { data, error } = await admin.rpc('claim_bank_transaction_entry', {
    p_txn_id: txnId,
    p_user_id: userId,
    p_factor_id: factorId,
    p_kg_co2e: estimate.kgCo2e,
    p_logged_at: loggedAt,
    p_confidence: CONFIDENCE_NUMERIC[estimate.confidence],
    p_metadata: { plaid_transaction_id: txnId, merchant_name: merchantName },
    p_factor_ref: estimate.factorRef,
    p_bt_confidence: estimate.confidence,
  });
  if (error) throw error;
  return { entryId: data.entry_id as string, wasCreated: data.was_created as boolean };
}

interface AffectedTracker {
  dates: Map<string, Set<string>>; // userId -> set of "YYYY-MM-DD"
}
function markAffected(tracker: AffectedTracker, userId: string, date: string) {
  if (!tracker.dates.has(userId)) tracker.dates.set(userId, new Set());
  tracker.dates.get(userId)!.add(date);
}
async function flushAffected(admin: SupabaseClient, tracker: AffectedTracker): Promise<void> {
  for (const [userId, dates] of tracker.dates) {
    const weeks = new Set<string>();
    for (const date of dates) {
      const [y, m, d] = date.split('-').map(Number);
      weeks.add(getISOWeekStart(new Date(y, m - 1, d)));
    }
    for (const date of dates) await upsertDailySummary(admin, userId, date);
    for (const week of weeks) await upsertWeeklySummary(admin, userId, week);
  }
}

/**
 * Runs one full transactions/sync pass (all pages, cursor persisted after
 * each page) for a single linked_items row, then a factor+entry-creation
 * pass over every row still missing an entry_id.
 */
export async function syncLinkedItem(admin: SupabaseClient, itemId: string): Promise<SyncResult> {
  const item = await fetchLinkedItem(admin, itemId);
  const result: SyncResult = {
    itemId,
    pagesProcessed: 0,
    added: 0,
    modified: 0,
    removed: 0,
    entriesCreated: 0,
    entriesAdjusted: 0,
    entriesRemoved: 0,
  };

  if (item.status !== 'active') {
    // A revoked/errored item should not be synced (e.g. after unlink).
    return result;
  }

  const tracker: AffectedTracker = { dates: new Map() };
  let cursor: string | undefined = item.cursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const page = await plaidFetch<PlaidSyncResponse>('/transactions/sync', {
      access_token: item.access_token,
      cursor,
      count: 500,
    });
    result.pagesProcessed++;
    result.added += page.added.length;
    result.modified += page.modified.length;
    result.removed += page.removed.length;

    // ── added + modified: upsert core fields only. Deliberately NOT
    // including entry_id/kg_co2e/factor_ref/confidence in this upsert
    // payload, so ON CONFLICT DO UPDATE leaves those columns untouched for
    // an already-processed row — the factor/entry pass below (and the
    // modified-reconciliation step) are the only writers of those columns.
    const upsertRows = [...page.added, ...page.modified].map((t) => ({
      user_id: item.user_id,
      item_id: item.id,
      plaid_transaction_id: t.transaction_id,
      amount_usd: t.amount,
      merchant_name: t.merchant_name ?? t.name ?? null,
      plaid_category: encodePlaidCategory(t.personal_finance_category),
      txn_date: t.date,
    }));
    if (upsertRows.length > 0) {
      const { error: upsertError } = await admin
        .from('bank_transactions')
        .upsert(upsertRows, { onConflict: 'plaid_transaction_id' });
      if (upsertError) throw upsertError;
    }

    // ── modified reconciliation: if a modified row already has an entry,
    // re-estimate from its (possibly new) amount/category and adjust.
    if (page.modified.length > 0) {
      const ids = page.modified.map((t) => t.transaction_id);
      const { data: rows, error: fetchError } = await admin
        .from('bank_transactions')
        .select('id, user_id, amount_usd, plaid_category, txn_date, kg_co2e, entry_id')
        .in('plaid_transaction_id', ids);
      if (fetchError) throw fetchError;
      for (const row of (rows ?? []) as BankTransactionRow[]) {
        if (!row.entry_id) continue; // no existing entry — the unprocessed pass below will handle it
        const cat = decodePlaidCategory(row.plaid_category);
        if (!cat) continue;
        const est = estimateTransactionKg({
          amountUsd: row.amount_usd,
          plaidPrimary: cat.primary,
          plaidDetailed: cat.detailed,
        });
        const oldKg = row.kg_co2e ?? 0;
        const affectedDate = row.txn_date;
        if (!est || est.kgCo2e < 0) {
          // No longer estimable, or now a refund — emission_entries.kg_co2e_total
          // has a CHECK (>= 0), so a negative/absent estimate cannot stay
          // linked. Delete the entry and clear the link so the transaction
          // reverts to "unprocessed" (a later positive re-estimate, if any,
          // will pick it up again).
          await admin.from('emission_entries').delete().eq('id', row.entry_id);
          await admin
            .from('bank_transactions')
            .update({ entry_id: null, kg_co2e: est?.kgCo2e ?? null, factor_ref: est?.factorRef ?? null, confidence: est?.confidence ?? null })
            .eq('id', row.id);
          result.entriesRemoved++;
          markAffected(tracker, row.user_id, affectedDate);
        } else if (Math.abs(est.kgCo2e - oldKg) > 1e-6) {
          await admin
            .from('emission_entries')
            .update({ kg_co2e_total: est.kgCo2e, logged_at: txnDateToLoggedAt(row.txn_date) })
            .eq('id', row.entry_id);
          await admin
            .from('bank_transactions')
            .update({ kg_co2e: est.kgCo2e, factor_ref: est.factorRef, confidence: est.confidence })
            .eq('id', row.id);
          result.entriesAdjusted++;
          markAffected(tracker, row.user_id, affectedDate);
        }
      }
    }

    // ── removed: delete the linked entry (if any) then the transaction row.
    if (page.removed.length > 0) {
      const ids = page.removed.map((r) => r.transaction_id);
      const { data: toRemove, error: fetchError } = await admin
        .from('bank_transactions')
        .select('id, user_id, txn_date, entry_id')
        .in('plaid_transaction_id', ids);
      if (fetchError) throw fetchError;
      for (const row of (toRemove ?? []) as Pick<BankTransactionRow, 'id' | 'user_id' | 'txn_date' | 'entry_id'>[]) {
        if (row.entry_id) {
          await admin.from('emission_entries').delete().eq('id', row.entry_id);
          result.entriesRemoved++;
        }
        await admin.from('bank_transactions').delete().eq('id', row.id);
        markAffected(tracker, row.user_id, row.txn_date);
      }
    }

    cursor = page.next_cursor;
    hasMore = page.has_more;
    // Persist the cursor after EVERY page (not just at the end) so a crash
    // mid-sync re-resumes close to where it left off instead of reprocessing
    // the whole history from null.
    const { error: cursorError } = await admin
      .from('linked_items')
      .update({ cursor, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (cursorError) throw cursorError;
  }

  // ── factor + entry creation pass: every row for this item still missing
  // an entry_id (new adds, or rows reset to null by the reconciliation step
  // above).
  //
  // CRITICAL: must also exclude superseded_by IS NOT NULL. A receipt-parse
  // supersede sets entry_id back to null (its coarse entry was deleted) AND
  // superseded_by to the receipt's id, in the same operation — without this
  // filter, the very next sync of this linked item re-finds that transaction
  // as "unprocessed" and creates a SECOND coarse entry for a purchase that
  // already has correct item-level receipt entries, permanently double-
  // counting it (an adversarial review caught this as a regression of the
  // exact bug class claim_bank_transaction_entry was written to fix — same
  // failure mode, different code path).
  const { data: unprocessed, error: unprocessedError } = await admin
    .from('bank_transactions')
    .select('id, user_id, amount_usd, plaid_category, txn_date, merchant_name')
    .eq('item_id', item.id)
    .is('entry_id', null)
    .is('superseded_by', null);
  if (unprocessedError) throw unprocessedError;

  for (const txn of (unprocessed ?? []) as Pick<
    BankTransactionRow,
    'id' | 'user_id' | 'amount_usd' | 'plaid_category' | 'txn_date' | 'merchant_name'
  >[]) {
    const cat = decodePlaidCategory(txn.plaid_category);
    if (!cat) continue;
    const estimate = estimateTransactionKg({
      amountUsd: txn.amount_usd,
      plaidPrimary: cat.primary,
      plaidDetailed: cat.detailed,
    });
    if (!estimate) continue; // non-emission (transfer/fee/income/etc.)

    if (estimate.kgCo2e < 0) {
      // Refund/credit: emission_entries.kg_co2e_total has CHECK (>= 0), so a
      // negative total can never be inserted there. Record the estimate on
      // bank_transactions for transparency/audit (and future Sprint E
      // receipt reconciliation) but deliberately do NOT create a ledger
      // entry for it.
      //
      // KNOWN LIMITATION (documented in docs/SPRINT_D_SPEC.md's Known
      // Limitations section — flagged to the human, not silently decided):
      // a refund arrives as its OWN separate transaction (distinct
      // plaid_transaction_id), not a modification of the original purchase.
      // This code does not look up and net the original purchase's
      // emission_entries row, so a refunded purchase's emissions remain
      // counted in the user's total indefinitely. Netting would require
      // fuzzy-matching the refund to its original purchase (Plaid does not
      // guarantee a direct link between them), which is out of scope here.
      await admin
        .from('bank_transactions')
        .update({ kg_co2e: estimate.kgCo2e, factor_ref: estimate.factorRef, confidence: estimate.confidence })
        .eq('id', txn.id)
        .is('entry_id', null);
      continue;
    }

    const factorId = await findOrCreateFactorId(admin, estimate.naicsCode);
    const loggedAt = txnDateToLoggedAt(txn.txn_date);

    // Single atomic claim: locks the bank_transactions row, then either
    // returns an already-claimed entry_id (lost the race, no insert ever
    // happened) or creates the entry and links it in the same transaction
    // (won the race). See claim_bank_transaction_entry's own migration
    // comment for why this fully closes the prior insert-then-delete gap.
    const { wasCreated } = await claimEntryForTransaction(
      admin,
      txn.id,
      txn.user_id,
      factorId,
      estimate,
      loggedAt,
      txn.merchant_name,
    );
    if (!wasCreated) continue; // another caller already claimed this transaction
    result.entriesCreated++;
    markAffected(tracker, txn.user_id, txn.txn_date);
  }

  await flushAffected(admin, tracker);
  return result;
}

/** Syncs every active linked_items row for one user (plaid-sync-now). */
export async function syncAllItemsForUser(admin: SupabaseClient, userId: string): Promise<SyncResult[]> {
  const { data: items, error } = await admin
    .from('linked_items')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) throw error;
  const results: SyncResult[] = [];
  for (const row of items ?? []) {
    results.push(await syncLinkedItem(admin, row.id as string));
  }
  return results;
}
