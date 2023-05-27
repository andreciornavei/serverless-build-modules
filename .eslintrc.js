module.exports = {
  extends: ['alloy', 'alloy/typescript', 'prettier'],
  rules: {
    '@typescript-eslint/consistent-type-definitions': 'off',
    'max-params': 'off',
    'max-depth': 'off',
    complexity: 'off',
  },
  env: {
    node: true,
  },
};
