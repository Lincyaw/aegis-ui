import { type ReactElement, useEffect, useState } from 'react';

import { Modal } from 'antd';

import { CodeBlock } from './CodeBlock';
import {
  type InspectableContent,
  type InspectableContentKind,
  normalizeInspectableText,
  prepareInspectableContent,
} from './ContentInspectorContent';
import './ContentInspectorDialog.css';
import { Markdown } from './Markdown';
import { MetricLabel } from './MetricLabel';
import { type TabItem, Tabs } from './Tabs';

export interface ContentPreviewProps {
  content: InspectableContent;
  className?: string;
  expanded?: boolean;
}

export interface ContentInspectorDialogProps {
  open: boolean;
  content: InspectableContent | null;
  onClose: () => void;
  width?: number | string;
}

function codeLanguage(kind: InspectableContentKind): 'json' | 'sql' | 'text' {
  if (kind === 'json' || kind === 'sql') {
    return kind;
  }
  return 'text';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

interface JsonContentSection {
  id: string;
  paths: string[];
  value: string;
  kind: InspectableContentKind;
}

function StringValuePreview({
  value,
  expanded,
}: {
  value: string;
  expanded: boolean;
}): ReactElement {
  const prepared = prepareInspectableContent({ title: 'string', value });

  if (prepared.kind === 'json' && prepared.value !== value) {
    return <JsonCompactPreview value={prepared.value} expanded={expanded} />;
  }
  if (prepared.kind === 'markdown') {
    return (
      <Markdown className="aegis-content-json__markdown">
        {prepared.text}
      </Markdown>
    );
  }
  if (prepared.kind === 'sql') {
    return (
      <CodeBlock
        className="aegis-content-json__code"
        code={prepared.text}
        language="sql"
        showLineNumbers={expanded}
      />
    );
  }
  return <p className="aegis-content-json__text">{prepared.text}</p>;
}

function pathLabel(path: string[]): string {
  if (path.length === 0) {
    return 'content';
  }
  return path.join('.');
}

function arrayPath(index: number): string {
  return `[${index}]`;
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function collectJsonContentSections(
  value: unknown,
  path: string[] = [],
  sections: JsonContentSection[] = [],
): JsonContentSection[] {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectJsonContentSections(entry, [...path, arrayPath(index)], sections),
    );
    return sections;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, entry]) =>
      collectJsonContentSections(entry, [...path, key], sections),
    );
    return sections;
  }
  if (typeof value === 'string') {
    const prepared = prepareInspectableContent({
      title: pathLabel(path),
      value,
    });
    if (prepared.kind === 'json' && prepared.value !== value) {
      const before = sections.length;
      collectJsonContentSections(prepared.value, path, sections);
      if (sections.length === before) {
        sections.push({
          id: pathLabel(path),
          paths: [pathLabel(path)],
          value: prepared.text,
          kind: 'json',
        });
      }
      return sections;
    }
    const normalized = normalizeInspectableText(value);
    const isRichText =
      prepared.kind === 'markdown' ||
      prepared.kind === 'sql' ||
      normalized.includes('\n');
    if (isRichText) {
      sections.push({
        id: `${pathLabel(path)}:${sections.length}`,
        paths: [pathLabel(path)],
        value,
        kind: prepared.kind,
      });
    }
    return sections;
  }
  return sections;
}

function dedupeJsonContentSections(
  sections: JsonContentSection[],
): JsonContentSection[] {
  const byContent = new Map<string, JsonContentSection>();
  sections.forEach((section) => {
    const key = `${section.kind}\u0000${section.value}`;
    const existing = byContent.get(key);
    if (existing === undefined) {
      byContent.set(key, { ...section, paths: [...section.paths] });
      return;
    }
    existing.paths.push(...section.paths);
  });
  return [...byContent.values()].map((section, index) => ({
    ...section,
    id: `${section.paths[0]}:${index}`,
  }));
}

