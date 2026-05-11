import { type ReactElement, type ReactNode, useMemo } from 'react';

import { Link, useLocation } from 'react-router-dom';

import {
  Breadcrumb,
  type BreadcrumbItem,
} from '../../components/ui/Breadcrumb';
import type { AegisApp } from './types';

interface BreadcrumbBarProps {
  apps: AegisApp[];
  activeApp: AegisApp | undefined;
}

/**
 * Derives breadcrumbs from the active app + current URL by matching the
 * URL against the app's declared sidebar nav. Pages that want a richer
 * trail should render their own `<Breadcrumb>` and ignore this default.
 */
export function BreadcrumbBar({
  apps,
  activeApp,
}: BreadcrumbBarProps): ReactElement | null {
  const { pathname } = useLocation();

  const items = useMemo<BreadcrumbItem[]>(() => {
    if (!activeApp) {
      return [];
    }
    const trail: BreadcrumbItem[] = [
      { label: activeApp.label, to: activeApp.basePath },
    ];

    const navItems = (activeApp.sidebar ?? []).flatMap((group) => group.items);
    const match = navItems.find((item) => {
      const full = joinPath(activeApp.basePath, item.to);
      if (item.end) {
        return pathname === full;
      }
      return pathname === full || pathname.startsWith(`${full}/`);
    });
    if (match) {
      trail.push({ label: match.label });
    }
    return trail;
  }, [activeApp, pathname]);

  if (!activeApp || items.length === 0 || apps.length === 0) {
    return null;
  }

  return (
    <div className="aegis-shell__breadcrumb">
      <Breadcrumb items={items} linkComponent={InternalLink} />
    </div>
  );
}

interface InternalLinkProps {
  to: string;
  className?: string;
  children: ReactNode;
}

function InternalLink({
  to,
  className,
  children,
}: InternalLinkProps): ReactElement {
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

function joinPath(base: string, rel: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const r = rel.startsWith('/') ? rel.slice(1) : rel;
  return r ? `${b}/${r}` : b;
}
