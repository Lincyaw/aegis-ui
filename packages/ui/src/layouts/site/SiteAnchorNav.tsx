import { type ReactElement, type ReactNode, useEffect, useRef } from 'react';

import { useSectionSpy } from '../../hooks/useSectionSpy';
import { useStrings } from '../../locale';
import './SiteAnchorNav.css';

export interface SiteAnchorNavItem {
  /** The id of the section, usually a `SiteSection`, the item links to. */
  id: string;
  label: ReactNode;
}

export interface SiteAnchorNavProps {
  /** The page's sections, in document order. */
  items: SiteAnchorNavItem[];
  /** Controls the current item; omit it to follow the scroll position. */
  currentId?: string;
  /** Called with the id that scrolling or a click makes current. */
  onCurrentChange?: (id: string) => void;
  className?: string;
}

/** A section becomes current once its top passes this share of the view. */
const ACTIVATION_PERCENT = 30;

/**
 * The sections of a long page in a band that sticks under the site nav
 * and follows the reader. On a phone the items become a row of chips that
 * scrolls sideways and keeps the current one in view. Sections and pinned
 * panels stop below the band while the page has one.
 */
export function SiteAnchorNav({
  items,
  currentId,
  onCurrentChange,
  className,
}: SiteAnchorNavProps): ReactElement {
  const strings = useStrings();
  const listRef = useRef<HTMLOListElement>(null);
  const { activeId, onLinkClick } = useSectionSpy({
    ids: items.map((item) => item.id),
    activationPercent: ACTIVATION_PERCENT,
    currentId,
    onCurrentChange,
  });

  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>('[aria-current]');
    if (list && link) {
      list.scrollLeft =
        link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
    }
  }, [activeId]);

  return (
    <nav
      aria-label={strings.pageSections}
      className={['aegis-site-anchor-nav', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <ol ref={listRef} className="aegis-site-anchor-nav__list">
        {items.map((item) => {
          const current = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={[
                  'aegis-site-anchor-nav__link',
                  current ? 'aegis-site-anchor-nav__link--current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={current ? 'location' : undefined}
                onClick={(event) => {
                  onLinkClick(event, item.id);
                }}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
