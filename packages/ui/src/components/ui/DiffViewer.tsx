import type { CSSProperties } from 'react';

import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

import './DiffViewer.css';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  /** Split (two panes) vs unified (single column). */
  splitView?: boolean;
  /** Granularity. `chars` is expensive for large diffs. */
  compareMethod?: 'chars' | 'words' | 'lines';
  /** Hide unchanged regions and replace with a "show more" affordance. */
  showDiffOnly?: boolean;
  /** Show line numbers. */
  hideLineNumbers?: boolean;
  /** Labels for the two columns (only in split view). */
  leftTitle?: string;
  rightTitle?: string;
  className?: string;
  style?: CSSProperties;
}

const methodMap: Record<
  NonNullable<DiffViewerProps['compareMethod']>,
  DiffMethod
> = {
  chars: DiffMethod.CHARS,
  words: DiffMethod.WORDS,
  lines: DiffMethod.LINES,
};

export function DiffViewer({
  oldValue,
  newValue,
  splitView = true,
  compareMethod = 'lines',
  showDiffOnly = false,
  hideLineNumbers = false,
  leftTitle,
  rightTitle,
  className,
  style,
}: DiffViewerProps) {
  const rootClass = ['aegis-diff-viewer', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={rootClass} style={style}>
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={splitView}
        compareMethod={methodMap[compareMethod]}
        showDiffOnly={showDiffOnly}
        hideLineNumbers={hideLineNumbers}
        leftTitle={leftTitle}
        rightTitle={rightTitle}
        useDarkTheme={false}
        styles={diffStyles}
      />
    </div>
  );
}

const diffStyles = {
  variables: {
    light: {
      diffViewerBackground: 'var(--bg-panel)',
      diffViewerColor: 'var(--text-main)',
      addedBackground: 'var(--diff-added-bg)',
      addedColor: 'var(--diff-added-fg)',
      removedBackground: 'var(--diff-removed-bg)',
      removedColor: 'var(--diff-removed-fg)',
      wordAddedBackground: 'var(--diff-added-word)',
      wordRemovedBackground: 'var(--diff-removed-word)',
      addedGutterBackground: 'var(--diff-added-gutter)',
      removedGutterBackground: 'var(--diff-removed-gutter)',
      gutterBackground: 'var(--bg-muted)',
      gutterBackgroundDark: 'var(--bg-muted)',
      highlightBackground: 'var(--bg-muted)',
      highlightGutterBackground: 'var(--bg-muted)',
      codeFoldGutterBackground: 'var(--bg-muted)',
      codeFoldBackground: 'var(--bg-muted)',
      emptyLineBackground: 'var(--bg-panel)',
      gutterColor: 'var(--text-muted)',
      addedGutterColor: 'var(--text-main)',
      removedGutterColor: 'var(--text-main)',
      codeFoldContentColor: 'var(--text-muted)',
      diffViewerTitleBackground: 'var(--bg-muted)',
      diffViewerTitleColor: 'var(--text-main)',
      diffViewerTitleBorderColor: 'var(--border-hairline)',
    },
  },
  contentText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-13)',
  },
} as const;

export default DiffViewer;
