import { type ReactElement, type ReactNode, useEffect, useState } from 'react';

import { useSectionSpy } from '../../hooks/useSectionSpy';
import { useStrings } from '../../locale';
import './TableOfContents.css';

export interface TableOfContentsItem {
  /** The id of the section element the item links to. */
  id: string;
  label: ReactNode;
  /** Nesting depth of the section; 2 to 4 indent the label. Defaults to 1. */
  level?: 1 | 2 | 3 | 4;
}

export interface TableOfContentsProps {
  /** The sections in document order. */
  items: TableOfContentsItem[];
  /** Controls the current item; omit it to follow the scroll position. */
  currentId?: string;
  /** Called with the id that scrolling or a click makes current. */
  onCurrentChange?: (id: string) => void;
  /** The element that scrolls the sections; omitted or null means the viewport. */
  scrollContainer?: HTMLElement | null;
  className?: string;
}

/** A section becomes current once its top passes this share of the view. */
const ACTIVATION_PERCENT = 25;

function sectionElements(ids: string[]): Array<HTMLElement | null> {
  return ids.map((id) => document.getElementById(id));
}

/**
 * Changes whenever an element carrying one of the ids appears, disappears
 * or is replaced, so tracking starts over on the elements a lazily rendered
 * body mounts after the table of contents, or re-creates later.
 */
function useSectionElementsVersion(sectionIds: string): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const ids = sectionIds.split(' ');
    let current = sectionElements(ids);
    const observer = new MutationObserver(() => {
      const next = sectionElements(ids);
      if (next.some((element, index) => element !== current[index])) {
        current = next;
        setVersion((value) => value + 1);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [sectionIds]);
  return version;
}

export function TableOfContents({
  items,
  currentId,
  onCurrentChange,
  scrollContainer = null,
  className,
}: TableOfContentsProps): ReactElement {
  const strings = useStrings();
  const ids = items.map((item) => item.id);
  const sectionsVersion = useSectionElementsVersion(ids.join(' '));
  const { activeId, onLinkClick } = useSectionSpy({
    ids,
    activationPercent: ACTIVATION_PERCENT,
    currentId,
    onCurrentChange,
    scrollContainer,
    sectionsVersion,
  });

  const cls = ['aegis-toc', className ?? ''].filter(Boolean).join(' ');

  return (
    <nav aria-label={strings.tableOfContents} className={cls}>
      <ol className="aegis-toc__list">
        {items.map((item) => {
          const current = item.id === activeId;
          const level = item.level ?? 1;
          const linkCls = [
            'aegis-toc__link',
            current ? 'aegis-toc__link--current' : '',
            level > 1 ? `aegis-toc__link--level-${level}` : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={linkCls}
                aria-current={current ? 'location' : undefined}
                onClick={(event) => {
                  onLinkClick(event, item.id);
                }}
              >
                <span className="aegis-toc__indicator" aria-hidden="true" />
                <span className="aegis-toc__label">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
