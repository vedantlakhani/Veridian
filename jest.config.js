/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
  // Extend jest-expo's default transformIgnorePatterns to include additional native modules
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|react-native-svg|react-native-gesture-handler|react-native-reanimated|@supabase|zustand))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Prevent expo winter ImportMetaRegistry lazy-load outside test scope error
    '^expo/src/winter/ImportMetaRegistry$': '<rootDir>/jest.mocks/importMetaRegistry.js',
  },
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};

module.exports = config;
