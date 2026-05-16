/**
 * Render a main-agent turn as chat bubbles. The renderer never reads
 * raw block shapes — it consumes a NormalizedTurn from messageAdapter,
 * so as long as the normalizer recognises the source shape, the user
 * sees prose instead of JSON.
 */

import { type ReactElement } from 'react';

import {
  normalizeContent,
  normalizeTurn,
  type NormalizedBlock,
} from '../messageAdapter';
import type { MainTurn } from '../schemas';

import './MessageBlocks.css';

function argsToText(args: unknown): string {
  if (args == null) {
    return '';
  }
  if (typeof args === 'string') {
    return args;
  }
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function shortId(id: string): string {
  if (id.length <= 8) {
    return id;
  }
  return `…${id.slice(-6)}`;
}

function ToolCallBlock({
  name,
  args,
  id,
}: {
  name: string;
  args: unknown;
  id: string;
}): ReactElement {
  return (
    <details className='llmh-msg__tool llmh-msg__tool--call' open>
      <summary className='llmh-msg__tool-head'>
        <span className='llmh-msg__tool-tag'>call</span>
        <span className='llmh-msg__tool-name'>{name}</span>
        {id && <span className='llmh-msg__tool-id'>{shortId(id)}</span>}
      </summary>
      <pre className='llmh-msg__tool-body'>{argsToText(args)}</pre>
    </details>
  );
}

function ToolResultBlock({
  text,
  toolCallId,
  ok,
}: {
  text: string;
  toolCallId: string;
  ok: boolean;
}): ReactElement {
  const cls = [
    'llmh-msg__tool',
    'llmh-msg__tool--result',
    ok ? '' : 'llmh-msg__tool--error',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <details className={cls}>
      <summary className='llmh-msg__tool-head'>
        <span className='llmh-msg__tool-tag'>{ok ? 'result' : 'error'}</span>
        {toolCallId && (
          <span className='llmh-msg__tool-id'>{shortId(toolCallId)}</span>
        )}
        <span className='llmh-msg__tool-id'>
          {text.length.toString()} chars
        </span>
      </summary>
      <pre className='llmh-msg__tool-body'>{text}</pre>
    </details>
  );
}

function renderBlock(block: NormalizedBlock, key: number): ReactElement {
  switch (block.kind) {
    case 'text':
      return (
        <div key={key} className='llmh-msg__text'>
          {block.text}
        </div>
      );
    case 'thinking':
      return (
        <details key={key} className='llmh-msg__thinking'>
          <summary>thinking</summary>
          <pre>{block.text}</pre>
        </details>
      );
    case 'tool_call':
      return (
        <ToolCallBlock
          key={key}
          name={block.name}
          args={block.args}
          id={block.id}
        />
      );
    case 'tool_result':
      return (
        <ToolResultBlock
          key={key}
          text={block.text}
          toolCallId={block.toolCallId}
          ok={block.ok}
        />
      );
    case 'unknown':
      return (
        <pre key={key} className='llmh-msg__raw'>
          {(() => {
            try {
              return JSON.stringify(block.raw, null, 2);
            } catch {
              return String(block.raw);
            }
          })()}
        </pre>
      );
  }
}

interface MessageBlocksProps {
  /** Pass a full MainTurn (preferred — role drives bubble styling). */
  turn?: MainTurn;
  /** Or pass just the content array / string. */
  content?: unknown;
}

export function MessageBlocks({
  turn,
  content,
}: MessageBlocksProps): ReactElement {
  if (turn) {
    const n = normalizeTurn(turn);
    const cls = ['llmh-msg', `llmh-msg--${n.role}`].join(' ');
    return (
      <div className={cls}>{n.blocks.map((b, i) => renderBlock(b, i))}</div>
    );
  }
  const blocks = normalizeContent(content);
  return (
    <div className='llmh-msg'>{blocks.map((b, i) => renderBlock(b, i))}</div>
  );
}
