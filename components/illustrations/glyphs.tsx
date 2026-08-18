import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────────
// Glyphs — the line-art vocabulary behind every Illustration (see Illustration.tsx).
// Single-weight stroke, 24×24 artboard, round caps: "drawn with a ruler, not a
// shaky hand" (DESIGN_DIRECTION.md — Illustration). Never filled except for
// small solid accents (wheels, dots) that read as weight, not color.
// ─────────────────────────────────────────────────────────────────────────────

export interface GlyphProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export type GlyphComponent = (props: GlyphProps) => React.JSX.Element;

function common(color: string, strokeWidth: number) {
  return {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
}

function frame(size: number, children: React.ReactNode) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {children}
    </Svg>
  );
}

// ── Transport (4 modes) ─────────────────────────────────────────────────────

export const TransportCar: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M4 16V12.5L6 8h12l2 4.5V16" />
    <Path {...c} d="M4 16h16" />
    <Circle cx={7.5} cy={16} r={1.5} fill={color} stroke="none" />
    <Circle cx={16.5} cy={16} r={1.5} fill={color} stroke="none" />
    <Path {...c} d="M7 8l1-2h8l1 2" />
  </>);
};

export const TransportBike: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Circle {...c} cx={6} cy={17} r={3.25} />
    <Circle {...c} cx={18} cy={17} r={3.25} />
    <Path {...c} d="M6 17l4-8h5l3 8" />
    <Path {...c} d="M10 9h3" />
    <Path {...c} d="M10 9l2.5 5" />
  </>);
};

export const TransportWalk: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Circle cx={14} cy={5} r={1.6} fill={color} stroke="none" />
    <Path {...c} d="M12 8l-3 3 1 4-3 4" />
    <Path {...c} d="M12 8l3 2 3-1" />
    <Path {...c} d="M10 11l3 2 1 6" />
  </>);
};

export const TransportTransit: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Rect {...c} x={5} y={4} width={14} height={13} rx={2.5} />
    <Path {...c} d="M5 11h14" />
    <Path {...c} d="M8 14.5h.01M16 14.5h.01" />
    <Path {...c} d="M8 20l1.5-3M16 20l-1.5-3" />
  </>);
};

// ── Food (5 diets) ───────────────────────────────────────────────────────────

export const FoodOmnivore: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M7 3v8M5.5 3v5.5a1.5 1.5 0 003 0V3M8.5 3v5.5a1.5 1.5 0 01-3 0" />
    <Path {...c} d="M7 11v10" />
    <Path {...c} d="M16 3c1.7 0 3 2 3 5s-1.3 5-3 5" />
    <Path {...c} d="M16 3v18" />
  </>);
};

export const FoodVegetarian: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M12 21c-4.5-1-7-4.5-7-9 4.5 0 8 2.5 9 6" />
    <Path {...c} d="M12 21c4.5-1 7-5.5 7-11-5 0-9 3-10 7.5" />
    <Path {...c} d="M12 21V9" />
  </>);
};

export const FoodVegan: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M12 20c-5-1-8-5-8-11 6 0 9.5 3 10.5 8.5" />
    <Path {...c} d="M12 20V12" />
    <Circle {...c} cx={12} cy={7} r={3} />
  </>);
};

export const FoodPescatarian: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M4 13c3-4 8-6 12-4 2 1 3.5 2.5 4 4-0.5 1.5-2 3-4 4-4 2-9 0-12-4z" />
    <Path {...c} d="M17 9.5l3-3M17 16.5l3 3" />
    <Circle cx={9} cy={12} r={0.8} fill={color} stroke="none" />
  </>);
};

export const FoodFlexitarian: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M9 20c-3.5-1-5.5-3.5-5.5-7C7 13 9.5 15 10.5 18.5" />
    <Path {...c} d="M9 20v-6.5" />
    <Path {...c} d="M15 3v8M13.7 3v4.5a1.3 1.3 0 002.6 0V3" />
    <Path {...c} d="M15 11v9" />
  </>);
};

// ── Home / energy (4 sources) ───────────────────────────────────────────────

