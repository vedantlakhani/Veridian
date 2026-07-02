import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, shadows } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VProgressBar — fill animates via scaleX transform (zero layout thrash),
// gradient fill, glow, and stacked `segments` mode for composition.
// ─────────────────────────────────────────────────────────────────────────────

export interface BarSegment {
  value: number;
  color: string;
}

interface VProgressBarProps {
  /** 0 to 1 — ignored when segments provided */
  progress?: number;
  color?: string;
  /** Two-stop gradient fill; overrides color */
  gradient?: readonly [string, string];
  trackColor?: string;
  height?: number;
  animationDuration?: number;
  glow?: boolean;
  /** Stacked composition mode — segment flex weights animate */
  segments?: BarSegment[];
}

function SegmentFill({ segment, total }: { segment: BarSegment; total: number }) {
  const weight = useSharedValue(0);
  const target = total > 0 ? segment.value / total : 0;

  useEffect(() => {
    weight.value = withTiming(target, { duration: motion.timingSlow, easing: motion.easeOut });
  }, [target, weight]);

  const style = useAnimatedStyle(() => ({
    flex: weight.value,
  }));

  return <Animated.View style={[{ backgroundColor: segment.color, height: '100%' }, style]} />;
}

export function VProgressBar({
  progress = 0,
  color = colors.primary,
  gradient,
  trackColor = colors.trackOnDark,
  height = 8,
  animationDuration = motion.timingSlow,
  glow = false,
  segments,
}: VProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const scaleX = useSharedValue(0);

  useEffect(() => {
    scaleX.value = withTiming(clamped, {
      duration: animationDuration,
      easing: motion.easeOut,
    });
  }, [clamped, animationDuration, scaleX]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));

  if (segments && segments.length > 0) {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    return (
      <View
        style={[
          styles.track,
          styles.segmentRow,
          { backgroundColor: trackColor, height, borderRadius: height / 2 },
        ]}
      >
        {segments.map((seg, i) => (
          <SegmentFill key={`${seg.color}-${i}`} segment={seg} total={total} />
        ))}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor, height, borderRadius: height / 2 },
        glow && shadows.glowPrimary,
      ]}
    >
      <Animated.View style={[styles.fillWrapper, { height }, fillStyle]}>
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fillInner, { borderRadius: height / 2 }]}
          />
        ) : (
          <View style={[styles.fillInner, { backgroundColor: color, borderRadius: height / 2 }]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  segmentRow: { flexDirection: 'row' },
  fillWrapper: {
    width: '100%',
    transformOrigin: 'left',
  },
  fillInner: {
    flex: 1,
  },
});
