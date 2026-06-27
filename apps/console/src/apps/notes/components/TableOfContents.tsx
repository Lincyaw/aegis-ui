import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  /** Raw markdown content to extract headings from. */
  content: string;
}

/** Extract h1-h4 headings from markdown source (ATX style). */
function extractHeadings(md: string): TocHeading[] {
  const result: TocHeading[] = [];
  // Match ATX headings (# to ####) at line start.
  const re = /^(#{1,4})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(md)) !== null) {
    const level = match[1].length;
    const raw = match[2].trim();
    // Strip inline markdown (bold, italic, code, links).
    const text = raw
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1');
    // Build a slug matching react-markdown's default heading id behaviour.
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    result.push({ id, text, level });
  }
  return result;
}

/**
 * Fixed-position table of contents sidebar.
 * Renders headings extracted from markdown and highlights the one currently
 * visible using IntersectionObserver.
 */
export function TableOfContents({ content }: TableOfContentsProps): JSX.Element | null {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track which headings are currently intersecting.
  const visibleIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (headings.length === 0) return;

    visibleIds.current.clear();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleIds.current.add(entry.target.id);
          } else {
            visibleIds.current.delete(entry.target.id);
          }
        }
        // Pick the first heading (in document order) that is visible.
        for (const h of headings) {
          if (visibleIds.current.has(h.id)) {
            setActiveId(h.id);
            break;
          }
        }
      },
      { rootMargin: '-60px 0px -75% 0px', threshold: 0 },
    );

    const elements: Element[] = [];
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) {
        observerRef.current.observe(el);
        elements.push(el);
      }
    }

    return () => {
      observerRef.current?.disconnect();
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
    <nav className="notes-toc" aria-label="Table of contents">
      <div className="notes-toc__title">On this page</div>
      <ul className="notes-toc__list">
        {headings.map((h) => (
          <li key={h.id} className="notes-toc__item">
            <button
              type="button"
              className={`notes-toc__link${h.id === activeId ? ' notes-toc__link--active' : ''}`}
              style={{ paddingLeft: `${(h.level - minLevel) * 12 + 8}px` }}
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
