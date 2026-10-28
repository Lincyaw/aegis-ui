import { usePageHidden } from '../../hooks/usePageHidden';
import './AmbientBackground.css';

export type AmbientBackgroundVariant = 'page' | 'hero';

export interface AmbientBackgroundProps {
  /**
   * `page` for app pages; `hero` for overview and article heroes, with
   * stronger glows that drift 1.6 times as far.
   */
  variant?: AmbientBackgroundVariant;
  /**
   * Layer height. Defaults to `--ambient-page-height` or
   * `--ambient-hero-height`; the glows scale with the width, not the height.
   */
  height?: number | string;
  className?: string;
}

/**
 * Blue, teal and violet glows drifting across the top of a surface.
 * Render it as the first child of a `position: relative; isolation:
 * isolate` container: the layer spans that container's top edge and
 * paints above its background and beneath its content. The drift pauses
 * while the document is hidden and stays still under
 * prefers-reduced-motion.
 */
export function AmbientBackground({
  variant = 'page',
  height,
  className,
}: AmbientBackgroundProps) {
  const hidden = usePageHidden();
  const cls = [
    'aegis-ambient-background',
    `aegis-ambient-background--${variant}`,
    hidden ? 'aegis-ambient-background--paused' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} style={{ height }} aria-hidden="true">
      <span className="aegis-ambient-background__blob aegis-ambient-background__blob--blue" />
      <span className="aegis-ambient-background__blob aegis-ambient-background__blob--teal" />
      <span className="aegis-ambient-background__blob aegis-ambient-background__blob--violet" />
    </div>
  );
}
