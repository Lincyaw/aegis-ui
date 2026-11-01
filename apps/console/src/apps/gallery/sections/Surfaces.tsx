import { type ReactNode, useCallback, useState } from 'react';

import {
  Button as AegisButton,
  AmbientBackground,
  ColumnLayout,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  Reveal,
  RunPips,
  type ScrollProgressRange,
  ScrollStory,
  type ScrollStoryStep,
  SectionDivider,
  StatBlock,
  Timeline,
  useScrollProgress,
} from '@lincyaw/aegis-ui';

import { GalleryRouterLink, GalleryRunChecks, Specimen } from '../shared';

/* ── Panel, AmbientBackground and Reveal specimens ─────────────────── */

function GlassPanelSpecimen() {
  return (
    <div
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-tint)',
      }}
    >
      <AmbientBackground variant='hero' height='100%' />
      <div className='gallery__row gallery__row--panels'>
        <Panel variant='glass' title='Glass' description="variant='glass'">
          <p className='gallery__panel-body'>
            Frosted over a gradient or image: translucent fill, backdrop blur
            and a light inner edge.
          </p>
        </Panel>
        <Panel
          variant='glass'
          to='#panel-glass'
          title='Glass link'
          description="variant='glass' · to"
        >
          <p className='gallery__panel-body'>
            A hero card that links somewhere lifts like any linked panel.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function AmbientStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        width: '100%',
        height: 'var(--ambient-page-height)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-page)',
      }}
    >
      {children}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          padding: 'var(--space-6)',
        }}
      >
        <PanelTitle size='lg' as='h3'>
          Traceable SRE diagnosis benchmark
        </PanelTitle>
        <Panel title='Content sits above the glow'>
          <p className='gallery__panel-body'>
            The layer paints over the stage background and under its content.
          </p>
        </Panel>
      </div>
    </div>
  );
}

const REVEAL_CARDS: Array<{ title: string; body: string }> = [
  { title: 'Grading method', body: 'How one run is judged correct.' },
  { title: 'Version update', body: 'What changed and which runs it affects.' },
  { title: 'Case study', body: 'One failure traced through its run.' },
];

function RevealSpecimen() {
  const [round, setRound] = useState(0);
  return (
    <div className='gallery__stack gallery__stack--fill'>
      <div>
        <AegisButton tone='secondary' onClick={() => setRound((r) => r + 1)}>
          Replay
        </AegisButton>
      </div>
      <ColumnLayout key={round} columns='1fr 1fr 1fr' gap='md'>
        {REVEAL_CARDS.map((card, index) => (
          <Reveal key={card.title} staggerIndex={index}>
            <Panel title={card.title}>
              <p className='gallery__panel-body'>{card.body}</p>
            </Panel>
          </Reveal>
        ))}
      </ColumnLayout>
    </div>
  );
}

/* ── useScrollProgress and ScrollStory specimens ───────────────────── */

const SCROLL_PROGRESS_BARS = [0.42, 0.68, 0.55, 0.9, 0.74, 0.31];

interface ScrollProgressReadoutProps {
  range: ScrollProgressRange;
  progress: number;
}

function ScrollProgressReadout({
  range,
  progress,
}: ScrollProgressReadoutProps): ReactNode {
  return (
    <div className='gallery__scroll-progress-row'>
      <MonoValue>{range}</MonoValue>
      <div className='gallery__scroll-progress-track'>
        <div
          className='gallery__scroll-progress-fill'
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className='gallery__scroll-progress-value'>
        {progress.toFixed(2)}
      </span>
    </div>
  );
}

function ScrollProgressSpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const { ref: entryRef, progress: entry } = useScrollProgress<HTMLDivElement>({
    range: 'entry',
    scrollContainer: scroller,
  });
  const { ref: coverRef, progress: cover } = useScrollProgress<HTMLDivElement>({
    range: 'cover',
    scrollContainer: scroller,
  });
  const { ref: containRef, progress: contain } =
    useScrollProgress<HTMLDivElement>({
      range: 'contain',
      scrollContainer: scroller,
    });
  const { ref: exitRef, progress: exit } = useScrollProgress<HTMLDivElement>({
    range: 'exit',
    scrollContainer: scroller,
  });
  const target = useCallback(
    (node: HTMLDivElement | null) => {
      entryRef(node);
      coverRef(node);
      containRef(node);
      exitRef(node);
    },
    [entryRef, coverRef, containRef, exitRef]
  );
  return (
    <div className='gallery__scroll-progress-demo'>
      <div ref={setScroller} className='gallery__scroll-progress-scroller'>
        <p className='gallery__panel-body gallery__scroll-progress-spacer'>
          Scroll down: the chart below draws as it comes into view and undraws
          as you scroll back.
        </p>
        <div ref={target} className='gallery__scroll-progress-target'>
          {SCROLL_PROGRESS_BARS.map((value, index) => (
            <div
              key={index}
              className='gallery__scroll-progress-bar'
              style={{ height: `${value * entry * 100}%` }}
            />
          ))}
        </div>
        <p className='gallery__panel-body gallery__scroll-progress-spacer'>
          Keep scrolling to watch exit run while the chart leaves the top.
        </p>
      </div>
      <div className='gallery__stack'>
        <ScrollProgressReadout range='entry' progress={entry} />
        <ScrollProgressReadout range='cover' progress={cover} />
        <ScrollProgressReadout range='contain' progress={contain} />
        <ScrollProgressReadout range='exit' progress={exit} />
      </div>
    </div>
  );
}

