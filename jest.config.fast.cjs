// jest.config.fast.cjs - Optimized for performance
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const fastJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.minimal.ts'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Performance optimizations
  maxWorkers: process.env.CI ? 1 : '50%', // Reduced from 75%
  testTimeout: 10000, // Reduced from 15000
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  
  // Bail early on failures for faster feedback
  bail: process.env.CI ? 1 : 2,
  
  // Simplified reporters
  reporters: process.env.CI ? ['default'] : ['default'],
  
  // ESM fixes
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      // Skip type checking for faster compilation
      isolatedModules: true,
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|uuid|nanoid))'
  ],
  
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/', 
    '<rootDir>/tests/',
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/',
    // Skip slow integration tests in fast mode
    '<rootDir>/src/__tests__/integration/',
    // Skip advanced tests that are slow
    '<rootDir>/.*\\.advanced\\.test\\.',
  ],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Minimal coverage collection for speed
  collectCoverageFrom: [
    'src/actions/**/*.{js,jsx,ts,tsx}',
    'src/lib/**/*.{js,jsx,ts,tsx}',
    'src/services/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/test-utils/**',
    '!src/mocks/**',
  ],
  
  coverageThreshold: {
    global: {
      branches: 60, // Reduced for speed
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  
  // Test environment optimizations
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
}

module.exports = createJestConfig(fastJestConfig)