import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VIcon — Veridian's single hand-built icon set. 24×24 grid, 1.75 strokeWidth,
// round caps. Kills every emoji, unicode arrow and View-geometry icon.
// ─────────────────────────────────────────────────────────────────────────────

export type VIconName =
  | 'home'
  | 'leaf'
  | 'chart'
  | 'person'
  | 'fork'
  | 'car'
  | 'bike'
  | 'bolt'
  | 'flame'
  | 'check'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'close'
  | 'plus'
  | 'search'
  | 'wifi-off'
  | 'trophy'
  | 'lock'
  | 'share'
  | 'edit'
  | 'sparkle'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-right'
  | 'location'
  | 'tree';

interface VIconProps {
  name: VIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function VIcon({
  name,
  size = 24,
  color = colors.textPrimary,
  strokeWidth = 1.75,
}: VIconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Path d="M4 11 L12 4 L20 11" {...common} />
          <Path d="M6 10 V19 A1 1 0 0 0 7 20 H17 A1 1 0 0 0 18 19 V10" {...common} />
        </>
      )}
      {name === 'leaf' && (
        <>
          <Path d="M6 15 C6 8 12 4 19 4 C19 12 15 18 8 18 C7.2 18 6.6 17.8 6 17.4" {...common} />
          <Path d="M5 20 C7 15 10 11 15 8" {...common} />
        </>
      )}
      {name === 'chart' && (
        <>
          <Line x1={5} y1={20} x2={5} y2={12} {...common} />
          <Line x1={12} y1={20} x2={12} y2={5} {...common} />
          <Line x1={19} y1={20} x2={19} y2={9} {...common} />
        </>
      )}
      {name === 'person' && (
        <>
          <Circle cx={12} cy={8} r={3.5} {...common} />
          <Path d="M5 20 C5 16 8 14.5 12 14.5 C16 14.5 19 16 19 20" {...common} />
        </>
      )}
      {name === 'fork' && (
        <>
          <Path d="M7 3 V9 M4.5 3 V7.5 A2.5 2.5 0 0 0 9.5 7.5 V3" {...common} />
          <Line x1={7} y1={9} x2={7} y2={21} {...common} />
          <Path d="M17 3 C15 5 14.5 8 14.5 11 H19.5 C19.5 8 19 5 17 3 Z" {...common} />
          <Line x1={17} y1={11} x2={17} y2={21} {...common} />
        </>
      )}
      {name === 'car' && (
        <>
          <Path d="M5 12 L6.5 7.5 A1.5 1.5 0 0 1 8 6.5 H16 A1.5 1.5 0 0 1 17.5 7.5 L19 12" {...common} />
          <Path d="M4 12 H20 A1 1 0 0 1 21 13 V16.5 H3 V13 A1 1 0 0 1 4 12 Z" {...common} />
          <Circle cx={7.5} cy={16.5} r={1.8} {...common} />
          <Circle cx={16.5} cy={16.5} r={1.8} {...common} />
        </>
      )}
      {name === 'bike' && (
        <>
          <Circle cx={6} cy={16} r={3.5} {...common} />
          <Circle cx={18} cy={16} r={3.5} {...common} />
          <Path d="M6 16 L10 9 H15 L18 16" {...common} />
          <Path d="M10 9 L13 16 H6" {...common} />
          <Line x1={14} y1={6.5} x2={16.5} y2={6.5} {...common} />
          <Line x1={15} y1={6.5} x2={15} y2={9} {...common} />
        </>
      )}
      {name === 'bolt' && (
        <Path d="M13 3 L5 13.5 H11 L10 21 L19 10 H12.5 L13 3 Z" {...common} />
      )}
      {name === 'flame' && (
        <>
          <Path
            d="M12 3 C13 6 16.5 8 16.5 12.5 C16.5 16 14.5 19 12 19 C9.5 19 7.5 16 7.5 12.5 C7.5 10.5 8.5 9 9.5 8 C9.5 9.5 10 10.5 11 11 C10.5 8 11 5 12 3 Z"
            {...common}
          />
          <Path d="M12 19 C10.8 19 10 17.8 10 16.5 C10 15.2 11 14.3 12 13.5 C13 14.3 14 15.2 14 16.5 C14 17.8 13.2 19 12 19 Z" {...common} strokeWidth={strokeWidth * 0.8} />
        </>
      )}
      {name === 'check' && <Polyline points="5,12.5 10,17.5 19,7" {...common} />}
      {name === 'chevron-right' && <Polyline points="9,5 16,12 9,19" {...common} />}
      {name === 'chevron-left' && <Polyline points="15,5 8,12 15,19" {...common} />}
      {name === 'chevron-down' && <Polyline points="5,9 12,16 19,9" {...common} />}
      {name === 'close' && (
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...common} />
          <Line x1={18} y1={6} x2={6} y2={18} {...common} />
        </>
      )}
      {name === 'plus' && (
        <>
          <Line x1={12} y1={5} x2={12} y2={19} {...common} />
          <Line x1={5} y1={12} x2={19} y2={12} {...common} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx={10.5} cy={10.5} r={6} {...common} />
          <Line x1={15.5} y1={15.5} x2={20} y2={20} {...common} />
        </>
      )}
      {name === 'wifi-off' && (
        <>
          <Path d="M5 10 C7 8.2 9.4 7.2 12 7.2 C14.6 7.2 17 8.2 19 10" {...common} />
          <Path d="M8 13.5 C9.2 12.5 10.5 12 12 12 C13.5 12 14.8 12.5 16 13.5" {...common} />
          <Circle cx={12} cy={17.5} r={1} fill={color} stroke="none" />
          <Line x1={4} y1={4} x2={20} y2={20} {...common} />
        </>
      )}
      {name === 'trophy' && (
        <>
          <Path d="M8 4 H16 V10 C16 12.8 14.2 15 12 15 C9.8 15 8 12.8 8 10 V4 Z" {...common} />
          <Path d="M8 6 H5 C5 9 6.5 10.5 8 10.5" {...common} />
          <Path d="M16 6 H19 C19 9 17.5 10.5 16 10.5" {...common} />
          <Line x1={12} y1={15} x2={12} y2={18} {...common} />
          <Line x1={8.5} y1={20} x2={15.5} y2={20} {...common} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x={5.5} y={11} width={13} height={9} rx={2} {...common} />
          <Path d="M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11" {...common} />
          <Circle cx={12} cy={15.5} r={1.2} fill={color} stroke="none" />
        </>
      )}
      {name === 'share' && (
        <>
          <Path d="M12 3 V14" {...common} />
          <Polyline points="8,7 12,3 16,7" {...common} />
          <Path d="M6 11 H5 A1 1 0 0 0 4 12 V19 A1 1 0 0 0 5 20 H19 A1 1 0 0 0 20 19 V12 A1 1 0 0 0 19 11 H18" {...common} />
        </>
      )}
      {name === 'edit' && (
        <>
          <Path d="M15.5 4.5 L19.5 8.5 L9 19 L4.5 19.5 L5 15 L15.5 4.5 Z" {...common} />
          <Line x1={13.5} y1={6.5} x2={17.5} y2={10.5} {...common} />
        </>
      )}
      {name === 'sparkle' && (
        <Path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z" fill={color} stroke="none" />
      )}
      {name === 'arrow-up' && (
        <>
          <Line x1={12} y1={19} x2={12} y2={5} {...common} />
          <Polyline points="6,11 12,5 18,11" {...common} />
        </>
      )}
      {name === 'arrow-down' && (
        <>
          <Line x1={12} y1={5} x2={12} y2={19} {...common} />
          <Polyline points="6,13 12,19 18,13" {...common} />
        </>
      )}
      {name === 'arrow-right' && (
        <>
          <Line x1={5} y1={12} x2={19} y2={12} {...common} />
          <Polyline points="13,6 19,12 13,18" {...common} />
        </>
      )}
      {name === 'location' && (
        <>
          <Path d="M12 21 C12 21 19 14.5 19 9.5 C19 5.9 15.9 3 12 3 C8.1 3 5 5.9 5 9.5 C5 14.5 12 21 12 21 Z" {...common} />
          <Circle cx={12} cy={9.5} r={2.5} {...common} />
        </>
      )}
      {name === 'tree' && (
        <>
          <Path d="M12 3 L7 10 H9.5 L5.5 16 H18.5 L14.5 10 H17 L12 3 Z" {...common} />
          <Line x1={12} y1={16} x2={12} y2={21} {...common} />
        </>
      )}
    </Svg>
  );
}
