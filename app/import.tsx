/**
 * app/import.tsx — Sprint E Stage R3: the receipt import screen.
 *
 * Modal route (mirrors app/link-bank.tsx / app/recap.tsx's registration
 * pattern in app/_layout.tsx). Reachable two ways, per the task spec:
 *  (1) the OS share sheet, via expo-share-intent's hook (wired in
 *      app/_layout.tsx, which pushes here when hasShareIntent is true) —
 *      shows a preview + confirm step, then calls receipt-parse.
 *  (2) manually, from Profile's "Import receipts" row — offering
 *      share-a-receipt instructions plus two file-import options
 *      (Amazon / DoorDash CSV backfill) via expo-document-picker.
 *
 * NOTE ON THE ZIP FILES: no zip-extraction library is in this round's
 * approved dependency list (only expo-share-intent + expo-document-picker
 * were pre-approved) — so this screen asks the user to unzip Amazon's
 * "Request My Data" / DoorDash's export on-device first and pick the CSV
 * file directly (e.g. "Retail.OrderHistory.1.csv") out of Files, rather
 * than picking the .zip itself.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useShareIntentContext } from 'expo-share-intent';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { useParseSharedReceipt, useImportCsvOrders, type CsvImportProgress } from '@/hooks/useReceiptImport';
import { parseAmazonOrderHistoryCsv, parseDoorDashOrderExportCsv } from '@/lib/importParsers';
import { VText, VIcon, VButton, VPressable, VCard, VToast, type VIconName } from '@/components/ui';
import { colors, spacing, typography, radii, shadows } from '@/lib/theme';

type ImportSource = 'amazon' | 'doordash';

function InstructionRow({ icon, children }: { icon: VIconName; children: string }) {
  return (
    <View style={styles.instructionRow}>
      <VIcon name={icon} size={15} color={colors.textSecondary} strokeWidth={2} />
      <VText variant="caption" style={styles.instructionText}>
        {children}
      </VText>
    </View>
  );
}

function ImportOptionRow({
  label,
  sublabel,
  loading,
  onPress,
}: {
  label: string;
  sublabel: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <VPressable onPress={onPress} haptic="light" style={styles.optionRow} disabled={loading}>
      <View style={{ flex: 1 }}>
        <VText variant="body" style={styles.optionLabel}>
          {label}
        </VText>
        <VText variant="caption" style={styles.optionSublabel}>
          {sublabel}
        </VText>
      </View>
      <VIcon name="chevron-right" size={18} color={colors.textTertiary} />
    </VPressable>
  );
}

export default function ImportScreen() {
  const { user } = useAuthStore();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  const parseShared = useParseSharedReceipt();
  const importCsv = useImportCsvOrders();

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [csvProgress, setCsvProgress] = useState<CsvImportProgress | null>(null);
  const [confirmedShare, setConfirmedShare] = useState(false);

  const dismiss = () => {
    if (hasShareIntent) resetShareIntent();
    if (router.canGoBack()) router.back();
  };

  // ─── Share-intent preview data ─────────────────────────────────────────
  const sharedImageFile = useMemo(
    () => shareIntent?.files?.find((f) => f.mimeType.startsWith('image/')) ?? null,
    [shareIntent],
  );
  const sharedText = shareIntent?.text ?? null;

  const handleConfirmShare = async () => {
    if (!user) return;
    setError(null);
    try {
      let payload: { content?: string; imageBase64?: string };
      if (sharedImageFile) {
        const base64 = await FileSystem.readAsStringAsync(sharedImageFile.path, {
          encoding: FileSystem.EncodingType.Base64,
        });
        payload = { imageBase64: base64 };
      } else if (sharedText) {
        payload = { content: sharedText };
      } else {
        setError('Nothing to import from this share.');
        return;
      }
      const result = await parseShared.mutateAsync(payload);
      setConfirmedShare(true);
      setNotice(
        result.receipt.parse_status === 'parsed'
          ? `Logged ${result.receipt.merchant ?? 'that receipt'} — added to your history.`
          : "Couldn't read that receipt clearly — try a clearer photo or forward the text instead.",
      );
    } catch {
      setError("Couldn't reach the server — try again in a moment.");
    }
  };

  // ─── Manual CSV backfill ────────────────────────────────────────────────
  const handlePickCsv = async (kind: ImportSource) => {
    setError(null);
    setNotice(null);
    setCsvProgress(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      const csvText = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      const { orders, warnings } =
        kind === 'amazon' ? parseAmazonOrderHistoryCsv(csvText) : parseDoorDashOrderExportCsv(csvText);

      if (orders.length === 0) {
        setError(warnings[0] ?? 'No orders found in that file.');
        return;
      }

      const { failed } = await importCsv.mutateAsync({
        orders,
        onProgress: setCsvProgress,
      });

      setNotice(
        `Imported ${orders.length - failed} of ${orders.length} orders${failed > 0 ? ` (${failed} failed)` : ''}.` +
          (warnings.length > 0 ? ` ${warnings.length} row warning(s) — some items may be incomplete.` : ''),
      );
    } catch {
      setError("Couldn't read that file — make sure you picked the unzipped .csv, not the .zip.");
    } finally {
      setCsvProgress(null);
    }
  };

  useEffect(() => {
    // A share intent with nothing usable (e.g. shared a plain URL with no
    // text/image) still opens this screen — surface that rather than a
    // blank confirm step.
    if (hasShareIntent && !sharedImageFile && !sharedText) {
      setError('Nothing shareable found — try sharing a photo of a receipt or the order confirmation text.');
    }
  }, [hasShareIntent, sharedImageFile, sharedText]);

  const showSharePreview = hasShareIntent && !confirmedShare;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <VPressable
        onPress={dismiss}
        hitSlop={12}
        haptic="light"
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <VIcon name="close" size={20} color={colors.textSecondary} />
      </VPressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroIconWrap}>
          <VIcon name="share" size={28} color={colors.primary} />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(60)}>
          <VText variant="title" style={styles.headline}>
            Import receipts
          </VText>
          <VText variant="body" style={styles.subhead}>
            Add item-level detail your bank feed can&apos;t see — from a shared receipt or an old order history file.
          </VText>
        </Animated.View>

        {error && (
          <VToast
            message={error}
            icon={<VIcon name="close" size={16} color={colors.danger} strokeWidth={2} />}
            tone="error"
            onDismiss={() => setError(null)}
          />
        )}
        {notice && (
          <VToast
            message={notice}
            icon={<VIcon name="check" size={16} color={colors.primary} strokeWidth={2} />}
            tone="success"
            onDismiss={() => setNotice(null)}
          />
        )}

        {showSharePreview && (
          <Animated.View entering={FadeInDown.duration(360).delay(120)}>
            <VCard elevation="sm" style={styles.previewCard}>
              <VText variant="heading" style={styles.sectionTitle}>
                Shared just now
              </VText>
              {sharedImageFile && (
                <VText variant="caption" style={styles.previewMeta}>
                  Photo receipt · {sharedImageFile.fileName}
                </VText>
              )}
              {sharedText && !sharedImageFile && (
                <VText variant="body" numberOfLines={4} style={styles.previewText}>
                  {sharedText}
                </VText>
              )}
              <VButton
                variant="primary"
                label="Confirm and log it"
                fullWidth
                loading={parseShared.isPending}
                onPress={() => void handleConfirmShare()}
                style={{ marginTop: spacing.md }}
              />
            </VCard>
          </Animated.View>
        )}

        {/* Share-a-receipt instructions */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)}>
          <VCard elevation="sm" style={styles.trustCard}>
            <VText variant="heading" style={styles.sectionTitle}>
              Share a receipt
            </VText>
            <InstructionRow icon="share">Open any order confirmation email or photo</InstructionRow>
            <InstructionRow icon="arrow-right">Tap Share, then choose Veridian</InstructionRow>
            <InstructionRow icon="check">Confirm here — it lands on the right day automatically</InstructionRow>
          </VCard>
        </Animated.View>

        {/* Manual backfill import */}
        <Animated.View entering={FadeInDown.duration(400).delay(240)}>
          <VCard elevation="sm" style={styles.trustCard}>
            <VText variant="heading" style={styles.sectionTitle}>
              Import past orders
            </VText>
            <VText variant="caption" style={styles.instructionText}>
              Request your data from Amazon or DoorDash, unzip it, then pick the .csv file below.
            </VText>
            <View style={{ marginTop: spacing.sm }}>
              <ImportOptionRow
                label="Amazon order history"
                sublabel="Retail.OrderHistory.1.csv from Request My Data"
                loading={importCsv.isPending}
                onPress={() => void handlePickCsv('amazon')}
              />
              <ImportOptionRow
                label="DoorDash order export"
                sublabel="Order history CSV from your DoorDash account"
                loading={importCsv.isPending}
                onPress={() => void handlePickCsv('doordash')}
              />
            </View>
            {csvProgress && (
              <VText variant="caption" style={styles.progressText}>
                Importing {csvProgress.completed} of {csvProgress.total}…
              </VText>
            )}
          </VCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  closeButton: { alignSelf: 'flex-end', padding: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: spacing.sm,
  },
  subhead: { color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md },
  sectionTitle: { marginBottom: spacing.sm },
  trustCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  previewMeta: { color: colors.textSecondary },
  previewText: { color: colors.textSecondary, lineHeight: 20 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  instructionText: { flex: 1, color: colors.textSecondary },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  optionLabel: { fontWeight: '600' },
  optionSublabel: { color: colors.textTertiary },
  progressText: { color: colors.textSecondary, marginTop: spacing.sm },
});
