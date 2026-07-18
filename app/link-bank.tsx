/**
 * app/link-bank.tsx — Sprint D Stage 4: the trust-first bank-connect screen.
 *
 * NORTH_STAR.md §5: "the bank-connect screen is the highest-leverage
 * conversion surface in the app." Modal route (mirrors app/recap.tsx's
 * registration pattern in app/_layout.tsx — presentation: 'modal'). Content
 * order per SPRINT_D_SPEC.md Stage 4: (a) calm headline on why linking helps
 * (shopping/food/fuel — what sensors can't see), (b) plain-language trust
 * copy, (c) primary CTA -> plaid-link-token -> Plaid Link SDK -> plaid-
 * exchange, (d) a "Not now" skip that dismisses the modal — sensors-only
 * mode is never gated behind this.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createPlaidLinkSession } from 'react-native-plaid-link-sdk';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { useCreateLinkToken, useExchangePublicToken } from '@/hooks/useLinkedAccounts';
import { VText, VIcon, VButton, VPressable, VToast, type VIconName } from '@/components/ui';
import { colors, spacing, typography, radii, shadows } from '@/lib/theme';

// ─── Why-it-helps row — one line per signal sensors can't see ────────────────
const WHY_ROWS: { icon: VIconName; label: string }[] = [
  { icon: 'fork', label: 'Groceries and takeout' },
  { icon: 'sparkle', label: 'Online orders and shopping' },
  { icon: 'car', label: 'Gas and fuel at the pump' },
];

function WhyRow({ icon, label, index }: { icon: VIconName; label: string; index: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(80 * index)} style={styles.whyRow}>
      <View style={styles.whyIconWrap}>
        <VIcon name={icon} size={16} color={colors.primary} />
      </View>
      <VText variant="body" style={styles.whyLabel}>
        {label}
      </VText>
    </Animated.View>
  );
}

// ─── Trust line — plain language, never legalese ─────────────────────────────
function TrustLine({ icon, children }: { icon: VIconName; children: string }) {
  return (
    <View style={styles.trustRow}>
      <VIcon name={icon} size={15} color={colors.textSecondary} strokeWidth={2} />
      <VText variant="caption" style={styles.trustText}>
        {children}
      </VText>
    </View>
  );
}

export default function LinkBankScreen() {
  const { user } = useAuthStore();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLinkToken = useCreateLinkToken();
  const exchangePublicToken = useExchangePublicToken();

  const dismiss = () => {
    if (router.canGoBack()) router.back();
  };

  const handleConnect = async () => {
    if (!user) return;
    setError(null);
    setConnecting(true);
    try {
      const linkToken = await createLinkToken.mutateAsync();

      const session = await createPlaidLinkSession({
        token: linkToken,
        onSuccess: (success) => {
          void exchangePublicToken
            .mutateAsync({
              publicToken: success.publicToken,
              institutionName: success.metadata.institution?.name ?? null,
            })
            .then(() => dismiss())
            .catch(() => setError("Connected, but we couldn't finish syncing — try again from Profile."))
            .finally(() => setConnecting(false));
        },
        onExit: (exit) => {
          setConnecting(false);
          // A user-initiated exit (back button, closed the sheet) is not an
          // error — only surface Plaid's own reported error, if any.
          if (exit.error) {
            setError(exit.error.errorMessage ?? "Couldn't connect that account — try again.");
          }
        },
        onEvent: () => {},
      });
      await session.open();
    } catch {
      setConnecting(false);
      setError("Bank linking isn't available yet on this build — try again after the next update.");
    }
  };

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

      <View style={styles.content}>
        {/* (a) Calm headline — why linking helps */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroIconWrap}>
          <VIcon name="leaf" size={30} color={colors.primary} />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(60)}>
          <VText variant="title" style={styles.headline}>
            See the spending sensors can&apos;t
          </VText>
          <VText variant="body" style={styles.subhead}>
            Movement already writes itself here. Link a card once and your
            shopping, food, and fuel join the story automatically — no typing,
            ever.
          </VText>
        </Animated.View>

        <View style={styles.whyList}>
          {WHY_ROWS.map((row, i) => (
            <WhyRow key={row.label} {...row} index={i} />
          ))}
        </View>

        {/* (b) Trust copy — plain language, not legalese */}
        <Animated.View entering={FadeInDown.duration(400).delay(320)} style={styles.trustCard}>
          <TrustLine icon="lock">We never see your credentials</TrustLine>
          <TrustLine icon="wifi-off">Unlink anytime, from your Profile</TrustLine>
          <TrustLine icon="check">Bank-level encryption, handled by Plaid</TrustLine>
        </Animated.View>

        {error && (
          <VToast
            message={error}
            icon={<VIcon name="close" size={16} color={colors.danger} strokeWidth={2} />}
            tone="error"
            onDismiss={() => setError(null)}
          />
        )}
      </View>

      {/* (c) Primary CTA + (d) skip path — sensors-only stays fully first-class */}
      <View style={styles.footer}>
        <VButton
          variant="primary"
          label="Connect a bank"
          icon="lock"
          fullWidth
          size="lg"
          loading={connecting}
          onPress={() => void handleConnect()}
        />
        <VPressable
          onPress={dismiss}
          haptic="light"
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel="Not now — continue with sensors only"
        >
          <VText variant="body" style={styles.skipText}>
            Not now
          </VText>
        </VPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: spacing.sm,
  },
  subhead: {
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  whyList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  whyIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    backgroundColor: colors.primaryGlowSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyLabel: {
    fontWeight: '500',
  },
  trustCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustText: {
    flex: 1,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipText: {
    color: colors.textTertiary,
    fontWeight: '600',
  },
});
