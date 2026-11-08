import type { Item } from '@lincyaw/review-api';

export type RailFilter = 'all' | 'todo' | 'done';

/** Items in rail order: by group, then by context, as the API lists them. */
export function railOrder(items: Item[]): Item[] {
  const groups = new Map<string, Map<string, Item[]>>();
  for (const item of items) {
    const g = item.group ?? '';
    const contexts = groups.get(g) ?? new Map<string, Item[]>();
    contexts.set(item.contextId, [
      ...(contexts.get(item.contextId) ?? []),
      item,
    ]);
    groups.set(g, contexts);
  }
  return [...groups.values()].flatMap((contexts) =>
    [...contexts.values()].flat()
  );
}

export function matchesFilter(
  item: Item,
  filter: RailFilter,
  query: string,
  judged: boolean
): boolean {
  if (filter === 'todo' && judged) {
    return false;
  }
  if (filter === 'done' && !judged) {
    return false;
  }
  const q = query.trim().toLowerCase();
  return (
    q === '' ||
    item.title.toLowerCase().includes(q) ||
    item.contextId.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q)
  );
}
