/**
 * Lock-in for the design-token contract — block reintroduction of raw
 * hex / px / ms / s in component CSS. Token-defining files (theme.css,
 * global resets) are ignored.
 */
module.exports = {
  extends: ['stylelint-config-standard'],
  ignoreFiles: [
    '**/dist/**',
    '**/node_modules/**',
    '.turbo/**',
    'packages/ui/src/styles/theme.css',
    'packages/ui/src/index.css',
    'apps/console/**',
  ],
  rules: {
    /* Tokens are the only source of visual truth. */
    'color-no-hex': true,
    'color-named': 'never',
    'color-function-notation': null,

    /* Raw sizes and durations come from theme.css tokens. px survives
     * only as a media-query breakpoint, because custom properties can't
     * be used inside @media. */
    'unit-disallowed-list': [
      ['px', 'ms', 's'],
      { ignoreMediaFeatureNames: { px: ['max-width', 'min-width'] } },
    ],
    /* px is listed here only because this rule also checks @media params
     * and has no media exemption; unit-disallowed-list bans it elsewhere. */
    'unit-allowed-list': [
      'em',
      'rem',
      'ch',
      '%',
      'vh',
      'vw',
      'fr',
      'deg',
      'px',
    ],

    /* Loosen the standard-config rules that fight our BEM + dark-token
     * conventions. */
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'declaration-empty-line-before': null,
    'no-descending-specificity': null,
    'at-rule-empty-line-before': null,
    'comment-empty-line-before': null,
    'rule-empty-line-before': null,
    'value-keyword-case': null,
    'alpha-value-notation': null,
    'media-feature-range-notation': null,
    'no-duplicate-selectors': null,
    'shorthand-property-no-redundant-values': null,
    'media-query-no-invalid': null,
    'declaration-block-no-redundant-longhand-properties': null,
  },
};
