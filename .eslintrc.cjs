/**
 * Strictest reasonable ESLint config for aegis-ui.
 *
 * Rules are chosen to enforce: type safety, immutability where sensible,
 * no implicit any, no unused code, deterministic imports, accessible JSX,
 * presentational-only components (no console / debugger / non-null
 * assertions). All warnings are errors via `--max-warnings 0`.
 */
module.exports = {
  root: true,
  env: { browser: true, es2024: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '.turbo',
    '.eslintrc.cjs',
    'commitlint.config.cjs',
    '**/vite.config.ts',
    'apps/console/**',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./packages/ui/tsconfig.json'],
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  plugins: [
    'react',
    'react-hooks',
    'react-refresh',
    '@typescript-eslint',
    'import',
    'jsx-a11y',
    'unused-imports',
  ],
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: {
        project: ['./packages/ui/tsconfig.json'],
      },
      node: true,
    },
  },
  rules: {
    // React
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-boolean-value': ['error', 'never'],
    'react/jsx-curly-brace-presence': ['error', 'never'],
    'react/jsx-fragments': ['error', 'syntax'],
    'react/jsx-key': 'error',
    'react/jsx-no-useless-fragment': 'error',
    'react/jsx-pascal-case': 'error',
    'react/self-closing-comp': 'error',
    'react/jsx-no-bind': ['warn', { allowArrowFunctions: true }],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',

    // TypeScript — strictest practical
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', disallowTypeAnnotations: true },
    ],
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },
      { selector: 'function', format: ['camelCase', 'PascalCase'] },
      { selector: 'typeLike', format: ['PascalCase'] },
    ],

    // Imports
    'import/order': 'off',
    'import/no-duplicates': 'error',
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'unused-imports/no-unused-imports': 'error',
    'no-duplicate-imports': 'error',

    // Code quality
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'error',
    'no-empty-function': 'error',
    'no-var': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-throw-literal': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'object-shorthand': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    curly: ['error', 'all'],

    // Ban antd static feedback APIs — they render outside ConfigProvider
    // and bypass the scheme-aware theme. Use App.useApp() and call
    // modal.* / message.* / notification.* on the returned instance.
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.object.name='Modal'][callee.property.name=/^(confirm|info|success|error|warning|warn)$/]",
        message:
          'antd Modal.confirm/info/success/error/warning is a static method and ignores ConfigProvider (no dark mode). Use const { modal } = App.useApp(); modal.confirm(...) instead.',
      },
      {
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.object.name='message'][callee.property.name=/^(open|success|error|info|warning|warn|loading|destroy)$/]",
        message:
          'antd message.* is a static API and ignores ConfigProvider. Use const { message } = App.useApp(); message.success(...) instead.',
      },
      {
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.object.name='notification'][callee.property.name=/^(open|success|error|info|warning|warn|destroy)$/]",
        message:
          'antd notification.* is a static API and ignores ConfigProvider. Use const { notification } = App.useApp(); notification.open(...) instead.',
      },
    ],

    // A11y baseline
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
  },
};
