import {
  Chip,
  Markdown,
  type MarkdownProps,
  MdxDocument,
  mdxTableOfContents,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
  TableOfContents,
  ThemeToggle,
} from '@lincyaw/aegis-ui';

import { GALLERY_ACTIONS } from '../fixtures';
import GalleryDocument, {
  tableOfContents as galleryDocumentToc,
} from '../GalleryDocument.mdx';
import {
  GalleryRouterLink,
  GalleryRunChecks,
  Specimen,
  TokenValue,
} from '../shared';

const MARKDOWN_DOCUMENT_SAMPLE = `# Injection runbook

Run a fault injection against a staging namespace and collect the traces
the RCA agents read.

## Prepare the target

1. Pick a pedestal that is **healthy** in the cluster view.
2. Confirm the namespace has no injection in flight.

### Configure the fault

| Field    | Example         | Notes                        |
| -------- | --------------- | ---------------------------- |
| Family   | Network chaos   | Partition, delay or loss     |
| Duration | \`300s\`         | Shorter runs miss slow drift |

#### Submit

\`\`\`typescript
await client.injections.create({ family: 'network', durationSec: 300 });
\`\`\`

> Traces land in ClickHouse within a minute of the run finishing.
`;

const GALLERY_DOCUMENT_TOC = mdxTableOfContents(galleryDocumentToc);

const TYPE_SAMPLES: Array<{
  family: 'brand' | 'ui' | 'mono';
  label: string;
  sample: string;
  hint: string;
}> = [
  {
    family: 'brand',
    label: 'Brand · Geist',
    sample: 'Resilience under pressure',
    hint: '--font-brand — brand lockups only',
  },
  {
    family: 'ui',
    label: 'UI · Hanken Grotesk + PingFang SC',
    sample: 'GPT 6.1 Sol · 97.6% · 部署回滚后为批量导出审批执行计划',
    hint: '--font-ui / --font-numeric — Latin, numbers and Chinese; digits share one width',
  },
  {
    family: 'mono',
    label: 'Mono · Google Sans Code',
    sample: '13c2dea9bcbb · tests/grading.toml',
    hint: '--font-mono — ids, paths, code and commands; never numbers',
  },
];

interface TypeRole {
  role: string;
  sample: string;
  use: string;
  family?: 'ui' | 'numeric' | 'mono';
}

const APP_TYPE_ROLES: TypeRole[] = [
  {
    role: 'title',
    sample: '部署回滚后为批量导出审批执行计划',
    use: 'Page title',
  },
  {
    role: 'heading',
    sample: '评分标准',
    use: 'Card, chart and section titles',
  },
  {
    role: 'strong',
    sample: 'GPT 6.1 Sol',
    use: 'Primary column, buttons, tabs',
  },
  {
    role: 'body',
    sample: '两个读端的最终计划都由已批准的 binding 控制才通过。',
    use: 'Body text',
  },
  { role: 'small', sample: '只计入当前规则下的运行', use: 'Secondary notes' },
  { role: 'label', sample: '计入运行', use: 'Table headers, field labels' },
  { role: 'micro', sample: '通过', use: 'Small chips, avatar initials' },
  {
    role: 'numeric',
    sample: '97.6%   22.2%   0.00',
    use: 'Numbers in tables, bars and pips',
    family: 'numeric',
  },
  { role: 'number', sample: '40/41', use: 'Metric figures', family: 'numeric' },
  {
    role: 'mono',
    sample: 'rules:9856f0cb · tests/cases/no_dml.py',
    use: 'Ids, paths and code',
    family: 'mono',
  },
];

const ARTICLE_TYPE_ROLES: TypeRole[] = [
  {
    role: 'display',
    sample: '可追溯的运维诊断评测',
    use: 'Overview hero title',
  },
  { role: 'article-title', sample: '我们怎么评分', use: 'Article title' },
  {
    role: 'article-heading',
    sample: '一道题怎样算正确',
    use: 'Article section',
  },
  {
    role: 'article-subheading',
    sample: '代码检查与评委条目',
    use: 'Article subsection, large card title',
  },
  {
    role: 'article-lead',
    sample: '每道题都有一份评分定义，评分器只按它执行。',
    use: 'Article lead',
  },
  {
    role: 'article-body',
    sample:
      '评分项分属结果、安全、诊断三个维度，判定规则写明维度怎样合成结论。',
    use: 'Article body, 720 column',
  },
  {
    role: 'article-caption',
    sample: '图 1 · 评分流程：门槛未通过时，后面的评分项不再检查。',
    use: 'Figure and table captions',
  },
  {
    role: 'eyebrow',
    sample: '评分方法 · 2026-10-28 · 约 5 分钟',
    use: 'Category, date and reading time',
  },
];

const TYPE_ROLE_FAMILY: Record<NonNullable<TypeRole['family']>, string> = {
  ui: 'var(--font-ui)',
  numeric: 'var(--font-numeric)',
  mono: 'var(--font-mono)',
};