const SCROLL_STORY_RUNS: Array<{
  model: string;
  counts: { passed: number; failed: number; errored: number };
}> = [
  { model: 'GPT-6.1 Sol', counts: { passed: 5, failed: 0, errored: 0 } },
  { model: 'Claude Opus 5.5', counts: { passed: 4, failed: 1, errored: 0 } },
  { model: 'Kimi K3.1 Pro', counts: { passed: 2, failed: 3, errored: 0 } },
  {
    model: 'DeepSeek V4.1 Flash',
    counts: { passed: 1, failed: 3, errored: 1 },
  },
];

const GALLERY_SCROLL_STORY_STEPS: ScrollStoryStep[] = [
  {
    id: 'task',
    title: 'The task is a real incident',
    body: 'Each task replays a production incident: a live cluster, a fault report and a set of hidden checks. The agent reaches the environment only through its tools.',
    visual: (
      <ColumnLayout columns='1fr 1fr 1fr' gap='md'>
        <StatBlock
          direction='vertical'
          emphasized
          label='Rows to export'
          value='260'
        />
        <StatBlock direction='vertical' emphasized label='Tools' value='6' />
        <StatBlock
          direction='vertical'
          emphasized
          label='Hidden checks'
          value='48'
        />
      </ColumnLayout>
    ),
  },
  {
    id: 'runs',
    title: 'Every task runs five times',
    body: 'Five independent runs rule out luck. Each run keeps its full record: reasoning, tool calls and what the environment returned.',
    visual: (
      <div className='gallery__stack'>
        {SCROLL_STORY_RUNS.map((run) => (
          <div key={run.model} className='gallery__scroll-story-run'>
            <span className='gallery__panel-body'>{run.model}</span>
            <RunPips counts={run.counts} />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'checks',
    title: 'Hidden checks decide a pass',
    body: 'A run passes only when every result, plan and safety check passes. There is no partial credit, and the agent never sees the checks.',
    visual: <GalleryRunChecks />,
  },
  {
    id: 'replay',
    title: 'Every score opens a replay',
    body: 'We read every run and mark its key moments, so each number on the page links to the steps that produced it.',
    visual: (
      <Timeline
        variant='numbered'
        items={[
          {
            id: 'explore',
            title: 'Lists the services and both readers',
            timestamp: '#1–#4',
          },
          {
            id: 'cause',
            title: 'Finds the replica still on the old plan',
            timestamp: '#10–#13',
          },
          {
            id: 'fix',
            title: 'Binds the plan on each reader and reads it back',
            timestamp: '#14–#24',
          },
          {
            id: 'prove',
            title: 'Exports 260 rows and compares both ends',
            timestamp: '#25–#38',
          },
        ]}
      />
    ),
  },
];

function ScrollStorySpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(0);
  return (
    <div className='gallery__stack gallery__stack--fill'>
      <MetricLabel as='div'>
        onCurrentChange · step {current + 1} of{' '}
        {GALLERY_SCROLL_STORY_STEPS.length}
      </MetricLabel>
      <div ref={setScroller} className='gallery__scroll-story-scroller'>
        <p className='gallery__panel-body'>
          Scroll inside this frame. The steps move like ordinary text; the panel
          on the right stays and follows the step past the middle.
        </p>
        <ScrollStory
          steps={GALLERY_SCROLL_STORY_STEPS}
          scrollContainer={scroller}
          onCurrentChange={setCurrent}
        />
        <p className='gallery__panel-body'>
          The next section starts here, after the last step.
        </p>
      </div>
    </div>
  );
}

export function SurfacesSection() {
  return (
    <Panel title={<PanelTitle size='lg'>Surface — Panel</PanelTitle>}>
      <SectionDivider>Panel</SectionDivider>
      <div className='gallery__row gallery__row--panels'>
        <Panel
          title='Default panel'
          description='Mean result score · higher is better'
          extra={<MetricLabel>Label</MetricLabel>}
          surface={{
            id: 'gallery.panel.basic',
            kind: 'panel',
            label: 'Default panel',
            askSuggestions: ['What is this panel?', 'Summarize this panel'],
            project: () => ({
              fields: [
                {
                  name: 'shape',
                  type: 'string',
                  value: 'hairline border, 20px radius, resting shadow',
                },
              ],
            }),
          }}
        >
          <p className='gallery__panel-body'>
            Hairline border, 20 px radius, resting shadow. The title accepts a
            string or a rich node; the description carries the metric and its
            direction.
          </p>
        </Panel>

        <Panel padded={false} title='Unpadded'>
          <div className='gallery__panel-no-pad'>
            padded=false — the host owns the layout, e.g. a table.
          </div>
        </Panel>

        <Panel
          elevation='raised'
          title='Raised'
          description="elevation='raised'"
        >
          <p className='gallery__panel-body'>
            Featured content and hero cards sit one step above the resting
            cards.
          </p>
        </Panel>
      </div>

      <SectionDivider extra={<MetricLabel>Variant</MetricLabel>}>
        Panel · variants
      </SectionDivider>
      <div className='gallery__row gallery__row--panels'>
        <Panel variant='tint' title='Tint' description="variant='tint'">
          <p className='gallery__panel-body'>
            Showcase blocks on overview and article pages.
          </p>
        </Panel>

        <Panel variant='brand' title='Brand' description="variant='brand'">
          <p className='gallery__panel-body'>
            Featured content and pinned articles.
          </p>
        </Panel>
      </div>
      <GlassPanelSpecimen />

      <SectionDivider extra={<MetricLabel>Hover · keyboard focus</MetricLabel>}>
        Panel · link
      </SectionDivider>
      <div className='gallery__row gallery__row--panels'>
        <Panel
          to='#panel-link'
          title='How we grade'
          description='Methods · about 5 min'
          extra={<AegisButton tone='ghost'>Save</AegisButton>}
        >
          <p className='gallery__panel-body'>
            The whole card links to the title&apos;s destination and lifts on
            hover; the button in extra stays its own target.
          </p>
        </Panel>

        <Panel
          to='#panel-link'
          variant='brand'
          elevation='raised'
          title='Version update'
          description='Featured · raised'
        >
          <p className='gallery__panel-body'>
            A featured card starts raised and still lifts on hover.
          </p>
        </Panel>

        <Panel
          to='#panel-router-link'
          linkComponent={GalleryRouterLink}
          title='Case analysis'
          description='linkComponent · react-router Link'
        >
          <p className='gallery__panel-body'>
            A routed app passes its Link adapter, so the card navigates through
            the router instead of reloading the page.
          </p>
        </Panel>
      </div>

      <SectionDivider>AmbientBackground</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption="variant='page' · default height --ambient-page-height"
          span={3}
        >
          <AmbientStage>
            <AmbientBackground />
          </AmbientStage>
        </Specimen>
        <Specimen
          caption="variant='hero' · height overridden (default --ambient-hero-height)"
          span={3}
        >
          <AmbientStage>
            <AmbientBackground
              variant='hero'
              height='var(--ambient-page-height)'
            />
          </AmbientStage>
        </Specimen>
      </div>

      <SectionDivider
        extra={<MetricLabel>Plays once on entering the viewport</MetricLabel>}
      >
        Reveal
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='staggerIndex 0 · 1 · 2 · Replay remounts' span={3}>
          <RevealSpecimen />
        </Specimen>
      </div>

      <SectionDivider
        extra={<MetricLabel>Follows the scroll both ways</MetricLabel>}
      >
        useScrollProgress
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption="range='entry' · 'cover' · 'contain' · 'exit' on one element · the bars draw with entry · 1 under reduced motion"
          span={3}
        >
          <ScrollProgressSpecimen />
        </Specimen>
      </div>

      <SectionDivider
        extra={<MetricLabel>Steps scroll, the panel stays</MetricLabel>}
      >
        ScrollStory
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='scrollContainer · the step past the middle of the view is current: index in --accent-brand, text in --text-main, the pinned panel crossfades to its visual over --motion-base · at the end of the scroll the last step becomes current · 768px and narrower: one column, each visual under its step'
          span={3}
        >
          <ScrollStorySpecimen />
        </Specimen>
      </div>
    </Panel>
  );
}
