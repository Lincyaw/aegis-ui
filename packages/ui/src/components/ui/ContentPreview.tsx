import type { ReactElement } from 'react';

import { CodeBlock } from './CodeBlock';
import './ContentPreview.css';
import { Markdown } from './Markdown';
import {
  type ContentSection,
  type InspectableContent,
  type InspectableContentOptions,
  codeLanguage,
  collectContentSections,
  prepareInspectableContent,
} from './classifyContent';

export interface ContentPreviewProps extends InspectableContentOptions {
  content: InspectableContent;
  className?: string;
  /** Full height with line numbers, as in the inspector dialog. */
  expanded?: boolean;
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function duplicateLabel(count: number): string {
  return `+${String(count)} ${count === 1 ? 'duplicate' : 'duplicates'}`;
}

interface PartProps {
  expanded: boolean;
  options: InspectableContentOptions;
}

function StringValuePreview({
  value,
  expanded,
  options,
}: PartProps & { value: string }): ReactElement {
  const prepared = prepareInspectableContent(
    { title: 'string', value },
    options,
  );

  if (prepared.kind === 'json' && prepared.value !== value) {
    return (
      <JsonCompactPreview
        value={prepared.value}
        expanded={expanded}
        options={options}
      />
    );
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

function JsonContentSectionPreview({
  section,
  expanded,
  options,
}: PartProps & { section: ContentSection }): ReactElement {
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
      <StringValuePreview
        value={section.value}
        expanded={expanded}
        options={options}
      />
    </section>
  );
}

function JsonCompactPreview({
  value,
  expanded,
  options,
}: PartProps & { value: unknown }): ReactElement {
  const sections = collectContentSections(value, options);

  if (sections.length > 0) {
    return (
      <div className="aegis-content-json">
        {sections.map((section) => (
          <JsonContentSectionPreview
            key={section.id}
            section={section}
            expanded={expanded}
            options={options}
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

/**
 * Renders inspectable content by its kind: the rich-text strings inside
 * JSON as sections, Markdown rendered, SQL and other JSON as code.
 */
export function ContentPreview({
  content,
  className,
  expanded = false,
  markdownPatterns,
}: ContentPreviewProps): ReactElement {
  const options: InspectableContentOptions = { markdownPatterns };
  const prepared = prepareInspectableContent(content, options);
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
        <JsonCompactPreview
          value={prepared.value}
          expanded={expanded}
          options={options}
        />
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
        <StringValuePreview
          value={prepared.text}
          expanded={expanded}
          options={options}
        />
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