function TypeRoleRow({ role, sample, use, family = 'ui' }: TypeRole) {
  const prefix = `--type-${role}`;
  return (
    <div className='gallery__type-row'>
      <MetricLabel as='div' className='gallery__type-label'>
        {`${prefix}-*`}
      </MetricLabel>
      <div
        style={{
          fontFamily: TYPE_ROLE_FAMILY[family],
          fontSize: `var(${prefix}-size)`,
          lineHeight: `var(${prefix}-line)`,
          fontWeight: `var(${prefix}-weight)`,
          letterSpacing: `var(${prefix}-tracking)`,
          fontVariantNumeric: family === 'numeric' ? 'tabular-nums' : 'normal',
        }}
      >
        {sample}
      </div>
      <span className='gallery__type-hint'>
        {use} · <TokenValue name={`${prefix}-size`} /> /{' '}
        <TokenValue name={`${prefix}-line`} /> ·{' '}
        <TokenValue name={`${prefix}-weight`} />
      </span>
    </div>
  );
}

/* ── Markdown extension demo ───────────────────────────────────────── */

interface GalleryTreeNode {
  type: string;
  value?: string;
  url?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: GalleryTreeNode[];
}

const GALLERY_WIKI_SCHEME = 'wiki:';

function remarkGalleryWikilinks() {
  const visit = (node: GalleryTreeNode): void => {
    if (!node.children) {
      return;
    }
    node.children = node.children.flatMap((child): GalleryTreeNode[] => {
      if (child.type !== 'text' || !child.value?.includes('[[')) {
        visit(child);
        return [child];
      }
      return child.value
        .split(/(\[\[[^\]]+\]\])/)
        .filter(Boolean)
        .map((part) => {
          const slug = /^\[\[([^\]]+)\]\]$/.exec(part)?.[1];
          return slug
            ? {
                type: 'link',
                url: `${GALLERY_WIKI_SCHEME}${slug}`,
                children: [{ type: 'text', value: slug }],
              }
            : { type: 'text', value: part };
        });
    });
  };
  return visit;
}

function galleryTreeText(node: GalleryTreeNode): string {
  return node.value ?? (node.children ?? []).map(galleryTreeText).join('');
}

function rehypeGalleryHeadingIds() {
  const visit = (node: GalleryTreeNode): void => {
    if (node.type === 'element' && /^h[1-6]$/.test(node.tagName ?? '')) {
      const id = galleryTreeText(node)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      node.properties = { ...node.properties, id };
    }
    node.children?.forEach(visit);
  };
  return visit;
}

