// jest.config.cjs - Ajout pour gérer next-intl
// jest.config.cjs - Configuration finale
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock des assets statiques
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },

  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.test.tsx',
  ],



  // Performance et stabilité
  maxWorkers: '50%',
  testTimeout: 15000, // Augmenté pour les composants avec des effets async
  

  // Coverage (optionnel)
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/jest.setup.ts',
  ],

  // Logs plus silencieux pour les tests
  silent: false,
  verbose: false,
};

module.exports = createJestConfig(customJestConfig);
