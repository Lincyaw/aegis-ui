/**
 * Custom ReactFlow node for one harness event.
 *
 * Visual contract: kind chip + summary + source_turns chip. Highlighted
 * when the page's selectedEventId matches.
 */
import { memo } from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';

import './EventNode.css';

export interface EventNodeData {
  id: number;
  kind: string;
  summary: string;
  source_turns: number[];
  highlighted: boolean;
  isNew?: boolean;
  onSelect?: (id: number) => void;
  /**
   * Open a scrollable list of source-turn messages in a modal. Receives
   * the full source_turns array — letting the host show every cited turn
   * at once is much friendlier than jumping the selection (which used to
   * unmount the graph viewport when the user just wanted a peek).
   */
  onOpenTurns?: (turns: number[]) => void;
}

function EventNodeImpl({ data }: NodeProps<EventNodeData>) {
  const cls = [
    'llmh-evt-node',
    `llmh-evt-node--${data.kind}`,
    data.highlighted ? 'llmh-evt-node--active' : '',
    data.isNew ? 'llmh-evt-node--new' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      onClick={data.onSelect ? () => data.onSelect?.(data.id) : undefined}
      role={data.onSelect ? 'button' : undefined}
      tabIndex={data.onSelect ? 0 : undefined}
    >
      <Handle
        type='target'
        position={Position.Top}
        className='llmh-evt-node__handle'
      />
      <div className='llmh-evt-node__head'>
        <span className='llmh-evt-node__kind'>{data.kind}</span>
        <span className='llmh-evt-node__id'>#{data.id}</span>
        {data.source_turns.length > 0 &&
          (data.onOpenTurns ? (
            <button
              type='button'
              className='llmh-evt-node__turns llmh-evt-node__turns--btn'
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenTurns?.(data.source_turns);
              }}
              title='Show source turn messages in a popup'
            >
              ↗ turn {data.source_turns.join(',')}
            </button>
          ) : (
            <span className='llmh-evt-node__turns'>
              turn {data.source_turns.join(',')}
            </span>
          ))}
      </div>
      <div className='llmh-evt-node__summary'>{data.summary}</div>
      <Handle
        type='source'
        position={Position.Bottom}
        className='llmh-evt-node__handle'
      />
    </div>
  );
}

export const EventNode = memo(EventNodeImpl);
