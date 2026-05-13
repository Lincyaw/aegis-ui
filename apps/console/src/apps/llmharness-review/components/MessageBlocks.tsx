/**
 * Render AgentM-native message content into ReactNodes. The shape of a
 * message's `content` is a list of blocks; each block has a `type` plus
 * type-specific payload. Unknown block types fall through to a JSON dump.
 */

import { type ReactElement, type ReactNode } from 'react';

import './MessageBlocks.css';

interface Block {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
  thinking?: string;
  [k: string]: unknown;
}

function stringify(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderBlock(block: Block, key: number): ReactNode {
  const t = block.type;
  if (t === 'text' && typeof block.text === 'string') {
    return (
      <div key={key} className='llmh-msg__text'>
        {block.text}
      </div>
    );
  }
  if (t === 'thinking') {
    return (
      <details key={key} className='llmh-msg__thinking'>
        <summary>thinking</summary>
        <pre>{block.thinking ?? stringify(block)}</pre>
      </details>
    );
  }
  if (t === 'tool_use') {
    return (
      <div key={key} className='llmh-msg__tool'>
        <div className='llmh-msg__tool-head'>
          <span className='llmh-msg__tool-tag'>tool_use</span>
          <span className='llmh-msg__tool-name'>{block.name ?? '?'}</span>
        </div>
        <pre className='llmh-msg__tool-body'>{stringify(block.input)}</pre>
      </div>
    );
  }
  if (t === 'tool_result') {
    return (
      <div key={key} className='llmh-msg__tool llmh-msg__tool--result'>
        <div className='llmh-msg__tool-head'>
          <span className='llmh-msg__tool-tag'>tool_result</span>
          {block.tool_use_id && (
            <span className='llmh-msg__tool-name'>{String(block.tool_use_id)}</span>
          )}
        </div>
        <pre className='llmh-msg__tool-body'>{stringify(block.content)}</pre>
      </div>
    );
  }
  return (
    <pre key={key} className='llmh-msg__raw'>
      {stringify(block)}
    </pre>
  );
}

export function MessageBlocks({ content }: { content: unknown }): ReactElement {
  if (typeof content === 'string') {
    return <div className='llmh-msg__text'>{content}</div>;
  }
  if (Array.isArray(content)) {
    return (
      <div className='llmh-msg'>
        {(content as Block[]).map((b, i) => renderBlock(b, i))}
      </div>
    );
  }
  return <pre className='llmh-msg__raw'>{stringify(content)}</pre>;
}
