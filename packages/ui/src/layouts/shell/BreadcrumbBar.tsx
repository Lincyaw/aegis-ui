import { type ReactElement, useMemo } from 'react';

import { useLocation } from 'react-router-dom';

import {
  Breadcrumb,
  type BreadcrumbItem,
} from '../../components/ui/Breadcrumb';
import { RouterLink } from './RouterLink';
import { joinPath, pathOf } from './paths';
import type { AegisApp } from './types';

interface BreadcrumbBarProps {
  activeApp: AegisApp | undefined;
}

/**
 * Derives breadcrumbs from the active app + current URL by matching the
 * URL against the app's declared sidebar nav. Pages that want a richer
 * trail should render their own `<Breadcrumb>` and ignore this default.
 */
export function BreadcrumbBar({
  activeApp,
}: BreadcrumbBarProps): ReactElement | null {
  const { pathname } = useLocation();

  const items = useMemo<BreadcrumbItem[]>(() => {
    if (!activeApp) {
      return [];
    }
    const navItems = (activeApp.sidebar ?? []).flatMap((group) => group.items);
    // The app-root link keeps the root item's query, e.g. a selected scope.
    const rootItem = navItems.find(
      (item) => pathOf(item.to).replace(/^\/+/, '') === '',
    );
    const trail: BreadcrumbItem[] = [
      {
        label: activeApp.label,
        to: joinPath(activeApp.basePath, rootItem?.to ?? ''),
      },
    ];

    const match = navItems.find((item) => {
      const full = joinPath(activeApp.basePath, pathOf(item.to));
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

  if (!activeApp) {
    return null;
  }

  return (
    <div className="aegis-shell__breadcrumb">
      <Breadcrumb items={items} linkComponent={RouterLink} />
    </div>
  );
}
