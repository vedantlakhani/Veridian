import { StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import {
  EnergyGas,
  EnergyGrid,
  EnergySolar,
  EnergyWind,
  FoodFlexitarian,
  FoodOmnivore,
  FoodPescatarian,
  FoodVegan,
  FoodVegetarian,
  MomentBankLink,
  MomentPassport,
  MomentReceiptImport,
  MomentRecap,
  ShoppingHeavy,
  ShoppingMinimal,
  ShoppingModerate,
  StateAllConfirmed,
  StateEmptyFeed,
  StateFirstRun,
  StateNoConnection,
  TransportBike,
  TransportCar,
  TransportTransit,
  TransportWalk,
  type GlyphComponent,
} from './glyphs';

// ─────────────────────────────────────────────────────────────────────────────
// Illustration — the wrapper every glyph renders through. Each glyph sits over
// a single flat tinted shape, offset slightly so the shape reads as light
// falling behind the object rather than a container around it. Sized on the
// 24/48/96 artboard grid; stroke color is theme-driven, never hardcoded
// (DESIGN_DIRECTION.md — Illustration).
// ─────────────────────────────────────────────────────────────────────────────

export type IllustrationName =
  | 'transport.car'
  | 'transport.bike'
  | 'transport.walk'
  | 'transport.transit'
  | 'food.omnivore'
  | 'food.vegetarian'
  | 'food.vegan'
  | 'food.pescatarian'
  | 'food.flexitarian'
  | 'energy.grid'
  | 'energy.solar'
  | 'energy.gas'
  | 'energy.wind'
  | 'shopping.minimal'
  | 'shopping.moderate'
  | 'shopping.heavy'
  | 'state.emptyFeed'
  | 'state.noConnection'
  | 'state.allConfirmed'
  | 'state.firstRun'
  | 'moment.passport'
  | 'moment.recap'
  | 'moment.bankLink'
  | 'moment.receiptImport';

const GLYPHS: Record<IllustrationName, GlyphComponent> = {
  'transport.car': TransportCar,
  'transport.bike': TransportBike,
  'transport.walk': TransportWalk,
  'transport.transit': TransportTransit,
  'food.omnivore': FoodOmnivore,
  'food.vegetarian': FoodVegetarian,
  'food.vegan': FoodVegan,
  'food.pescatarian': FoodPescatarian,
  'food.flexitarian': FoodFlexitarian,
  'energy.grid': EnergyGrid,
  'energy.solar': EnergySolar,
  'energy.gas': EnergyGas,
  'energy.wind': EnergyWind,
  'shopping.minimal': ShoppingMinimal,
  'shopping.moderate': ShoppingModerate,
  'shopping.heavy': ShoppingHeavy,
  'state.emptyFeed': StateEmptyFeed,
  'state.noConnection': StateNoConnection,
  'state.allConfirmed': StateAllConfirmed,
  'state.firstRun': StateFirstRun,
  'moment.passport': MomentPassport,
  'moment.recap': MomentRecap,
  'moment.bankLink': MomentBankLink,
  'moment.receiptImport': MomentReceiptImport,
};

// Default tint per family — category illustrations pick up their category's
// tint automatically; states/moments default to the accent tint. Callers can
// always override via the `tint` prop (e.g. a category-tinted moment card).
function defaultTint(name: IllustrationName): string {
  if (name.startsWith('transport.')) return colors.transportGlow;
  if (name.startsWith('food.')) return colors.foodGlow;
  if (name.startsWith('energy.')) return colors.energyGlow;
  if (name.startsWith('shopping.')) return colors.shoppingGlow;
  return colors.accentSoft;
}

export interface IllustrationProps {
  name: IllustrationName;
  /** Overall artboard size — 24, 48, or 96 per the illustration grid. */
  size?: 24 | 48 | 96 | number;
  /** Background shape tint. Defaults to the category tint, or accentSoft for states/moments. */
  tint?: string;
  /** Glyph stroke color. Defaults to ink. */
  glyphColor?: string;
  strokeWidth?: number;
}

export function Illustration({
  name,
  size = 48,
  tint,
  glyphColor = colors.ink,
  strokeWidth,
}: IllustrationProps) {
  const Glyph = GLYPHS[name];
  const shapeSize = size * 0.86;
  const offset = size * 0.07;
  const glyphSize = size * 0.5;

  return (
    <View style={{ width: size, height: size }}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.center}>
          <View
            style={{
              width: shapeSize,
              height: shapeSize,
              borderRadius: shapeSize / 2,
              backgroundColor: tint ?? defaultTint(name),
              transform: [{ translateX: offset }, { translateY: offset }],
            }}
          />
        </View>
      </View>
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        <Glyph size={glyphSize} color={glyphColor} strokeWidth={strokeWidth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
