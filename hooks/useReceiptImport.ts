/**
 * hooks/useReceiptImport.ts — Sprint E Stage R3 client data layer for the
 * receipt import channel (share-intent + manual CSV backfill).
 *
 * Both mutations go through the same `receipt-parse` edge function, via
 * lib/edgeFunction.ts's callEdgeFunction — the exact call pattern Sprint D's
 * useLinkedAccounts.ts hooks established for `plaid-*` functions (direct
 * authenticated fetch, not supabase.functions.invoke(), for the same
 * Authorization-header-clobbering reason documented there).
 *
 * - useParseSharedReceipt: one shared photo/text -> one receipt-parse call
 *   with content/imageBase64 (source: 'share') — Haiku extracts it.
 * - useImportCsvOrders: one call per already-structured CSV order (source:
 *   'import', preParsed set) — no Haiku, see receipt-parse's preParsed
 *   branch. Runs sequentially (not parallel) so a large order-history file
 *   doesn't fan out dozens of concurrent edge-function invocations at once.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { callEdgeFunction } from '@/lib/edgeFunction';
import { ENTRY_KEYS } from '@/lib/queryKeys';
import type { ParsedImportOrder } from '@/lib/importParsers';

export interface ReceiptRow {
  id: string;
  user_id: string;
  source: 'share' | 'import';
  merchant: string | null;
  order_date: string | null;
  total_usd: number | null;
  parse_status: 'parsed' | 'failed';
  matched_transaction_id: string | null;
}

interface ReceiptParseResponse {
  receipt: ReceiptRow;
  items: unknown[];
  deduped: boolean;
  error?: string;
}

function invalidateAfterImport(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ENTRY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
  queryClient.invalidateQueries({ queryKey: ['weekly_summary'] });
}

// ─── Share-intent path (photo or forwarded text) ───────────────────────────
export function useParseSharedReceipt() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content?: string; imageBase64?: string }) => {
      if (!session?.access_token) throw new Error('No session token available');
      return callEdgeFunction<ReceiptParseResponse>('receipt-parse', session.access_token, {
        ...input,
        source: 'share',
      });
    },
    onSuccess: () => invalidateAfterImport(queryClient),
  });
}

// ─── CSV backfill path (Amazon / DoorDash) ─────────────────────────────────
export interface CsvImportProgress {
  total: number;
  completed: number;
  failed: number;
}

export function useImportCsvOrders() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orders: ParsedImportOrder[]; onProgress?: (p: CsvImportProgress) => void }) => {
      if (!session?.access_token) throw new Error('No session token available');
      const { orders, onProgress } = input;
      const results: ReceiptParseResponse[] = [];
      let failed = 0;
      // Sequential by design — see file header note.
      for (let i = 0; i < orders.length; i++) {
        try {
          const result = await callEdgeFunction<ReceiptParseResponse>('receipt-parse', session.access_token, {
            preParsed: orders[i],
            source: 'import',
          });
          results.push(result);
        } catch {
          failed++;
        }
        onProgress?.({ total: orders.length, completed: i + 1, failed });
      }
      return { results, failed };
    },
    onSuccess: () => invalidateAfterImport(queryClient),
  });
}
