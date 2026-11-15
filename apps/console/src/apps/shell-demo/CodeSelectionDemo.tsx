import { type ReactElement, useEffect, useState } from 'react';

import {
  AnchoredPopover,
  Button,
  CodeBlock,
  type CodeLineRange,
  MetadataList,
  MetricLabel,
  MonoValue,
  type PopoverAnchor,
  SectionDivider,
  StatusDot,
} from '@lincyaw/aegis-ui';

import './shellDemo.css';

const CLOCK_SOURCE = [
  'from datetime import datetime, timedelta',
  '',
  '',
  'class TestClock:',
  '    def __init__(self, start: datetime) -> None:',
  '        self._now = start',
  '',
  '    def now(self) -> datetime:',
  '        return self._now',
  '',
  '    def advance(self, delta: timedelta) -> None:',
  '        self._now += delta',
].join('\n');

/**
 * A CodeBlock whose selected lines open an AnchoredPopover beside them,
 * drawn in the bleed app's main, which the shell positions, and at least
 * its min width wide for the MetadataList that sizes itself to it.
 */
export function CodeSelectionDemo(): ReactElement {
  const [range, setRange] = useState<CodeLineRange | null>(null);
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);
  const [main, setMain] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setMain(document.getElementById('aegis-main'));
  }, []);
  return (
    <>
      <CodeBlock
        language='python'
        code={CLOCK_SOURCE}
        selectedLines={range}
        onSelectLines={(next, nextAnchor) => {
          setRange(next);
          setAnchor(nextAnchor);
        }}
      />
      <AnchoredPopover
        open={range !== null}
        anchor={anchor}
        ariaLabel='选区'
        container={main}
        minWidth
        onClose={() => {
          setRange(null);
          setAnchor(null);
        }}
      >
        <div className='shell-demo__popover'>
          <MetricLabel>
            {range === null
              ? ''
              : range.start === range.end
                ? `第 ${String(range.start)} 行`
                : `第 ${String(range.start)}–${String(range.end)} 行`}
          </MetricLabel>
          <MetadataList
            entries={[
              { label: '所属模块', value: '根/clock', mono: true },
              { label: '文件', value: 'src/clock.py', mono: true },
            ]}
          />
          <SectionDivider variant='group' rule={false}>
            关联需求
          </SectionDivider>
          <span className='shell-demo__row'>
            <StatusDot tone='warning' />
            <MonoValue size='sm'>testability.clock-drives-time</MonoValue>
          </span>
          <span className='shell-demo__row'>
            <StatusDot tone='success' />
            <MonoValue size='sm'>testability.clock-advance</MonoValue>
          </span>
          <span className='shell-demo__row'>
            <Button tone='secondary'>转到模块</Button>
            <Button tone='secondary'>转到需求</Button>
          </span>
        </div>
      </AnchoredPopover>
    </>
  );
}
