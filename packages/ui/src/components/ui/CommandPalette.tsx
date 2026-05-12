import {
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAegisAction } from '../../agent/hooks';
import { type Command, formatShortcut, useCommands } from '../../commands';
import './CommandPalette.css';

interface ScoredCommand {
  cmd: Command;
  score: number;
}

const OTHER_GROUP = 'Other';

function scoreCommand(cmd: Command, query: string): number {
  if (!query) {
    return 1;
  }
  const q = query.toLowerCase();
  const label = cmd.label.toLowerCase();
  if (label.startsWith(q)) {
    return 4;
  }
  if (label.includes(q)) {
    return 3;
  }
  if (cmd.keywords?.some((k) => k.toLowerCase().includes(q))) {
    return 2;
  }
  if (cmd.description?.toLowerCase().includes(q)) {
    return 1;
  }
  return 0;
}

function groupOrder(a: string, b: string): number {
  const aQuick = a.toLowerCase().includes('quick');
  const bQuick = b.toLowerCase().includes('quick');
  if (aQuick && !bQuick) {
    return -1;
  }
  if (bQuick && !aQuick) {
    return 1;
  }
  if (a === OTHER_GROUP && b !== OTHER_GROUP) {
    return 1;
  }
  if (b === OTHER_GROUP && a !== OTHER_GROUP) {
    return -1;
  }
  return a.localeCompare(b);
}

export function CommandPalette(): ReactElement | null {
  const { commands, paletteOpen, setPaletteOpen, execute } = useCommands();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus after the modal mounts.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [paletteOpen]);

  const mode: 'command' | 'content' | 'ai' = useMemo(() => {
    if (query.startsWith('>')) {
      return 'content';
    }
    if (query.startsWith('?')) {
      return 'ai';
    }
    return 'command';
  }, [query]);

  const effectiveQuery = useMemo(() => {
    if (mode === 'command') {
      return query;
    }
    return query.slice(1).trim();
  }, [mode, query]);

  const groups = useMemo(() => {
    if (mode !== 'command') {
      return [];
    }
    const scored: ScoredCommand[] = commands
      .map((cmd) => ({ cmd, score: scoreCommand(cmd, effectiveQuery) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.cmd.label.localeCompare(b.cmd.label);
      });

    const byGroup = new Map<string, Command[]>();
    for (const { cmd } of scored) {
      const g = cmd.group ?? OTHER_GROUP;
      const list = byGroup.get(g) ?? [];
      list.push(cmd);
      byGroup.set(g, list);
    }
    return Array.from(byGroup.entries())
      .sort(([a], [b]) => groupOrder(a, b))
      .map(([label, items]) => ({ label, items }));
  }, [commands, effectiveQuery, mode]);

  const flatResults = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (selectedIndex >= flatResults.length) {
      setSelectedIndex(0);
    }
  }, [flatResults.length, selectedIndex]);

  if (!paletteOpen) {
    return null;
  }

  const handleClose = (): void => {
    setPaletteOpen(false);
  };

  const handleSelect = (cmd: Command): void => {
    setPaletteOpen(false);
    void execute(cmd.id).catch((err: unknown) => {
      console.error('[command]', cmd.id, err);
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flatResults.length > 0) {
        setSelectedIndex((i) => (i + 1) % flatResults.length);
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flatResults.length > 0) {
        setSelectedIndex((i) => (i === 0 ? flatResults.length - 1 : i - 1));
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedIndex < flatResults.length) {
        handleSelect(flatResults[selectedIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
    }
  };

  const indexOf = (cmd: Command): number =>
    flatResults.findIndex((c) => c.id === cmd.id);

  return (
    <div
      className="aegis-cmdk"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        className="aegis-cmdk__backdrop"
        aria-label="Close command palette"
        onClick={handleClose}
      />
      <div className="aegis-cmdk__card">
        <div className="aegis-cmdk__input-row">
          <input
            ref={inputRef}
            className="aegis-cmdk__input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or '>' to search…"
            aria-label="Command search"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="aegis-cmdk__results">
          {mode === 'content' && (
            <div className="aegis-cmdk__hint">
              Content search is not yet wired.
            </div>
          )}
          {mode === 'ai' && (
            <div className="aegis-cmdk__hint">
              Ask AI — agent integration not yet wired.
            </div>
          )}

          {mode === 'command' && flatResults.length === 0 && (
            <div className="aegis-cmdk__hint">No commands match.</div>
          )}

          {mode === 'command' &&
            groups.map((group) => (
              <div key={group.label} className="aegis-cmdk__group">
                <div className="aegis-cmdk__group-label">{group.label}</div>
                {group.items.map((cmd) => {
                  const idx = indexOf(cmd);
                  return (
                    <CommandPaletteRow
                      key={cmd.id}
                      cmd={cmd}
                      active={idx === selectedIndex}
                      onSelect={() => handleSelect(cmd)}
                      onHover={() => setSelectedIndex(idx)}
                    />
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

interface CommandPaletteRowProps {
  cmd: Command;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function CommandPaletteRow({
  cmd,
  active,
  onSelect,
  onHover,
}: CommandPaletteRowProps): ReactElement {
  useAegisAction<void, unknown>(cmd.action);
  return (
    <button
      type="button"
      className={['aegis-cmdk__row', active ? 'aegis-cmdk__row--active' : '']
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
      onMouseEnter={onHover}
      data-agent-action-id={cmd.action?.id}
    >
      {cmd.icon && <span className="aegis-cmdk__row-icon">{cmd.icon}</span>}
      <span className="aegis-cmdk__row-body">
        <span className="aegis-cmdk__row-label">{cmd.label}</span>
        {cmd.description && (
          <span className="aegis-cmdk__row-desc">{cmd.description}</span>
        )}
      </span>
      {cmd.shortcut && (
        <span className="aegis-cmdk__row-shortcut">
          {formatShortcut(cmd.shortcut)}
        </span>
      )}
    </button>
  );
}

export default CommandPalette;
