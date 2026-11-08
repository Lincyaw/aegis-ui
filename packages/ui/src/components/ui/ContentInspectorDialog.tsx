import { type ReactElement, useState } from 'react';

import { useStrings } from '../../locale';
import { CodeBlock } from './CodeBlock';
import { ContentPreview } from './ContentPreview';
import { Dialog } from './Dialog';
import { type TabItem, Tabs } from './Tabs';
import {
  type InspectableContent,
  type InspectableContentKind,
  type InspectableContentOptions,
  codeLanguage,
  prepareInspectableContent,
} from './classifyContent';

export interface ContentInspectorDialogProps extends InspectableContentOptions {
  open: boolean;
  content: InspectableContent | null;
  onClose: () => void;
}

const KIND_NAMES: Record<InspectableContentKind, string> = {
  json: 'JSON',
  markdown: 'Markdown',
  sql: 'SQL',
  text: 'Text',
};

/** Shows one piece of content full size, rendered or raw. */
export function ContentInspectorDialog({
  open,
  content,
  onClose,
  markdownPatterns,
}: ContentInspectorDialogProps): ReactElement | null {
  const strings = useStrings();
  const [activeTab, setActiveTab] = useState('rendered');
  // The dialog animates out after the host clears `content`, so it keeps
  // showing the last content. Every opening starts on the rendered tab.
  const [shown, setShown] = useState(content);
  const current = open ? content : null;
  const [openedFor, setOpenedFor] = useState(current);
  if (current !== openedFor) {
    setOpenedFor(current);
    if (current !== null) {
      setShown(current);
      setActiveTab('rendered');
    }
  }

  if (shown === null) {
    return null;
  }

  const prepared = prepareInspectableContent(shown, { markdownPatterns });
  const tabItems: TabItem[] = [
    { key: 'rendered', label: strings.inspectorRendered },
    { key: 'raw', label: strings.inspectorRaw },
  ];

  return (
    <Dialog
      open={current !== null}
      title={shown.title}
      description={`${KIND_NAMES[prepared.kind]} content`}
      onClose={onClose}
      width="lg"
      className="aegis-content-inspector"
    >
      <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab}>
        {activeTab === 'rendered' ? (
          <ContentPreview
            content={shown}
            markdownPatterns={markdownPatterns}
            expanded
          />
        ) : (
          <CodeBlock
            code={prepared.rawText}
            language={codeLanguage(prepared.kind)}
            showLineNumbers={
              prepared.kind === 'json' || prepared.kind === 'sql'
            }
          />
        )}
      </Tabs>
    </Dialog>
  );
}
