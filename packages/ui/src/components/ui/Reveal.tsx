import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import './Reveal.css';

type RevealState = 'unobserved' | 'waiting' | 'entered';

interface RevealProps {
  children: ReactNode;
  /**
   * Position within a group that enters together: delays the entrance by
   * that many `--motion-reveal-stagger`s.
   */
  staggerIndex?: number;
  className?: string;
}

/**
 * Fades its content in and lifts it by `--motion-reveal-offset` the first
 * time it enters the viewport. Content is hidden only while an
 * IntersectionObserver is watching it, so it stays visible without one,
 * and under prefers-reduced-motion it appears without moving.
 */
export function Reveal({ children, staggerIndex = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>('unobserved');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    setState('waiting');
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        setState('entered');
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const cls = [
    'aegis-reveal',
    state === 'unobserved' ? '' : `aegis-reveal--${state}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      ref={ref}
      className={cls}
      style={{ '--aegis-reveal-index': staggerIndex } as CSSProperties}
    >
      {children}
    </div>
  );
}
