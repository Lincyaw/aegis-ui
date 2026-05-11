// Filter out files that ESLint's `ignorePatterns` skips so lint-staged
// doesn't fail with "File ignored because of a matching ignore pattern"
// under `--max-warnings 0`.
const ESLINT_IGNORED = /(?:^|\/)(vite\.config\.ts|commitlint\.config\.cjs|\.eslintrc\.cjs)$/;
// apps/console/ owns its own eslint / prettier / stylelint configs and
// runs them via its own scripts. Root lint-staged must not touch those
// files.
const CONSOLE = /(?:^|\/)apps\/console\//;
const notConsole = (f) => !CONSOLE.test(f);

module.exports = {
  '*.{ts,tsx}': (files) => {
    const safe = files.filter(notConsole);
    const lintable = safe.filter((f) => !ESLINT_IGNORED.test(f));
    const cmds = [];
    if (lintable.length > 0) {
      cmds.push(`eslint --max-warnings 0 --fix ${lintable.map((f) => `"${f}"`).join(' ')}`);
    }
    if (safe.length > 0) {
      cmds.push(`prettier --write ${safe.map((f) => `"${f}"`).join(' ')}`);
    }
    return cmds;
  },
  '*.css': (files) => {
    const safe = files.filter(notConsole);
    if (safe.length === 0) {
      return [];
    }
    const quoted = safe.map((f) => `"${f}"`).join(' ');
    return [`stylelint --fix ${quoted}`, `prettier --write ${quoted}`];
  },
  '*.{json,md}': (files) => {
    const safe = files.filter(notConsole);
    if (safe.length === 0) {
      return [];
    }
    return [`prettier --write ${safe.map((f) => `"${f}"`).join(' ')}`];
  },
};
