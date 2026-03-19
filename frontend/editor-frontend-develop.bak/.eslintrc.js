module.exports = {
  root: true,
  extends: ['@vigour/eslint-config'],
  ignorePatterns: ['dist', '.eslintrc.js', '.eslintrc.cjs'],
  rules: {
    '@typescript-eslint/no-duplicate-enum-values': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },
}
