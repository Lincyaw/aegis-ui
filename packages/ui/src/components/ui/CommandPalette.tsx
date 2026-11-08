import {
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SearchOutlined } from '@ant-design/icons';

import { type Command, formatShortcut } from '../../commands';
import { useStrings } from '../../locale';
import './CommandPalette.css';
import { Dialog } from './Dialog';

export interface CommandPaletteProps {
  open: boolean;
  /** The commands to search, already filtered to what the user may run. */
  commands: Command[];
  /** Runs the picked command; the palette closes itself first. */
  onSelect: (command: Command) => void;
  onClose: () => void;
  /**
   * Group labels in display order. Groups it doesn't list follow in
   * alphabetical order; commands without a group join the locale's
   * `commandGroupOther` ("Other"), which comes last unless listed here.
   */
  groupOrder?: string[];
  title?: string;
  placeholder?: string;
}

interface CommandGroup {
  label: string;
  commands: Command[];
}

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

function groupCommands(
  commands: Command[],
  query: string,
  groupOrder: string[],
  ungrouped: string,
): CommandGroup[] {
  const matches = commands
    .map((cmd) => ({ cmd, score: scoreCommand(cmd, query.trim()) }))
    .filter((m) => m.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.cmd.label.localeCompare(b.cmd.label),
    );

  const byGroup = new Map<string, Command[]>();
  for (const { cmd } of matches) {
    const group = cmd.group ?? ungrouped;
    const list = byGroup.get(group) ?? [];
    list.push(cmd);
    byGroup.set(group, list);
  }

  const rank = (group: string): number => {
    const listed = groupOrder.indexOf(group);
    if (listed !== -1) {
      return listed;
    }
    return group === ungrouped ? Number.MAX_SAFE_INTEGER : groupOrder.length;
  };
  return Array.from(byGroup.entries())
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([label, list]) => ({ label, commands: list }));
}

const NO_GROUP_ORDER: string[] = [];

/**
 * A dialog that searches `commands` and runs the picked one through
 * `onSelect`. The field is a combobox over a listbox of the matches:
 * focus stays in the field while the arrow keys move the active option.
 */
export function CommandPalette({
  open,
  commands,
  onSelect,
  onClose,
  groupOrder = NO_GROUP_ORDER,
  title: titleProp,
  placeholder: placeholderProp,
}: CommandPaletteProps): ReactElement {
  const strings = useStrings();
  const title = titleProp ?? strings.commandPaletteTitle;
  const placeholder = placeholderProp ?? strings.commandPalettePlaceholder;
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();
  const listId = `${idPrefix}-list`;
  const optionId = (index: number): string => `${idPrefix}-option-${index}`;

  // Runs after the Dialog's own effect has focused its panel.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const ungrouped = strings.commandGroupOther;
  const groups = useMemo(
    () => groupCommands(commands, query, groupOrder, ungrouped),
    [commands, query, groupOrder, ungrouped],
  );
  const flat = useMemo(() => groups.flatMap((g) => g.commands), [groups]);
  const hasIcons = flat.some((cmd) => Boolean(cmd.icon));
  const active =
    flat.length === 0 ? -1 : Math.min(activeIndex, flat.length - 1);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const select = (cmd: Command): void => {
    onClose();
    onSelect(cmd);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const count = flat.length;
      if (count > 0) {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex(
          (current) => (Math.min(current, count - 1) + step + count) % count,
        );
      }
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      select(flat[active]);
    }
  };

  let index = 0;
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      width="lg"
      className="aegis-cmdk"
    >
      <div className="aegis-cmdk__field">
        <SearchOutlined className="aegis-cmdk__field-icon" aria-hidden />
        <input
          ref={inputRef}
          className="aegis-cmdk__input"
          type="text"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="aegis-cmdk__results">
        <div
          ref={listRef}
          id={listId}
          className="aegis-cmdk__list"
          role="listbox"
          aria-label={title}
        >
          {groups.map((group, groupIndex) => {
            const labelId = `${idPrefix}-group-${groupIndex}`;
            return (
              <div
                key={group.label}
                className="aegis-cmdk__group"
                role="group"
                aria-labelledby={labelId}
              >
                <div
                  id={labelId}
                  className="aegis-cmdk__group-label"
                  role="presentation"
                >
                  {group.label}
                </div>
                {group.commands.map((cmd) => {
                  const optionIndex = index++;
                  const isActive = optionIndex === active;
                  return (
                    <div
                      key={cmd.id}
                      id={optionId(optionIndex)}
                      className={
                        isActive
                          ? 'aegis-cmdk__option aegis-cmdk__option--active'
                          : 'aegis-cmdk__option'
                      }
                      role="option"
                      aria-selected={isActive}
                      tabIndex={-1}
                      onMouseDown={(event) => {
                        // Keeps focus in the field until the dialog closes.
                        event.preventDefault();
                        select(cmd);
                      }}
                      onMouseMove={() => {
                        if (!isActive) {
                          setActiveIndex(optionIndex);
                        }
                      }}
                    >
                      {hasIcons && (
                        <span className="aegis-cmdk__option-icon" aria-hidden>
                          {cmd.icon}
                        </span>
                      )}
                      <span className="aegis-cmdk__option-body">
                        <span className="aegis-cmdk__option-label">
                          {cmd.label}
                        </span>
                        {cmd.description && (
                          <span className="aegis-cmdk__option-desc">
                            {cmd.description}
                          </span>
                        )}
                      </span>
                      {cmd.shortcut && (
                        <kbd className="aegis-cmdk__option-shortcut">
                          {formatShortcut(cmd.shortcut)}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {flat.length === 0 && (
          <p className="aegis-cmdk__empty" role="status">
            {strings.commandPaletteEmpty}
          </p>
        )}
      </div>
    </Dialog>
  );
}
