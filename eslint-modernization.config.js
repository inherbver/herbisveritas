/**
 * Configuration ESLint pour la modernisation HerbisVeritas
 * À utiliser pendant la phase de refactoring pour détecter les patterns problématiques
 */

import modernizationRules from './eslint-rules/modernization-rules.js';

export default [
  {
    name: 'modernization-rules',
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      modernization: {
        rules: modernizationRules
      }
    },
    rules: {
      // Règles de modernisation critiques
      'modernization/no-duplicate-password-validation': 'error',
      'modernization/no-duplicate-error-handling': 'error',
      'modernization/no-hardcoded-validation': 'error',
      
      // Règles de complexité
      'modernization/max-component-complexity': ['warn', { max: 200 }],
      'modernization/prefer-custom-hooks': 'warn',
      
      // Règles d'architecture moderne
      'modernization/prefer-server-components': 'info',
      
      // Règles ESLint standard pour la modernisation
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', { max: 10 }],
      'max-params': ['warn', { max: 5 }],
      'max-nested-callbacks': ['warn', { max: 3 }],
      
      // Éviter les anti-patterns React
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      
      // TypeScript strict
      '@typescript-eslint/no-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      
      // Import/Export
      'import/no-duplicates': 'error',
      'import/order': ['warn', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'pathGroups': [
          {
            'pattern': '@/**',
            'group': 'internal',
            'position': 'before'
          }
        ],
        'pathGroupsExcludedImportTypes': ['builtin']
      }],
      
      // Performance et bonnes pratiques
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'warn',
      'prefer-template': 'warn',
      'prefer-destructuring': ['warn', {
        'array': true,
        'object': true
      }],
      
      // Sécurité
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // Cohérence
      'consistent-return': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error'
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  
  // Configuration spécifique pour les fichiers de test
  {
    name: 'modernization-tests',
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      // Relaxer certaines règles pour les tests
      'modernization/max-component-complexity': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-any': 'warn', // Parfois nécessaire pour les mocks
      'no-console': 'off' // Autorisé dans les tests
    }
  },
  
  // Configuration pour les scripts de migration
  {
    name: 'modernization-scripts',
    files: ['scripts/**/*.{ts,js}'],
    rules: {
      'no-console': 'off', // Scripts ont besoin de console.log
      'modernization/max-component-complexity': 'off',
      '@typescript-eslint/no-any': 'warn'
    }
  }
];