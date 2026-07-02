// Mock react-native-reanimated with a manual mock to avoid __reanimatedLoggerConfig
// dependency introduced in reanimated 3.16+. The /mock entrypoint tries to load
// source files that reference the worklet global, which breaks in Jest.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      Text: require('react-native').Text,
      Image: require('react-native').Image,
      ScrollView: require('react-native').ScrollView,
      FlatList: require('react-native').FlatList,
      call: () => {},
      createAnimatedComponent: (Component) => Component,
      Value: jest.fn(),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      Extrapolate: { CLAMP: 'clamp' },
    },
    Animated: {},
    Easing: {
      linear: jest.fn((t) => t),
      ease: jest.fn((t) => t),
      bezier: jest.fn(() => (t) => t),
      out: jest.fn((fn) => fn),
      in: jest.fn((fn) => fn),
      inOut: jest.fn((fn) => fn),
      cubic: jest.fn((t) => t),
      quad: jest.fn((t) => t),
      bounce: jest.fn((t) => t),
      elastic: jest.fn(() => (t) => t),
      poly: jest.fn(() => (t) => t),
      circle: jest.fn((t) => t),
      sin: jest.fn((t) => t),
      exp: jest.fn((t) => t),
      step0: jest.fn((t) => t),
      step1: jest.fn((t) => t),
    },
    useAnimatedStyle: (fn) => fn(),
    useAnimatedProps: jest.fn((fn) => fn()),
    useSharedValue: (val) => ({ value: val }),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
    withDecay: jest.fn(),
    withRepeat: jest.fn((animation) => animation),
    withSequence: jest.fn(),
    withDelay: jest.fn((_delay, animation) => animation),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    interpolate: jest.fn((val) => val),
    interpolateColor: jest.fn((_val, _input, output) => output[0]),
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    createAnimatedComponent: (Component) => Component,
    useAnimatedGestureHandler: jest.fn(),
    useDerivedValue: jest.fn(),
    scrollTo: jest.fn(),
    measure: jest.fn(),
    cancelAnimation: jest.fn(),
    makeMutable: jest.fn((val) => ({ value: val })),
    LinearTransition: { duration: jest.fn() },
    FadeIn: { duration: jest.fn() },
    FadeOut: { duration: jest.fn() },
    SlideInDown: { duration: jest.fn() },
    SlideOutDown: { duration: jest.fn() },
    ZoomIn: { duration: jest.fn() },
    ZoomOut: { duration: jest.fn() },
    Layout: { duration: jest.fn() },
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    Gesture: {
      Pan: () => ({
        onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }),
      }),
    },
    GestureDetector: ({ children }) => children,
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    State: {},
    TouchableOpacity,
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Circle: View,
    Rect: View,
    Path: View,
    G: View,
    Text: View,
    Line: View,
    Defs: View,
    LinearGradient: View,
    Stop: View,
    Polyline: View,
    Polygon: View,
    Ellipse: View,
  };
});

// Mock expo-sqlite localStorage polyfill (not needed in test env)
jest.mock('expo-sqlite/localStorage/install', () => {});

// Pre-trigger all expo winter lazy globals to avoid "outside test scope" errors at teardown.
// expo/src/winter/runtime.native.ts installs these as lazy properties via installGlobal.
// They fail when first accessed AFTER Jest tears down the module registry.
// Accessing them here (inside test scope) forces eager resolution.
const expoWinterGlobals = [
  '__ExpoImportMetaRegistry',
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'URL',
  'URLSearchParams',
  'structuredClone',
];
expoWinterGlobals.forEach((key) => {
  try {
    // eslint-disable-next-line no-unused-expressions
    void global[key];
  } catch (_e) {
    // Ignore — some may not be defined in all environments
  }
});

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock @react-native-google-signin/google-signin — may not be installed
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
  },
}), { virtual: true });

// Silence noisy act() warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
