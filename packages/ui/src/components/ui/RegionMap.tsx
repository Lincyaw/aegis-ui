import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import './RegionMap.css';
import { RollingValue } from './RollingValue';
import { StatusDot } from './StatusDot';
import { DefaultLink, type LinkComponent } from './linkComponent';
import { type WorkStatus, workStatusDot } from './workStatus';

/**
 * The state of a region, drawn as a dot before its label. `active` is work
 * in progress: the ink dot pulses, as in `ServiceMap`.
 */
export type RegionMapStatus = WorkStatus;

export interface RegionMapRegion {
  id: string;
  /** The region it lies in. A region whose `parentId` names no region is a top-level region. */
  parentId?: string | null;
  label: string;
  /** The tile's accessible name. Default: `label`. */
  ariaLabel?: string;
  /** Default: no dot. */
  status?: RegionMapStatus;
  /** A number at the end of the tile's head, rolling to a new value. */
  count?: number | string;
  /**
   * A state at the end of the tile's head, e.g. a `Chip`. Give a Chip in it
   * `inverted` while the region is selected.
   */
  state?: ReactNode;
  /**
   * Makes the label a link to this destination. The tile stays the map's tab
   * stop: the link is not a tab stop, and Enter on the tile follows it.
   */
  to?: string;
}

export interface RegionMapProps {
  /** The regions in any order; each nests inside the region its `parentId` names. */
  regions: RegionMapRegion[];
  /** The map's accessible name. */
  ariaLabel: string;
  /** The selected region, drawn inverted. */
  selectedId?: string;
  onSelect?: (region: RegionMapRegion) => void;
  /** Renders the labels of regions with `to`. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  className?: string;
  style?: CSSProperties;
}

interface Node {
  region: RegionMapRegion;
  parent: Node | null;
  children: Node[];
  depth: number;
  leaves: number;
}

const MAX_COLUMNS = 4;

function buildForest(regions: RegionMapRegion[]): Node[] {
  const byId = new Map<string, Node>();
  regions.forEach((region) => {
    byId.set(region.id, {
      region,
      parent: null,
      children: [],
      depth: 0,
      leaves: 1,
    });
  });
  const roots: Node[] = [];
  byId.forEach((node) => {
    const pid = node.region.parentId;
    const parent = pid ? byId.get(pid) : undefined;
    // A parent that is the region itself, or lies inside it, would close a
    // cycle; the region becomes a top-level one instead.
    let ancestor = parent;
    while (ancestor !== undefined && ancestor !== node) {
      ancestor = ancestor.parent ?? undefined;
    }
    if (parent && ancestor === undefined) {
      node.parent = parent;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const place = (node: Node, depth: number): number => {
    node.depth = depth;
    node.leaves = node.children.length
      ? node.children.reduce((sum, child) => sum + place(child, depth + 1), 0)
      : 1;
    return node.leaves;
  };
  roots.forEach((root) => {
    place(root, 0);
  });
  return roots;
}

function preorder(nodes: Node[], out: Node[] = []): Node[] {
  nodes.forEach((node) => {
    out.push(node);
    preorder(node.children, out);
  });
  return out;
}

/**
 * A tree of regions drawn as nested tiles that fill their container, like a
 * territory map: each region holds the tiles of the regions inside it, and
 * a region with more regions under it takes more room. Each tile carries a
 * status dot, a label that may be a link, a count and a state slot; the
 * selected tile is inverted. For assistive technology the map is a tree
 * whose regions read in order, each named by its label and described by
 * its count and state.
 */
export function RegionMap({
  regions,
  ariaLabel,
  selectedId,
  onSelect,
  linkComponent: Link = DefaultLink,
  className,
  style,
}: RegionMapProps) {
  const idPrefix = useId();
  const tiles = useRef(new Map<string, HTMLDivElement>());
  const roots = useMemo(() => buildForest(regions), [regions]);
  const order = useMemo(() => preorder(roots), [roots]);
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);

  const indexOf = (id: string | undefined): number =>
    id === undefined ? -1 : order.findIndex((n) => n.region.id === id);
  const focusedIndex = indexOf(focusedId);
  const tabStopId =
    order[focusedIndex >= 0 ? focusedIndex : Math.max(indexOf(selectedId), 0)]
      ?.region.id;

