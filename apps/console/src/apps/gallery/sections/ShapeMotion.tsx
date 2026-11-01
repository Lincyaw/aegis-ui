import type { CSSProperties } from 'react';

import {
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
} from '@lincyaw/aegis-ui';

import { AMBIENT_WASH, DATA_COLOR_TOKENS } from '../fixtures';
import { Specimen, TokenValue } from '../shared';

const RADIUS_TOKENS: Array<{ name: string; use: string }> = [
  { name: '--radius-xs', use: 'checkboxes' },
  { name: '--radius-sm', use: 'chip inner corners, check cells' },
  { name: '--radius-md', use: 'inputs, selects, code blocks' },
  { name: '--radius-lg', use: 'cards, panels, dialogs' },
  { name: '--radius-xl', use: 'overview hero, featured cards' },
  { name: '--radius-pill', use: 'buttons, chips, segmented tabs, bars' },
];

const ELEVATION_TOKENS: Array<{ name: string; use: string }> = [
  { name: '--shadow-rest', use: 'cards, panels, selected segment' },
  { name: '--shadow-raised', use: 'hovered clickable cards and rows' },
  { name: '--shadow-overlay', use: 'dialogs, menus, tooltips' },
];

const MOTION_TOKENS: Array<{ name: string; use: string }> = [
  { name: '--motion-fast', use: 'Hover colour, opacity and lift' },
  { name: '--motion-base', use: 'Switching, expanding, segmented slider' },
  { name: '--motion-enter', use: 'Dialog and panel entrance' },
  { name: '--motion-exit', use: 'Dialog and panel exit' },
  { name: '--motion-chart', use: 'Bar draw and number roll' },
  { name: '--motion-stagger-step', use: 'Delay between chart rows' },
  { name: '--motion-lift', use: 'Hover lift of clickable cards and buttons' },
  { name: '--motion-reveal', use: 'Overview and article section reveal' },
  { name: '--motion-reveal-offset', use: 'Reveal rise distance' },
  { name: '--motion-reveal-stagger', use: 'Delay between revealed siblings' },
  { name: '--motion-hero', use: 'Hero text position' },
  { name: '--motion-hero-fade', use: 'Hero text opacity' },
  { name: '--motion-slide', use: 'Hero carousel slide change' },
  { name: '--carousel-dwell', use: 'Time each carousel slide stays' },
  { name: '--motion-ambient', use: 'One loop of the ambient drift' },
];

const GLASS_SURFACE: CSSProperties = {
  border: 'var(--size-hairline) solid var(--border-glass)',
  borderRadius: 'var(--radius-lg)',
  backdropFilter: 'blur(var(--glass-blur))',
  WebkitBackdropFilter: 'blur(var(--glass-blur))',
  boxShadow: 'var(--shadow-rest)',
};

// Busy content under an overlay, so the blur of the layer on top shows.
function LayeredSurface({ overlay }: { overlay: CSSProperties }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius-lg)',
        background: AMBIENT_WASH,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {DATA_COLOR_TOKENS.map((t) => (
          <span
            key={t.name}
            style={{
              width: 'var(--space-8)',
              height: 'var(--space-8)',
              borderRadius: 'var(--radius-circle)',
              background: `var(${t.name})`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 'var(--space-3) var(--space-3) var(--space-3) 40%',
          ...overlay,
        }}
      />
    </div>
  );
}

export function ShapeMotionSection() {
  return (
    <Panel
      title={<PanelTitle size='lg'>Shape, elevation &amp; motion</PanelTitle>}
    >
      <SectionDivider>Radius</SectionDivider>
      <div className='gallery__row'>
        {RADIUS_TOKENS.map((t) => (
          <Specimen key={t.name} caption={`${t.name} · ${t.use}`}>
            <div
              style={{
                width: '100%',
                height: 'var(--space-12)',
                borderRadius: `var(${t.name})`,
                background: 'var(--bg-panel)',
                border: 'var(--size-hairline) solid var(--border-emphasis)',
              }}
            />
          </Specimen>
        ))}
      </div>

      <SectionDivider>Elevation</SectionDivider>
      <div className='gallery__row'>
        {ELEVATION_TOKENS.map((t) => (
          <Specimen key={t.name} caption={`${t.name} · ${t.use}`}>
            <div
              style={{
                flex: '1 1 auto',
                height: 'var(--space-12)',
                margin: 'var(--space-3)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-panel)',
                border: 'var(--size-hairline) solid var(--border-hairline)',
                boxShadow: `var(${t.name})`,
              }}
            />
          </Specimen>
        ))}
      </div>

      <SectionDivider>Glass &amp; backdrop</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='glass · --bg-glass + blur(--glass-blur) + --border-glass + --shadow-rest'
          span={2}
        >
          <LayeredSurface
            overlay={{ ...GLASS_SURFACE, background: 'var(--bg-glass)' }}
          />
        </Specimen>
        <Specimen caption='glass strong · --bg-glass-strong' span={2}>
          <LayeredSurface
            overlay={{
              ...GLASS_SURFACE,
              background: 'var(--bg-glass-strong)',
            }}
          />
        </Specimen>
        <Specimen
          caption='dialog backdrop · --bg-backdrop + blur(--backdrop-blur)'
          span={2}
        >
          <LayeredSurface
            overlay={{
              inset: 0,
              background: 'var(--bg-backdrop)',
              backdropFilter: 'blur(var(--backdrop-blur))',
              WebkitBackdropFilter: 'blur(var(--backdrop-blur))',
            }}
          />
        </Specimen>
      </div>

      <SectionDivider>Focus</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='ring · --focus-ring-width solid --focus-ring-color, offset --focus-ring-offset'>
          <span
            style={{
              display: 'inline-block',
              padding: 'var(--space-1) var(--space-4)',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--bg-inverted)',
              color: 'var(--text-on-inverted)',
              outline: 'var(--focus-ring-width) solid var(--focus-ring-color)',
              outlineOffset: 'var(--focus-ring-offset)',
            }}
          >
            按钮
          </span>
        </Specimen>
        <Specimen caption='field · --accent-brand border + --focus-halo'>
          <span
            style={{
              display: 'block',
              width: '100%',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-panel)',
              border: 'var(--size-hairline) solid var(--accent-brand)',
              boxShadow: 'var(--focus-halo)',
              color: 'var(--text-muted)',
            }}
          >
            搜索
          </span>
        </Specimen>
      </div>

      <SectionDivider>Motion</SectionDivider>
      <div className='gallery__stack'>
        {MOTION_TOKENS.map((t) => (
          <div
            key={t.name}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              gap: 'var(--space-2)',
            }}
          >
            <MonoValue size='sm' weight='regular'>
              {t.name}
            </MonoValue>
            <TokenValue name={t.name} />
            <span className='gallery__type-hint'>{t.use}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
