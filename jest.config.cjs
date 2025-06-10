// jest.config.cjs - Version de débogage
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/actions/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Options de débogage pour identifier les handles ouverts
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 5000,

  // Prévention des fuites de mémoire entre les tests
  clearMocks: true,
  restoreMocks: true,
};
