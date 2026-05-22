/**
 * Sidebar tree of sessions for the currently-connected root. Rebuilt
 * each render from the in-store ``childrenByParent`` adjacency. Newly
 * arrived sessions get a 2-second highlight pulse via a CSS class on
 * a recently-seen set we track here in component state.
 */

import {
  Fragment,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  PURPOSE_AUDITOR,
  PURPOSE_EXTRACTOR,
} from '../protocol';
import { useInspectStore } from '../store/useInspectStream';

import './SessionTree.css';

const PULSE_MS = 2000;

function shortId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8);
}

function purposeTag(purpose: string): {
  label: string;
  tone: 'main' | 'extractor' | 'auditor' | 'other';
} {
  if (purpose === PURPOSE_EXTRACTOR) {
    return { label: 'extractor', tone: 'extractor' };
  }
  if (purpose === PURPOSE_AUDITOR) {
    return { label: 'auditor', tone: 'auditor' };
  }
  if (!purpose || purpose === 'root') {
    return { label: 'main', tone: 'main' };
  }
  return { label: purpose, tone: 'other' };
}

interface SessionTreeProps {
  onSelect: (sessionId: string) => void;
  activeSessionId: string | null;
}

export function SessionTree({
  onSelect,
  activeSessionId,
}: SessionTreeProps): ReactElement {
  const inspect = useInspectStore((s) => s.inspect);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newcomers: string[] = [];
    for (const id of inspect.sessions.keys()) {
      if (!seenRef.current.has(id)) {
        seenRef.current.add(id);
        newcomers.push(id);
      }
    }
    if (newcomers.length === 0) {
      return;
    }
    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      for (const n of newcomers) {
        next.add(n);
      }
      return next;
    });
    const timer = setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        for (const n of newcomers) {
          next.delete(n);
        }
        return next;
      });
    }, PULSE_MS);
    return (): void => {
      clearTimeout(timer);
    };
  }, [inspect.sessions]);

  const rootId = inspect.rootSessionId;
  const eventCountBySession = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [sid, items] of inspect.timelinesBySession) {
      counts.set(sid, items.length);
    }
    return counts;
  }, [inspect.timelinesBySession]);

  if (!rootId || !inspect.sessions.has(rootId)) {
    return (
      <div className='lh-tree__empty'>Waiting for root session announcement…</div>
    );
  }

  const renderNode = (id: string, depth: number): ReactElement | null => {
    const node = inspect.sessions.get(id);
    if (!node) {
      return null;
    }
    const children = inspect.childrenByParent.get(id) ?? [];
    const tag = purposeTag(node.purpose);
    const running = node.ended_ts === null;
    const events = eventCountBySession.get(id) ?? 0;
    const isActive = activeSessionId === id;
    const isNew = recentlyAdded.has(id);
    const classes = [
      'lh-tree__row',
      isActive ? 'lh-tree__row--active' : '',
      isNew ? 'lh-tree__row--new' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <Fragment key={id}>
        <button
          type='button'
          className={classes}
          style={{ paddingLeft: `${(depth * 14 + 8).toString()}px` }}
          onClick={() => {
            onSelect(id);
          }}
          title={`${id}\n${node.cwd}`}
        >
          <span
            className={`lh-tree__dot ${running ? 'lh-tree__dot--running' : 'lh-tree__dot--ended'}`}
          />
          <span className={`lh-tree__tag lh-tree__tag--${tag.tone}`}>
            {tag.label}
          </span>
          <span className='lh-tree__id'>{shortId(id)}</span>
          <span className='lh-tree__count'>{events}</span>
        </button>
        {children.map((c) => renderNode(c, depth + 1))}
      </Fragment>
    );
  };

  return <div className='lh-tree'>{renderNode(rootId, 0)}</div>;
}

