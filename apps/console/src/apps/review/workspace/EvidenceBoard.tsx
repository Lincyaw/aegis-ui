import { type ReactElement, useMemo } from 'react';

import {
  ApartmentOutlined,
  BranchesOutlined,
  NodeExpandOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  Button,
  CircuitGraph,
  CircuitLegend,
  type CircuitLegendItem,
} from '@lincyaw/aegis-ui';
import type { Item } from '@lincyaw/review-api';

import {
  buildBoard,
  claimEnds,
  focusLinks,
  ghostId,
  type Graph,
  parseStub,
  stubId,
} from '../evidence/board';
import { thresholdNote } from '../evidence/classify';
import { type ReviewStrings, useReviewStrings } from '../locale/context';

import type { Selection } from './selection';

function legendOf(s: ReviewStrings): CircuitLegendItem[] {
  return [
    { key: 'claimed', label: s.legendClaimed, highlighted: true },
    { key: 'alarm', label: s.legendAlarm, tone: 'alarm' },
    { key: 'caution', label: s.legendCaution, tone: 'caution' },
    { key: 'neutral', label: s.legendNeutral, tone: 'neutral' },
    {
      key: 'vanished',
      label: s.legendVanished,
      tone: 'neutral',
      pattern: 'dashed',
    },
    { key: 'new', label: s.legendNew, tone: 'neutral', pattern: 'dotted' },
    {
      key: 'inferred',
      label: s.legendInferred,
      tone: 'neutral',
      inferred: true,
    },
    { key: 'ghost', label: s.legendGhost, ghost: true },
  ];
}

interface EvidenceBoardProps {
  graph: Graph;
  item: Item;
  /** The nodes drawn. */
  visible: ReadonlySet<string>;
  /** The nodes the view opens on, before anything was added. */
  focusIds: string[];
  /** Chips whose neighbours the reviewer added: their links are drawn too. */
  pivots: string[];
  showAll: boolean;
  /** In the focused view, also draw links between the claim's neighbours. */
  neighbourLinks: boolean;
  expandedIds: string[];
  selection: Selection | undefined;
  onSelect: (selection: Selection) => void;
  onToggleExpand: (id: string) => void;
  /** Adds a node's callers (`in`), callees (`out`) or both to the board. */
  onAddNeighbours: (id: string, side?: 'in' | 'out') => void;
  onShowAll: (showAll: boolean) => void;
  onNeighbourLinks: (on: boolean) => void;
  /** Back to the focused view, or undefined when the board shows it already. */
  onReset: (() => void) | undefined;
}

export function EvidenceBoard({
  graph,
  item,
  visible,
  focusIds,
  pivots,
  showAll,
  neighbourLinks,
  expandedIds,
  selection,
  onSelect,
  onToggleExpand,
  onAddNeighbours,
  onShowAll,
  onNeighbourLinks,
  onReset,
}: EvidenceBoardProps): ReactElement {
  const s = useReviewStrings();
  const selectedWire =
    selection?.kind === 'link' || selection?.kind === 'ghost'
      ? selection.id
      : undefined;
  const links = useMemo(
    () =>
      showAll || neighbourLinks
        ? undefined
        : focusLinks(graph, item, new Set([...claimEnds(item), ...pivots])),
    [graph, item, pivots, showAll, neighbourLinks]
  );
  const board = useMemo(
    () =>
      buildBoard(graph, item, visible, {
        selectedWire,
        stubs: !showAll,
        links,
        s,
      }),
    [graph, item, visible, selectedWire, showAll, links, s]
  );
  const legend = useMemo(() => legendOf(s), [s]);
  // A "+N callers" chip is fitted with the chips it stands beside. Named
  // from the focus alone, so adding neighbours does not move the view.
  const stubIds = useMemo(
    () => focusIds.flatMap((id) => [stubId(id, 'in'), stubId(id, 'out')]),
    [focusIds]
  );
  const selectedNode = selection?.kind === 'node' ? selection.id : undefined;
  const ghosts = new Set(item.focus.claimedLinks.map(ghostId));

  return (
    <div className='review-board'>
      <div className='review-board__bar'>
        <Button
          tone='secondary'
          icon={<NodeExpandOutlined />}
          disabled={selectedNode === undefined || showAll}
          onClick={() => {
            if (selectedNode !== undefined) {
              onAddNeighbours(selectedNode);
            }
          }}
          title={
            selectedNode === undefined
              ? s.expandNeighboursHint
              : s.expandNeighboursOf(selectedNode)
          }
        >
          {s.expandNeighbours}
        </Button>
        {!showAll && (
          <Button
            tone='secondary'
            icon={<BranchesOutlined />}
            aria-pressed={neighbourLinks}
            onClick={() => {
              onNeighbourLinks(!neighbourLinks);
            }}
            title={s.neighbourLinksHint}
          >
            {s.neighbourLinks}
          </Button>
        )}
        <Button
          tone='secondary'
          icon={<ApartmentOutlined />}
          aria-pressed={showAll}
          onClick={() => {
            onShowAll(!showAll);
          }}
          title={s.wholeSystemHint}
        >
          {s.wholeSystem(graph.nodes.size)}
        </Button>
        {onReset !== undefined && (
          <Button
            tone='ghost'
            icon={<UndoOutlined />}
            onClick={onReset}
            title={s.focusResetHint}
          >
            {s.focusReset}
          </Button>
        )}
      </div>
      <div className='review-board__graph'>
        <CircuitGraph
          chips={board.chips}
          wires={board.wires}
          expandedIds={expandedIds}
          onToggleExpand={(chip) => {
            if (parseStub(chip.id) === null) {
              onToggleExpand(chip.id);
            }
          }}
          selectedChipId={selectedNode}
          selectedWireId={selectedWire}
          onSelectChip={(chip) => {
            const stub = parseStub(chip.id);
            if (stub !== null) {
              onAddNeighbours(stub.nodeId, stub.side);
              return;
            }
            onSelect({ kind: 'node', id: chip.id });
          }}
          onSelectWire={(wire, strand) => {
            if (ghosts.has(wire.id)) {
              onSelect({
                kind: 'ghost',
                id: wire.id,
                source: wire.source,
                target: wire.target,
              });
              return;
            }
            if (!graph.links.has(wire.id)) {
              const stub = parseStub(
                wire.source.startsWith('more:') ? wire.source : wire.target
              );
              if (stub !== null) {
                onAddNeighbours(stub.nodeId, stub.side);
              }
              return;
            }
            onSelect({
              kind: 'link',
              id: wire.id,
              pair:
                strand?.sourcePin !== undefined &&
                strand.targetPin !== undefined
                  ? {
                      sourcePort: strand.sourcePin,
                      targetPort: strand.targetPin,
                    }
                  : undefined,
            });
          }}
          focus={{
            ids: showAll ? [...visible] : [...focusIds, ...stubIds],
            core: board.core,
            key: `${item.id}:${showAll ? 'all' : 'focus'}`,
          }}
          legend={
            <CircuitLegend
              items={legend}
              note={thresholdNote(s)}
              collapsible
              defaultCollapsed
            />
          }
          minimap={false}
          ariaLabel={s.boardLabel(item.title)}
        />
      </div>
    </div>
  );
}
