import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VSparkline — tiny SVG trend line with gradient fill-under and animated draw.
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

interface VSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Show gradient fill under the line */
  fill?: boolean;
  animated?: boolean;
}

let gradientCounter = 0;

export function VSparkline({
  data,
  width = 80,
  height = 28,
  color = colors.primaryLight,
  fill = true,
  animated = true,
}: VSparklineProps) {
  const gradientId = useMemo(() => `spark-${++gradientCounter}`, []);
  const progress = useSharedValue(animated ? 0 : 1);

  const { points, polygonPoints, totalLength } = useMemo(() => {
    if (data.length < 2) return { points: '', polygonPoints: '', totalLength: 0 };
    const max = Math.max(...data, 0.001);
    const min = Math.min(...data, 0);
    const range = Math.max(max - min, 0.001);
    const pad = 2;
    const stepX = (width - pad * 2) / (data.length - 1);
    const coords = data.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return { x, y };
    });
    let length = 0;
    for (let i = 1; i < coords.length; i++) {
      const dx = coords[i].x - coords[i - 1].x;
      const dy = coords[i].y - coords[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    const pts = coords.map((c) => `${c.x},${c.y}`).join(' ');
    const poly = `${pts} ${coords[coords.length - 1].x},${height} ${coords[0].x},${height}`;
    return { points: pts, polygonPoints: poly, totalLength: length };
  }, [data, width, height]);

  useEffect(() => {
    if (animated) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: motion.timingSlow, easing: motion.easeOut });
    }
  }, [animated, points, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: totalLength * (1 - progress.value),
  }));

  if (data.length < 2) return <View style={{ width, height }} />;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {fill && <Polygon points={polygonPoints} fill={`url(#${gradientId})`} />}
        <AnimatedPolyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={totalLength || undefined}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}
