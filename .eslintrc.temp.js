module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    'no-useless-escape': 'warn',
    'no-prototype-builtins': 'warn',
    'no-async-promise-executor': 'warn',
    'react-hooks/exhaustive-deps': 'warn'
  }
}