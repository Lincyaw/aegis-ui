import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { extractHeadings } from '../lib/headings';

interface TableOfContentsProps {
  /** Raw markdown content to extract headings from. */
  content: string;
}

/**
 * Fixed-position table of contents sidebar.
 * Renders headings extracted from markdown and highlights the one currently
 * visible using IntersectionObserver.
 */
export function TableOfContents({
  content,
}: TableOfContentsProps): JSX.Element | null {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    // Track which headings are currently intersecting.
    const visibleIds = new Set<string>();
    const headerHeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();

    const intersections = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id);
          } else {
            visibleIds.delete(entry.target.id);
          }
        }
        // Pick the first heading (in document order) that is visible.
        for (const h of headings) {
          if (visibleIds.has(h.id)) {
            setActiveId(h.id);
            break;
          }
        }
      },
      { rootMargin: `-${headerHeight} 0px -75% 0px`, threshold: 0 }
    );

    // The note body can render its headings after this effect (the markdown
    // renderer loads lazily) and re-creates them when its renderers change,
    // so follow whichever element currently carries each heading id.
    const observed = new Map<string, Element>();
    const syncObserved = (): void => {
      for (const { id } of headings) {
        const el = document.getElementById(id);
        const prev = observed.get(id);
        if (el === prev) continue;
        if (prev) {
          intersections.unobserve(prev);
          visibleIds.delete(id);
          observed.delete(id);
        }
        if (el) {
          intersections.observe(el);
          observed.set(id, el);
        }
      }
    };
    syncObserved();
    const mutations = new MutationObserver(syncObserved);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      intersections.disconnect();
    };
  }, [headings]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (headings.length < 2) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav className='notes-toc' aria-label='Table of contents'>
      <div className='notes-toc__title'>On this page</div>
      <ul className='notes-toc__list'>
        {headings.map((h) => (
          <li key={h.id} className='notes-toc__item'>
            <button
              type='button'
              className={`notes-toc__link${h.id === activeId ? ' notes-toc__link--active' : ''}`}
              style={
                { '--notes-toc-depth': h.level - minLevel } as CSSProperties
              }
              onClick={() => handleClick(h.id)}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
