export const ICON_LIST_MAX = 9;

export const ICON_ITEM_PRESET_IDS = [
  'crate',
  'torch',
  'barrel',
  'chest',
  'door',
  'lamp',
  'rock',
  'bush',
  'sign',
  'chair',
  'table',
  'sword',
  'shield',
  'potion',
  'bookshelf',
  'anvil',
  'cauldron',
  'bench',
  'fence',
  'well',
  'banner',
  'statue',
  'crystal',
  'skull',
  'tombstone',
  'mushroom',
  'stump',
  'ladder',
  'bucket',
  'sack',
] as const;

export type IconListItem = {
  id: string;
  name: string;
  description?: string;
  selected: boolean;
  status?: string;
  fileUrl?: string;
};

export function parseIconList(
  value: string,
  current: Pick<IconListItem, 'id' | 'selected' | 'status' | 'fileUrl'>[] = [],
  createId: () => string = () => crypto.randomUUID()
): IconListItem[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, ICON_LIST_MAX)
    .map((line, index) => {
      const match = line.match(/^(.+?)[:：]\s*(.*)$/);
      const name = (match ? match[1] : line).trim().slice(0, 80);
      const description = match?.[2]?.trim().slice(0, 500) || undefined;
      return {
        id: current[index]?.id || createId(),
        name,
        description,
        selected: current[index]?.selected ?? true,
        status: current[index]?.status,
        fileUrl: current[index]?.fileUrl,
      };
    });
}

export function serializeIconList(
  items: Array<Pick<IconListItem, 'name' | 'description'>>,
  separator = ': '
) {
  return items
    .map((item) =>
      item.description
        ? `${item.name}${separator}${item.description}`
        : item.name
    )
    .join('\n');
}

export function needsIconDescriptionExpand(
  name: string,
  description?: string | null
) {
  const title = name.trim();
  if (!title) return false;
  return !description?.trim();
}

export function capIconInput(value: string, max = ICON_LIST_MAX) {
  const lines = value.split(/\r?\n/);
  const kept: string[] = [];
  let filled = 0;
  for (const line of lines) {
    if (line.trim()) {
      if (filled >= max) continue;
      filled += 1;
    } else if (filled >= max) {
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

export function appendIconLine(
  current: string,
  line: string,
  max = ICON_LIST_MAX
) {
  return capIconInput(
    current.trim() ? `${current.trimEnd()}\n${line}` : line,
    max
  );
}