  const focusTile = (node: Node | null | undefined): void => {
    if (!node) {
      return;
    }
    setFocusedId(node.region.id);
    tiles.current.get(node.region.id)?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    node: Node,
  ): void => {
    if (event.target !== event.currentTarget) {
      return;
    }
    const index = order.indexOf(node);
    switch (event.key) {
      case 'ArrowDown':
        focusTile(order[index + 1]);
        break;
      case 'ArrowUp':
        focusTile(order[index - 1]);
        break;
      case 'ArrowRight':
        focusTile(node.children[0]);
        break;
      case 'ArrowLeft':
        focusTile(node.parent);
        break;
      case 'Home':
        focusTile(order[0]);
        break;
      case 'End':
        focusTile(order[order.length - 1]);
        break;
      // The link's click reaches the tile, which selects it too.
      case 'Enter':
        if (node.region.to !== undefined) {
          event.currentTarget
            .querySelector<HTMLElement>(
              ':scope > .aegis-region-map__head .aegis-region-map__label a',
            )
            ?.click();
        } else {
          onSelect?.(node.region);
        }
        break;
      case ' ':
        onSelect?.(node.region);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>, node: Node): void => {
    // Only the innermost tile under the pointer takes the click.
    if (
      !(event.target instanceof Element) ||
      event.target.closest('[role="treeitem"]') !== event.currentTarget
    ) {
      return;
    }
    // A modified click opens the label's link elsewhere and leaves this
    // page's selection alone.
    if (
      (event.ctrlKey || event.metaKey || event.shiftKey) &&
      event.target.closest('.aegis-region-map__label a') !== null
    ) {
      return;
    }
    onSelect?.(node.region);
  };

  const renderTile = (
    node: Node,
    position: number,
    siblings: number,
  ): ReactNode => {
    const { region } = node;
    const selected = region.id === selectedId;
    const hasChildren = node.children.length > 0;
    const hasCount = region.count !== undefined && region.count !== '';
    const hasState = region.state !== undefined && region.state !== null;
    const factsId = `${idPrefix}-${region.id}-facts`;
    const columns = Math.min(Math.ceil(Math.sqrt(node.leaves)), MAX_COLUMNS);
    const cls = [
      'aegis-region-map__tile',
      `aegis-region-map__tile--depth-${String(Math.min(node.depth, 3))}`,
      hasChildren ? '' : 'aegis-region-map__tile--leaf',
      selected ? 'aegis-region-map__tile--selected' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <div
        key={region.id}
        ref={(element) => {
          if (element) {
            tiles.current.set(region.id, element);
          } else {
            tiles.current.delete(region.id);
          }
        }}
        className={cls}
        style={
          {
            '--aegis-region-map-weight': node.leaves,
            '--aegis-region-map-columns': columns,
          } as CSSProperties
        }
        role="treeitem"
        aria-label={region.ariaLabel ?? region.label}
        aria-describedby={hasCount || hasState ? factsId : undefined}
        aria-level={node.depth + 1}
        aria-posinset={position}
        aria-setsize={siblings}
        aria-expanded={hasChildren ? true : undefined}
        aria-selected={selected}
        tabIndex={region.id === tabStopId ? 0 : -1}
        onClick={(event) => {
          handleClick(event, node);
        }}
        onKeyDown={(event) => {
          handleKeyDown(event, node);
        }}
        onFocus={(event) => {
          if (event.target === event.currentTarget) {
            setFocusedId(region.id);
          }
        }}
      >
        <div
          className={[
            'aegis-region-map__head',
            node.depth === 0 ? 'aegis-region-map__head--top' : '',
            selected ? 'aegis-region-map__head--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="aegis-region-map__name">
            {region.status !== undefined && (
              <StatusDot {...workStatusDot(region.status, selected)} />
            )}
            <span className="aegis-region-map__label">
              {region.to === undefined ? (
                region.label
              ) : (
                <Link
                  to={region.to}
                  className="aegis-region-map__link"
                  tabIndex={-1}
                >
                  {region.label}
                </Link>
              )}
            </span>
          </span>
          {(hasCount || hasState) && (
            <span id={factsId} className="aegis-region-map__facts">
              {hasCount && (
                <span className="aegis-region-map__count">
                  <RollingValue value={region.count} />
                </span>
              )}
              {hasState && (
                <span className="aegis-region-map__state">{region.state}</span>
              )}
            </span>
          )}
        </div>
        {hasChildren && (
          <div className="aegis-region-map__regions" role="group">
            {node.children.map((child, index) =>
              renderTile(child, index + 1, node.children.length),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={['aegis-region-map', className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={style}
      role="tree"
      aria-label={ariaLabel}
    >
      {roots.map((root, index) => renderTile(root, index + 1, roots.length))}
    </div>
  );
}
