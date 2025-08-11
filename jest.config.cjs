// jest.config.cjs - Ajout pour gérer next-intl
// jest.config.cjs - Configuration finale
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Mock des assets statiques
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
  },

  // Fix ESM issues with Supabase dependencies
  transformIgnorePatterns: [
    "node_modules/(?!(isows|@supabase/realtime-js|@supabase/supabase-js)/)"
  ],

  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{ts,tsx}",
    "<rootDir>/src/**/*.test.{ts,tsx}",
    "<rootDir>/src/**/*.spec.{ts,tsx}"
  ],

  // Performance et stabilité
  maxWorkers: "50%",
  testTimeout: 15000, // Augmenté pour les composants avec des effets async

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.tsx",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/jest.setup.ts",
    "!src/app/layout.tsx",
    "!src/app/**/layout.tsx",
    "!src/app/**/loading.tsx",
    "!src/app/**/not-found.tsx",
    "!src/i18n/**",
    "!src/types/**",
    "!src/test-utils/**",
    "!src/mocks/**"
  ],

  coverageThreshold: {
    global: {
      statements: 30,  // Start with achievable goals, increase over time
      branches: 25,
      functions: 30,
      lines: 30
    },
    "./src/stores/": {
      statements: 80,  // Critical: Cart store must be well tested
      branches: 75,
      functions: 80,
      lines: 80
    },
    "./src/actions/authActions.ts": {
      statements: 80,  // Critical: Authentication
      branches: 75,
      functions: 80,
      lines: 80
    },
    "./src/actions/cartActions.ts": {
      statements: 80,  // Critical: Cart operations
      branches: 75,
      functions: 80,
      lines: 80
    }
  },

  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageDirectory: "coverage",

  // Logs configuration
  silent: false,
  verbose: true,  // Show individual test results
};

module.exports = createJestConfig(customJestConfig);
