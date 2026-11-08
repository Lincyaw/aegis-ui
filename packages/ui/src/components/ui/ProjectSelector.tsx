import { type ReactNode, useMemo, useState } from 'react';

import { FolderOutlined, SearchOutlined } from '@ant-design/icons';

import type { AegisAction } from '../../agent/core/types';
import { useStrings } from '../../locale';
import { type DropdownItem, DropdownMenu } from './DropdownMenu';
import './ProjectSelector.css';

export interface ProjectOption {
  id: string;
  name: string;
  /** Trailing content on the option row, e.g. a status chip or a count. */
  meta?: ReactNode;
  /** Optional aegis-ui agent action — fired when the option is selected. */
  action?: AegisAction<void, unknown>;
}

interface ProjectSelectorProps {
  projects: ProjectOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Actions below the project list, e.g. "View all projects" / "New project". */
  footerItems?: DropdownItem[];
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
}

export function ProjectSelector({
  projects,
  selectedId,
  onSelect,
  footerItems,
  placeholder,
  className,
  align = 'left',
}: ProjectSelectorProps) {
  const strings = useStrings();
  const [search, setSearch] = useState('');

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId),
    [projects, selectedId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return projects;
    }
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  const dropdownItems: DropdownItem[] = useMemo(() => {
    if (filtered.length === 0) {
      return [
        { key: '__empty', label: strings.noProjectsFound, disabled: true },
      ];
    }
    return filtered.map((p) => ({
      key: p.id,
      label: (
        <span className="aegis-project-selector__option">
          <span
            className={
              p.id === selectedId
                ? 'aegis-project-selector__name aegis-project-selector__name--active'
                : 'aegis-project-selector__name'
            }
          >
            {p.name}
          </span>
          {p.meta && (
            <span className="aegis-project-selector__meta">{p.meta}</span>
          )}
        </span>
      ),
      icon: <FolderOutlined />,
      onClick: () => {
        onSelect(p.id);
        setSearch('');
      },
      action: p.action,
    }));
  }, [filtered, selectedId, onSelect, strings]);

  const searchField = (
    <label className="aegis-project-selector__search">
      <SearchOutlined aria-hidden />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={strings.searchProjectsPlaceholder}
        aria-label={strings.searchProjects}
        className="aegis-project-selector__search-input"
      />
    </label>
  );

  const trigger = (
    <span className="aegis-project-selector__trigger">
      <FolderOutlined className="aegis-project-selector__trigger-icon" />
      <span className="aegis-project-selector__trigger-label">
        {selected?.name ?? placeholder ?? strings.selectProject}
      </span>
      {selected && (
        <span className="aegis-project-selector__trigger-chevron">▼</span>
      )}
    </span>
  );

  const cls = [
    'aegis-project-selector',
    selected ? '' : 'aegis-project-selector--empty',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <DropdownMenu
        trigger={trigger}
        header={searchField}
        items={dropdownItems}
        footerItems={footerItems}
        align={align}
      />
    </div>
  );
}
