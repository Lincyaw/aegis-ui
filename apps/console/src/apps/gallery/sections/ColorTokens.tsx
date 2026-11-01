import {
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
} from '@lincyaw/aegis-ui';

import { AMBIENT_WASH, DATA_COLOR_TOKENS } from '../fixtures';
import { Specimen, TokenValue } from '../shared';

const COLOR_TOKEN_GROUPS: Array<{
  label: string;
  tokens: Array<{ name: string; desc: string }>;
}> = [
  {
    label: 'Surface',
    tokens: [
      { name: '--bg-page', desc: 'Page — very light cool grey' },
      { name: '--bg-panel', desc: 'Cards, tables, dialogs' },
      { name: '--bg-muted', desc: 'Table header, segmented track, code' },
      { name: '--bg-tint', desc: 'Cool showcase blocks' },
      { name: '--bg-brand-soft', desc: 'Featured cards, category tags' },
      { name: '--bg-glass', desc: 'Top navigation, floating toolbars' },
      { name: '--bg-glass-strong', desc: 'Dialogs and cards on glass' },
      { name: '--bg-inverted', desc: 'Active / primary — soft near-black' },
      { name: '--bg-backdrop', desc: 'Dialog backdrop, blurred' },
    ],
  },
  {
    label: 'Ink',
    tokens: [
      { name: '--text-main', desc: 'Body and titles' },
      { name: '--text-muted', desc: 'Secondary text, AA on white' },
      { name: '--text-faint', desc: 'Axis ticks, disabled — not for reading' },
      { name: '--text-on-inverted', desc: 'Text on --bg-inverted' },
    ],
  },
  {
    label: 'Border',
    tokens: [
      { name: '--border-hairline', desc: 'Dividers, card strokes' },
      {
        name: '--border-emphasis',
        desc: 'Hover, expanded, secondary controls',
      },
      { name: '--border-glass', desc: 'Inner stroke of glass surfaces' },
    ],
  },
  {
    label: 'Brand & status',
    tokens: [
      { name: '--accent-brand', desc: 'Brand, hero emphasis, focus, nav' },
      { name: '--accent-info', desc: 'Links and clickable text' },
      { name: '--bg-info-soft', desc: 'Info chip, selected row' },
      { name: '--accent-success', desc: 'Passed' },
      { name: '--bg-success-soft', desc: 'Success wash' },
      { name: '--accent-warning', desc: 'Real failures only' },
      { name: '--bg-warning-soft', desc: 'Failure wash' },
      { name: '--ink-warn', desc: 'Caution, not counted' },
      { name: '--bg-warn-soft', desc: 'Caution wash' },
    ],
  },
  {
    label: 'Ambient',
    tokens: [
      { name: '--ambient-1', desc: 'Blue blob centre' },
      { name: '--ambient-2', desc: 'Teal blob centre' },
      { name: '--ambient-3', desc: 'Violet blob centre' },
      { name: '--ambient-hero-1', desc: 'Hero blue blob centre' },
      { name: '--ambient-hero-2', desc: 'Hero teal blob centre' },
      { name: '--ambient-hero-3', desc: 'Hero violet blob centre' },
    ],
  },
];

function TokenSwatch({ name, desc }: { name: string; desc: string }) {
  return (
    <div className='gallery__swatch'>
      <div
        className='gallery__swatch-chip'
        style={{
          background: `var(${name})`,
          outline: 'var(--size-hairline) solid var(--border-hairline)',
        }}
      />
      <div className='gallery__swatch-meta'>
        <MonoValue size='sm' weight='regular'>
          {name}
        </MonoValue>
        <TokenValue name={name} />
        <span className='gallery__swatch-desc'>{desc}</span>
      </div>
    </div>
  );
}

export function ColorTokensSection() {
  return (
    <Panel
      title={<PanelTitle size='lg'>Color &amp; surface tokens</PanelTitle>}
    >
      {COLOR_TOKEN_GROUPS.map((g) => (
        <div key={g.label} className='gallery__stack'>
          <SectionDivider>{g.label}</SectionDivider>
          <div className='gallery__swatches'>
            {g.tokens.map((t) => (
              <TokenSwatch key={t.name} name={t.name} desc={t.desc} />
            ))}
          </div>
        </div>
      ))}

      <SectionDivider>Data-viz colours</SectionDivider>
      <div className='gallery__swatches'>
        {DATA_COLOR_TOKENS.map((t) => (
          <TokenSwatch key={t.name} name={t.name} desc={t.desc} />
        ))}
      </div>

      <SectionDivider>Ambient wash</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='--ambient-1 · --ambient-2 · --ambient-3 radial blobs on --bg-page'
          span={3}
        >
          <div
            style={{
              width: '100%',
              height: 'var(--space-12)',
              borderRadius: 'var(--radius-lg)',
              background: AMBIENT_WASH,
            }}
          />
        </Specimen>
      </div>
    </Panel>
  );
}
