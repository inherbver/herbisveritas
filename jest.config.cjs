// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  // Fix ESM module handling
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\.(ts|tsx)$': ['ts-jest', {
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\.mjs$|uuid|nanoid))'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/', 
    '<rootDir>/tests/',  // Exclure tout le dossier tests (Playwright)
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/test-utils/**',
    '!src/mocks/**',
    '!src/**/index.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  // Parallélisation optimisée
  maxWorkers: process.env.CI ? 1 : '75%',
  // Timeout réduit pour tests plus rapides
  testTimeout: 15000,
  // Cache amélioré pour performances
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  // Reporters avec moins de verbosité en CI
  reporters: process.env.CI ? ['default'] : ['default', 'summary'],
  // Optimisations de performance
  clearMocks: true,
  restoreMocks: true,
  // Bail on first test failure in CI
  bail: process.env.CI ? 1 : false,
  // Configuration pour les tests avec MSW
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)