function galleryUrlTransform(url: string): string | undefined {
  return /^(wiki:|https?:|#|\/)/.test(url) ? url : undefined;
}

const GALLERY_REMARK_PLUGINS: MarkdownProps['remarkPlugins'] = [
  remarkGalleryWikilinks,
];

const GALLERY_REHYPE_PLUGINS: MarkdownProps['rehypePlugins'] = [
  rehypeGalleryHeadingIds,
];

const GALLERY_MARKDOWN_COMPONENTS: MarkdownProps['components'] = {
  a: ({ href, children }) => {
    if (href === undefined) {
      return <del>{children}</del>;
    }
    if (href.startsWith(GALLERY_WIKI_SCHEME)) {
      return <Chip tone='ink'>{children}</Chip>;
    }
    return <a href={href}>{children}</a>;
  },
  h3: ({ id, children }) => (
    <h3 id={id}>
      {children} <MonoValue size='sm'>#{id}</MonoValue>
    </h3>
  ),
};

const GALLERY_WIKI_MARKDOWN = `### Release notes

Rollout touched [[order-svc]] and [[cart-svc]]; see [the runbook](https://example.com).

[blocked link](javascript:alert(1)) is dropped by \`urlTransform\`.`;

const GALLERY_DOCUMENT_COMPONENTS = { RunChecks: GalleryRunChecks };

export function TypographySection() {
  return (
    <Panel title={<PanelTitle size='lg'>Typography</PanelTitle>}>
      <div className='gallery__type-list'>
        {TYPE_SAMPLES.map((s) => (
          <div className='gallery__type-row' key={s.label}>
            <MetricLabel as='div' className='gallery__type-label'>
              {s.label}
            </MetricLabel>
            <div
              className={`gallery__type-sample gallery__type-sample--${s.family}`}
            >
              {s.sample}
            </div>
            <span className='gallery__type-hint'>{s.hint}</span>
          </div>
        ))}
      </div>

      <SectionDivider>Type roles · app pages</SectionDivider>
      <div className='gallery__type-list'>
        {APP_TYPE_ROLES.map((r) => (
          <TypeRoleRow key={r.role} {...r} />
        ))}
      </div>

      <SectionDivider>Type roles · overview and article</SectionDivider>
      <div className='gallery__type-list'>
        {ARTICLE_TYPE_ROLES.map((r) => (
          <TypeRoleRow key={r.role} {...r} />
        ))}
      </div>

      <SectionDivider>PanelTitle scale</SectionDivider>
      <div className='gallery__stack'>
        <PanelTitle size='hero' as='h2'>
          Hero · Display 56
        </PanelTitle>
        <PanelTitle size='lg' as='h3'>
          Large · Title 28
        </PanelTitle>
        <PanelTitle size='base'>Base · Heading 16</PanelTitle>
        <PanelTitle size='sm'>Small · Strong 13</PanelTitle>
      </div>

      <SectionDivider>MonoValue scale</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='sm · regular'>
          <MonoValue size='sm' weight='regular'>
            0.142
          </MonoValue>
        </Specimen>
        <Specimen caption='sm · medium'>
          <MonoValue size='sm'>0.142</MonoValue>
        </Specimen>
        <Specimen caption='base · medium'>
          <MonoValue
            size='base'
            surface={{
              id: 'gallery.mono.value',
              kind: 'value',
              label: 'Demo numeric value',
              askSuggestions: ['What does this number mean?'],
              project: (children) => ({
                fields: [
                  { name: 'value', type: 'number', value: String(children) },
                ],
              }),
            }}
          >
            0.142
          </MonoValue>
        </Specimen>
        <Specimen caption='lg · medium'>
          <MonoValue size='lg'>0.142</MonoValue>
        </Specimen>
        <Specimen caption="tone='success'">
          <MonoValue tone='success'>12</MonoValue>
        </Specimen>
        <Specimen caption="tone='danger'">
          <MonoValue tone='danger'>3</MonoValue>
        </Specimen>
        <Specimen caption="tone='muted'">
          <MonoValue tone='muted'>0</MonoValue>
        </Specimen>
      </div>

      <SectionDivider>MetricLabel</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption="size='sm' (default) · small role">
          <MetricLabel>Last updated 2h ago</MetricLabel>
        </Specimen>
        <Specimen caption="size='sm' · CJK">
          <MetricLabel>只计入当前规则下的运行</MetricLabel>
        </Specimen>
        <Specimen caption="size='xs' · micro role">
          <MetricLabel size='xs'>2h ago</MetricLabel>
        </Specimen>
        <Specimen caption='inverted'>
          <div className='gallery__inverted-host'>
            <MetricLabel inverted>Active</MetricLabel>
          </div>
        </Specimen>
        <Specimen caption="as='div'">
          <MetricLabel as='div'>Block label</MetricLabel>
        </Specimen>
      </div>

      <SectionDivider>Markdown</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='inline + block · fences render as CodeBlock'
          span={2}
        >
          <Markdown>
            {`### Quick **markdown** sample\n\n- Lists work\n- Inline \`code\` and [links](https://example.com)\n\n\`\`\`bash\nkubectl get pods -n aegis\n\`\`\`\n\n> Blockquotes too.`}
          </Markdown>
        </Specimen>
        <Specimen
          caption='remarkPlugins · rehypePlugins · components · urlTransform'
          span={2}
        >
          <Markdown
            remarkPlugins={GALLERY_REMARK_PLUGINS}
            rehypePlugins={GALLERY_REHYPE_PLUGINS}
            components={GALLERY_MARKDOWN_COMPONENTS}
            urlTransform={galleryUrlTransform}
          >
            {GALLERY_WIKI_MARKDOWN}
          </Markdown>
        </Specimen>
        <Specimen caption="variant='document' · heading scale" span={3}>
          <Markdown variant='document'>{MARKDOWN_DOCUMENT_SAMPLE}</Markdown>
        </Specimen>
      </div>

      <SectionDivider>MdxDocument</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='an .mdx module compiled by aegisMdx() · article type roles · fences render as CodeBlock · /… links through linkComponent · imported components and components={…} in the flow keep their own styles · mdxTableOfContents beside it'
          span={3}
        >
          <div className='gallery__toc-demo'>
            <TableOfContents items={GALLERY_DOCUMENT_TOC} />
            <MdxDocument
              content={GalleryDocument}
              components={GALLERY_DOCUMENT_COMPONENTS}
              linkComponent={GalleryRouterLink}
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>SectionDivider</SectionDivider>
      <div className='gallery__stack'>
        <SectionDivider>Plain label</SectionDivider>
        <SectionDivider extra={<MetricLabel>Extra slot</MetricLabel>}>
          With extra
        </SectionDivider>
        <SectionDivider rule={false}>No rule (rule=false)</SectionDivider>
      </div>

      <SectionDivider>ThemeToggle</SectionDivider>
      <div className='gallery__row'>
        {/* right-click any surface/action below (or Cmd/Ctrl+`.`) to open the AskOverlay */}
        <Specimen caption='one-click cycler · light → dark → system'>
          <ThemeToggle action={GALLERY_ACTIONS.themeCycle} />
        </Specimen>
      </div>
    </Panel>
  );
}
