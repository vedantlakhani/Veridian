/**
 * hooks/useLinkedAccounts.ts — Sprint D Stage 4
 *
 * Client-side data layer for the "money" layer: creating a Plaid Link token,
 * exchanging Link's public_token, listing the user's linked bank accounts,
 * and unlinking one. All four go through supabase `plaid-*` edge functions
 * (never a direct client table read/write — see plaid-items/index.ts's own
 * comment on why linked_items has zero client-readable RLS policies).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { callEdgeFunction } from '@/lib/edgeFunction';
import { LINKED_ITEMS_KEYS, ENTRY_KEYS } from '@/lib/queryKeys';

export interface LinkedItemSummary {
  id: string;
  institution_name: string | null;
  status: string;
  created_at: string;
}

// ─── List ───────────────────────────────────────────────────────────────────
export function useLinkedAccounts(userId: string | undefined) {
  const { session } = useAuthStore();
  return useQuery({
    queryKey: LINKED_ITEMS_KEYS.list(userId ?? ''),
    queryFn: async () => {
      const { linked_items } = await callEdgeFunction<{ linked_items: LinkedItemSummary[] }>(
        'plaid-items',
        session!.access_token,
      );
      return linked_items;
    },
    enabled: !!userId && !!session?.access_token,
  });
}

// ─── Create link token ──────────────────────────────────────────────────────
export function useCreateLinkToken() {
  const { session } = useAuthStore();
  return useMutation({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error('No session token available');
      const { link_token } = await callEdgeFunction<{ link_token: string }>(
        'plaid-link-token',
        session.access_token,
      );
      return link_token;
    },
  });
}

// ─── Exchange public_token (Link success -> stored item + first sync) ──────
export function useExchangePublicToken() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { publicToken: string; institutionName?: string | null }) => {
      if (!session?.access_token) throw new Error('No session token available');
      return callEdgeFunction<{ linked_item: LinkedItemSummary; sync: unknown; sync_error: string | null }>(
        'plaid-exchange',
        session.access_token,
        { public_token: input.publicToken, institution_name: input.institutionName ?? undefined },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKED_ITEMS_KEYS.all });
      // The first sync (run server-side inside plaid-exchange) may already
      // have created emission_entries rows — refresh the feed/summaries.
      queryClient.invalidateQueries({ queryKey: ENTRY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['weekly_summary'] });
    },
  });
}

// ─── Unlink ─────────────────────────────────────────────────────────────────
export function useUnlinkAccount() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linkedItemId: string) => {
      if (!session?.access_token) throw new Error('No session token available');
      return callEdgeFunction<{ ok: boolean; plaid_error: string | null }>(
        'plaid-unlink',
        session.access_token,
        { linked_item_id: linkedItemId },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKED_ITEMS_KEYS.all });
    },
  });
}
