/**
 * Render a session's message timeline as chat bubbles. Reads
 * ``entry_type: 'message'`` items from the timeline and normalises each
 * one via ``messageAdapter``. Pure presentation — the smooth-scroll
 * behaviour lives in the wrapping view (we don't try to be clever here).
 *
 * Reminder rows (``llmharness.reminder_delivered``) appear inline as a
 * purple chip so reviewers see exactly where the auditor injected.
 */

import { Fragment, type ReactElement, useMemo } from 'react';

import { normalizeMessage, type NormalizedBlock } from '../messageAdapter';
import type { TimelineItem } from '../protocol';

import './ChatTranscript.css';

function jsonText(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function shortId(id: string): string {
  if (id.length <= 8) {
    return id;
  }
  return `…${id.slice(-6)}`;
}

function Block({ block }: { block: NormalizedBlock }): ReactElement {
  switch (block.kind) {
    case 'text':
      return <div className='lh-chat__text'>{block.text}</div>;
    case 'thinking':
      return (
        <details className='lh-chat__thinking'>
          <summary>thinking</summary>
          <pre>{block.text}</pre>
        </details>
      );
    case 'tool_call':
      return (
        <details className='lh-chat__tool lh-chat__tool--call' open>
          <summary>
            <span className='lh-chat__tag'>call</span>
            <span className='lh-chat__tool-name'>{block.name}</span>
            {block.id && (
              <span className='lh-chat__tool-id'>{shortId(block.id)}</span>
            )}
          </summary>
          <pre>{jsonText(block.args)}</pre>
        </details>
      );
    case 'tool_result':
      return (
        <details
          className={`lh-chat__tool lh-chat__tool--result ${
            block.ok ? '' : 'lh-chat__tool--error'
          }`}
        >
          <summary>
            <span className='lh-chat__tag'>{block.ok ? 'result' : 'error'}</span>
            {block.toolCallId && (
              <span className='lh-chat__tool-id'>{shortId(block.toolCallId)}</span>
            )}
          </summary>
          <pre>{block.text.length > 4000 ? `${block.text.slice(0, 4000)}\n…(truncated)` : block.text}</pre>
        </details>
      );
    case 'unknown':
    default:
      return (
        <details className='lh-chat__unknown'>
          <summary>unknown block</summary>
          <pre>{jsonText(block.raw)}</pre>
        </details>
      );
  }
}

interface ChatTranscriptProps {
  items: TimelineItem[];
}

export function ChatTranscript({ items }: ChatTranscriptProps): ReactElement {
  // Filter once per render — items is already bounded, so this is cheap.
  const rows = useMemo(() => {
    return items.filter(
      (it) =>
        it.source === 'entry' &&
        (it.entry_type === 'message' ||
          it.entry_type === 'llmharness.reminder_delivered'),
    );
  }, [items]);

  if (rows.length === 0) {
    return (
      <div className='lh-chat__empty'>No messages yet on this session.</div>
    );
  }

  return (
    <div className='lh-chat'>
      {rows.map((it, idx) => {
        if (it.source !== 'entry') {
          return null;
        }
        if (it.entry_type === 'llmharness.reminder_delivered') {
          const text =
            typeof it.payload.text === 'string' ? it.payload.text : '';
          return (
            <div
              key={`r-${idx.toString()}`}
              className='lh-chat__reminder'
              title='auditor surfaced reminder'
            >
              <span className='lh-chat__reminder-tag'>reminder</span>
              <span className='lh-chat__reminder-text'>{text}</span>
            </div>
          );
        }
        const msg = normalizeMessage(it.payload);
        return (
          <div
            key={`m-${idx.toString()}`}
            className={`lh-chat__msg lh-chat__msg--${msg.role}`}
          >
            <div className='lh-chat__role'>{msg.role}</div>
            <div className='lh-chat__body'>
              {msg.blocks.map((b, bi) => (
                <Fragment key={bi.toString()}>
                  <Block block={b} />
                </Fragment>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