export const EnergyGrid: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M13 3L6 13h5l-2 8 8-11h-5l2-7z" />
  </>);
};

export const EnergySolar: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Circle {...c} cx={12} cy={12} r={4} />
    <Path {...c} d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
  </>);
};

export const EnergyGas: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M12 3c1 2.5-2 3.5-2 6a4 4 0 108 0c0-1-.5-1.8-1-2.5.3 2-1 2.5-1.8 1.5C14.5 6.5 13 5 12 3z" />
  </>);
};

export const EnergyWind: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M12 21V6" />
    <Circle cx={12} cy={5.2} r={0.9} fill={color} stroke="none" />
    <Path {...c} d="M12 6l6.5 3.2c1.4.7 1 2.8-.6 2.8H12" />
    <Path {...c} d="M12 12l-5.4-2.3C5.2 9.1 5.6 7 7.2 7c.8 0 1.5.4 1.9 1L12 12" />
  </>);
};

// ── Shopping (3 tiers) ───────────────────────────────────────────────────────

export const ShoppingMinimal: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M7 9h10l-1 11H8L7 9z" />
    <Path {...c} d="M9.5 9V7a2.5 2.5 0 015 0v2" />
  </>);
};

export const ShoppingModerate: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M6 9h9l-1 11H7L6 9z" />
    <Path {...c} d="M8.5 9V7a2 2 0 014 0v2" />
    <Rect {...c} x={15} y={12} width={5} height={5} rx={0.75} />
  </>);
};

export const ShoppingHeavy: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M5 9h8l-1 11H6L5 9z" />
    <Path {...c} d="M7.3 9V7a1.8 1.8 0 013.5 0v2" />
    <Rect {...c} x={13.5} y={11} width={6} height={6} rx={0.75} />
    <Path {...c} d="M13.5 20.5h6" />
  </>);
};

// ── States (4) ───────────────────────────────────────────────────────────────

export const StateEmptyFeed: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Rect {...c} x={4} y={5} width={16} height={4} rx={1.25} />
    <Path {...c} strokeDasharray="1,4" d="M4 13h16M4 17h10" />
  </>);
};

export const StateNoConnection: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M6 10a8.5 8.5 0 0112 0" />
    <Path {...c} d="M9 13.2a4.3 4.3 0 016 0" />
    <Circle cx={12} cy={17} r={1} fill={color} stroke="none" />
    <Line {...c} x1={4} y1={4} x2={20} y2={20} />
  </>);
};

export const StateAllConfirmed: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Circle {...c} cx={12} cy={12} r={8} />
    <Polyline {...c} points="8.5,12.3 11,15 15.5,9" />
  </>);
};

export const StateFirstRun: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M12 3v4M19 6.5l-3 2.3M5 6.5l3 2.3" />
    <Circle {...c} cx={12} cy={14} r={6} />
    <Path {...c} d="M12 10.5v4l2.5 1.5" />
  </>);
};

// ── Moments (4) ──────────────────────────────────────────────────────────────

export const MomentPassport: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Rect {...c} x={5} y={3} width={14} height={18} rx={2} />
    <Circle {...c} cx={12} cy={10} r={3} />
    <Path {...c} d="M8 17c1-1.5 2.5-2.3 4-2.3s3 .8 4 2.3" />
  </>);
};

export const MomentRecap: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M5 19V10M10 19V6M15 19v-7M20 19V4" />
    <Path {...c} d="M4 19h17" />
  </>);
};

export const MomentBankLink: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M4 9l8-5 8 5" />
    <Path {...c} d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9" />
    <Path {...c} d="M3.5 20.5h17" />
  </>);
};

export const MomentReceiptImport: GlyphComponent = ({ size = 24, color = '#0D1117', strokeWidth = 1.8 }) => {
  const c = common(color, strokeWidth);
  return frame(size, <>
    <Path {...c} d="M7 3h10v17l-2.5-1.5L12 20l-2.5-1.5L7 20V3z" />
    <Path {...c} d="M9.5 8h5M9.5 11.5h5M9.5 15h3" />
  </>);
};
