export const projectFileKinds = ['character', 'icon', 'sheet'] as const;

export type ProjectFileKind = (typeof projectFileKinds)[number];

export function assetRolesForFileKind(kind: ProjectFileKind) {
  if (kind === 'icon') return ['icon'];
  if (kind === 'sheet') return ['spritesheet'];
  return ['base_reference', 'direction_reference'];
}

export function parseProjectFileKind(
  value: string | null | undefined
): ProjectFileKind | undefined {
  if (value && projectFileKinds.includes(value as ProjectFileKind)) {
    return value as ProjectFileKind;
  }
}