function duplicateLabel(count: number): string {
  return `+${count} ${count === 1 ? 'duplicate' : 'duplicates'}`;
}

function JsonContentSectionPreview({
  section,
  expanded,
}: {
  section: JsonContentSection;
  expanded: boolean;
}): ReactElement {
  return (
    <section className="aegis-content-json__section">
      <div className="aegis-content-json__section-head">
        <span className="aegis-content-json__path">{section.paths[0]}</span>
        {section.paths.length > 1 ? (
          <span
            className="aegis-content-json__duplicates"
            title={section.paths.slice(1).join('\n')}
          >
            {duplicateLabel(section.paths.length - 1)}
          </span>
        ) : null}
        <span className="aegis-content-json__kind">{section.kind}</span>
      </div>
      <StringValuePreview value={section.value} expanded={expanded} />
    </section>
  );
}

function JsonCompactPreview({
  value,
  expanded,
}: {
  value: unknown;
  expanded: boolean;
}): ReactElement {
  const sections = dedupeJsonContentSections(collectJsonContentSections(value));

  if (sections.length > 0) {
    return (
      <div className="aegis-content-json">
        {sections.map((section) => (
          <JsonContentSectionPreview
            key={section.id}
            section={section}
            expanded={expanded}
          />
        ))}
      </div>
    );
  }

  return (
    <CodeBlock
      className="aegis-content-preview__code"
      code={stringifyJson(value)}
      language="json"
      showLineNumbers={expanded}
    />
  );
}

export function ContentPreview({
  content,
  className,
  expanded = false,
}: ContentPreviewProps): ReactElement {
  const prepared = prepareInspectableContent(content);
  const cls = [
    'aegis-content-preview',
    `aegis-content-preview--${prepared.kind}`,
    expanded ? 'aegis-content-preview--expanded' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (prepared.kind === 'json') {
    return (
      <div className={cls}>
        <JsonCompactPreview value={prepared.value} expanded={expanded} />
      </div>
    );
  }
  if (prepared.kind === 'markdown') {
    return (
      <div className={cls}>
        <Markdown className="aegis-content-preview__markdown">
          {prepared.text}
        </Markdown>
      </div>
    );
  }
  if (prepared.kind === 'text') {
    return (
      <div className={cls}>
        <StringValuePreview value={prepared.text} expanded={expanded} />
      </div>
    );
  }
  return (
    <div className={cls}>
      <CodeBlock
        className="aegis-content-preview__code"
        code={prepared.text}
        language={codeLanguage(prepared.kind)}
        showLineNumbers={expanded}
      />
    </div>
  );
}

export function ContentInspectorDialog({
  open,
  content,
  onClose,
  width = 'clamp(36rem, 50vw, 60rem)',
}: ContentInspectorDialogProps): ReactElement | null {
  const [activeTab, setActiveTab] = useState('rendered');

  useEffect(() => {
    if (open) {
      setActiveTab('rendered');
    }
  }, [open, content]);

  if (content === null) {
    return null;
  }

  const prepared = prepareInspectableContent(content);
  const tabItems: TabItem[] = [
    { key: 'rendered', label: 'Rendered' },
    { key: 'raw', label: 'Raw' },
  ];

  return (
    <Modal
      title={content.title}
      open={open}
      footer={null}
      onCancel={onClose}
      width={width}
      className="aegis-content-inspector-modal"
    >
      <div className="aegis-content-inspector">
        <MetricLabel>{prepared.kind} content</MetricLabel>
        <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab}>
          <div className="aegis-content-inspector__body">
            {activeTab === 'rendered' ? (
              <ContentPreview content={content} expanded />
            ) : (
              <CodeBlock
                code={prepared.rawText}
                language={codeLanguage(prepared.kind)}
                showLineNumbers={
                  prepared.kind === 'json' || prepared.kind === 'sql'
                }
              />
            )}
          </div>
        </Tabs>
      </div>
    </Modal>
  );
}

export default ContentInspectorDialog;
