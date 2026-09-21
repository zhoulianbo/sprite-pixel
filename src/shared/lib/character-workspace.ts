import { SPRITE_DIRECTIONS } from '@/config/generation/sprite';

export const characterWorkflowStages = [
  'base',
  'directions',
  'animations',
  'sheets',
] as const;

export type CharacterWorkflowStage = (typeof characterWorkflowStages)[number];

export function characterWorkspacePath(
  projectId: string,
  itemId: string,
  stage: CharacterWorkflowStage = 'base'
) {
  const base = `/dashboard/projects/${projectId}/characters/${itemId}`;
  return stage === 'base' ? base : `${base}/${stage}`;
}

export function characterWorkspaceStage(
  pathname: string
): CharacterWorkflowStage {
  if (pathname.endsWith('/directions')) return 'directions';
  if (pathname.endsWith('/animations')) return 'animations';
  if (pathname.endsWith('/sheets')) return 'sheets';
  return 'base';
}

export const characterAssetGridClass =
  'grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5';

export type CharacterWorkspaceFile = {
  id: string;
  variantId?: string | null;
  generationId?: string | null;
  role: string;
  isActiveReference: boolean;
  metadataJson: string;
  url: string;
  createdAt?: string;
  width?: number | null;
  height?: number | null;
};

export function findActiveBaseFile(files: CharacterWorkspaceFile[]) {
  return (
    files.find(
      (file) => file.role === 'base_reference' && file.isActiveReference
    ) || files.find((file) => file.role === 'base_reference')
  );
}

export type CharacterAnimationFrame = {
  id: string;
  frameIndex: number;
  durationMs?: number | null;
  offsetX: number;
  offsetY: number;
  metadata: {
    crop?: { x: number; y: number; width: number; height: number };
  };
  file: { id: string; url: string };
};

export type CharacterWorkspaceAnimation = {
  set: {
    id: string;
    name: string;
    action: string;
    variantId?: string | null;
    directionMode: string;
    loop: boolean;
    status: string;
    createdAt?: string;
  };
  clip: { id: string; direction: string; status: string; sortOrder: number };
  version?: {
    id: string;
    fps: number;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
  } | null;
  frames: CharacterAnimationFrame[];
};

export function parseAssetMetadata(value: string) {
  try {
    return JSON.parse(value || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function normalizeDirection(value?: string | null) {
  const aliases: Record<string, string> = {
    up: 'north',
    right: 'east',
    down: 'south',
    left: 'west',
    'up-right': 'north_east',
    'down-right': 'south_east',
    'down-left': 'south_west',
    'up-left': 'north_west',
  };
  return aliases[value || ''] || value || 'none';
}

export function generationDirectionValue(value: string) {
  const aliases: Record<string, string> = {
    north: 'up',
    east: 'right',
    south: 'down',
    west: 'left',
    north_east: 'right',
    south_east: 'right',
    north_west: 'left',
    south_west: 'left',
  };
  return aliases[value] || value;
}

export function isMirroredAsset(metadataJson: string) {
  return parseAssetMetadata(metadataJson).mirrored === true;
}

export function directionOrder(mode: '4' | '8') {
  return [...SPRITE_DIRECTIONS[mode]];
}

export function directionBatchSourceFile(
  entries: CharacterWorkspaceFile[],
  files: CharacterWorkspaceFile[]
) {
  const sourceId = entries
    .map((file) =>
      String(parseAssetMetadata(file.metadataJson).referenceFileId || '')
    )
    .find(Boolean);
  return sourceId ? files.find((file) => file.id === sourceId) : undefined;
}

export function groupDirectionFiles(
  files: CharacterWorkspaceFile[],
  variantId?: string
) {
  const groups = new Map<string, CharacterWorkspaceFile[]>();
  files
    .filter(
      (file) =>
        file.role === 'direction_reference' &&
        (!variantId || file.variantId === variantId)
    )
    .forEach((file) => {
      const key = file.generationId || `legacy:${file.id}`;
      groups.set(key, [...(groups.get(key) || []), file]);
    });

  return [...groups.entries()]
    .map(([id, entries]) => {
      const byDirection = new Map(
        entries.map((file) => [
          normalizeDirection(
            String(parseAssetMetadata(file.metadataJson).direction || '')
          ),
          file,
        ])
      );
      const mode: '4' | '8' = [...byDirection.keys()].some((direction) =>
        String(direction).includes('_')
      )
        ? '8'
        : '4';
      return {
        id,
        mode,
        createdAt: entries[0]?.createdAt,
        sourceFile: directionBatchSourceFile(entries, files),
        files: directionOrder(mode).map((direction) => ({
          direction,
          file: byDirection.get(direction),
        })),
      };
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function groupAnimationSets(
  animations: CharacterWorkspaceAnimation[],
  variantId?: string
) {
  const groups = new Map<
    string,
    {
      set: CharacterWorkspaceAnimation['set'];
      clips: CharacterWorkspaceAnimation[];
    }
  >();
  animations
    .filter(
      (animation) =>
        !variantId ||
        !animation.set.variantId ||
        animation.set.variantId === variantId
    )
    .forEach((animation) => {
      const current = groups.get(animation.set.id) || {
        set: animation.set,
        clips: [],
      };
      current.clips.push(animation);
      groups.set(animation.set.id, current);
    });
  return [...groups.values()].map((group) => ({
    ...group,
    clips: group.clips.sort((a, b) => a.clip.sortOrder - b.clip.sortOrder),
  }));
}
