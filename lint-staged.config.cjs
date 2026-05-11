// Filter out files that ESLint's `ignorePatterns` skips so lint-staged
// doesn't fail with "File ignored because of a matching ignore pattern"
// under `--max-warnings 0`.
const ESLINT_IGNORED = /(?:^|\/)(vite\.config\.ts|commitlint\.config\.cjs|\.eslintrc\.cjs)$/;

module.exports = {
  '*.{ts,tsx}': (files) => {
    const lintable = files.filter((f) => !ESLINT_IGNORED.test(f));
    const cmds = [];
    if (lintable.length > 0) {
      cmds.push(`eslint --max-warnings 0 --fix ${lintable.map((f) => `"${f}"`).join(' ')}`);
    }
    cmds.push(`prettier --write ${files.map((f) => `"${f}"`).join(' ')}`);
    return cmds;
  },
  '*.css': ['stylelint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
};
