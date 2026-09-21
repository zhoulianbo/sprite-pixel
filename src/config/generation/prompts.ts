import { generationDefaults } from './options';
import { resolveProviderAnimationSheetSize } from './sprite';

export type SpritePromptInput = {
  type: string;
  prompt?: string;
  name?: string;
  style?: string;
  perspective?: string;
  characterType?: string;
  editType?: string;
  action?: string;
  direction?: string;
  frames?: number | 'auto';
  frameSize?: number | string;
  quality?: string;
  palette?: string;
  negativePrompt?: string;
};

function token(value: string | null | undefined, fallback: string) {
  const raw = value?.trim();
  return raw || fallback;
}

export function buildCharacterBasePrompt(
  input: Pick<
    SpritePromptInput,
    'prompt' | 'style' | 'perspective' | 'characterType'
  >,
  project?: { artStyle?: string | null } | null
) {
  const concept = token(input.prompt, '');
  const style = token(
    input.style || project?.artStyle,
    generationDefaults.style
  );
  const perspective = token(input.perspective, generationDefaults.perspective);
  const characterType = token(
    input.characterType,
    generationDefaults.characterType
  );
  return [
    'Create one full-body base character reference.',
    '',
    'Character concept:',
    concept,
    '',
    `Style: ${style}`,
    `Perspective: ${perspective}`,
    `Character type: ${characterType}`,
    'Pose: neutral standing idle pose',
    '',
    'Requirements:',
    '- single character only',
    '- centered composition',
    '- clear silhouette',
    '- readable at small size',
    '- simple readable shapes for sprite animation',
    '- clean pixel-art rendering',
    '- transparent background',
    '- no text',
    '- no watermark',
    '- no extra objects',
  ].join('\n');
}

export function buildCharacterEditPrompt(
  input: Pick<SpritePromptInput, 'prompt' | 'perspective' | 'editType'>
) {
  const editType = input.editType === 'costume' ? 'costume' : 'pose';
  const perspective = input.perspective?.trim();
  const instruction = token(
    input.prompt,
    editType === 'costume'
      ? 'Give the character a distinct new outfit that still fits the same game style.'
      : 'Use a clear full-body idle pose.'
  );

  if (editType === 'costume') {
    return [
      'Edit the provided character image in place. Do not create a new character.',
      'Keep the same character identity, pose, body proportions, silhouette, and art style.',
      'Change only the costume/outfit according to the instruction.',
      '',
      'Edit instruction:',
      instruction,
      '',
      `Edit type: costume`,
      perspective ? `Output perspective: ${perspective}` : '',
      '',
      'Requirements:',
      '- image-to-image edit of the provided character',
      '- preserve pose and identity unless the new costume requires a minor adjustment',
      '- apply the requested costume clearly',
      '- single character only',
      '- centered composition',
      '- transparent background',
      '- no text',
      '- no watermark',
      '- no extra objects',
    ]
      .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
      .join('\n');
  }

  return [
    'Edit the provided character image in place. Do not create a new character.',
    'Keep the same character identity, clothing, colors, proportions, silhouette, and art style.',
    'Change only the pose according to the instruction.',
    '',
    'Edit instruction:',
    instruction,
    '',
    `Edit type: pose`,
    perspective ? `Output perspective: ${perspective}` : '',
    '',
    'Requirements:',
    '- image-to-image edit of the provided character',
    '- preserve costume and key features',
    '- apply the requested pose clearly',
    '- single character only',
    '- centered composition',
    '- transparent background',
    '- no text',
    '- no watermark',
    '- no extra objects',
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n');
}

type AnimationActionContract = {
  label: string;
  timing: string;
  motion: string;
  keyPoses: string[];
  constraints: string[];
};

const animationActionContracts: Record<string, AnimationActionContract> = {
  idle: {
    label: 'idle breathing loop',
    timing:
      'seamless loop; the last frame flows into the first without duplicating it',
    motion:
      'Remain planted on the same spot. Use subtle breathing, weight shift, and secondary motion only.',
    keyPoses: [
      'neutral resting pose',
      'slight inhale and gentle upward motion',
      'settle through neutral',
      'slight exhale and gentle downward motion',
    ],
    constraints: [
      'keep both feet anchored',
      'do not introduce walking or attacks',
    ],
  },
  walk: {
    label: 'in-place walk cycle',
    timing:
      'seamless locomotion loop; the last frame flows into the first without duplicating it',
    motion:
      'Walk in place at a steady speed. Alternate left and right contact phases with natural opposing arm swings.',
    keyPoses: [
      'left heel contact; right arm forward and left arm back',
      'left-leg down pose; body slightly lower',
      'right leg passing under the body; torso centered',
      'left-leg up pose; body slightly higher',
      'right heel contact; left arm forward and right arm back',
      'right-leg down pose; body slightly lower',
      'left leg passing under the body; torso centered',
      'right-leg up pose; body slightly higher',
    ],
    constraints: [
      'opposite arm and leg move together',
      'keep stride moderate and both feet close to the ground',
      'never stop in an idle pose',
    ],
  },
  run: {
    label: 'in-place run cycle',
    timing:
      'seamless locomotion loop; the last frame flows into the first without duplicating it',
    motion:
      'Run in place at one steady speed with a slight forward lean. Alternate left and right support phases and include clear airborne phases.',
    keyPoses: [
      'left-foot contact; right arm forward and left arm back',
      'left-leg compression; hips and torso slightly lower',
      'right leg passing under the body; left foot leaving the ground',
      'airborne pose; right knee driving forward and left leg extending back',
      'right-foot contact; left arm forward and right arm back',
      'right-leg compression; hips and torso slightly lower',
      'left leg passing under the body; right foot leaving the ground',
      'airborne pose; left knee driving forward and right leg extending back',
    ],
    constraints: [
      'opposite arm and leg move together with bent elbows',
      'keep the torso lean and stride amplitude consistent',
      'do not accelerate, decelerate, stop, or return to idle',
    ],
  },
  attack: {
    label: 'single attack action',
    timing: 'one-shot action with readable anticipation, impact, and recovery',
    motion:
      'Perform one decisive attack while preserving the weapon, grip, and facing direction across every frame.',
    keyPoses: [
      'combat-ready starting pose',
      'clear anticipation and wind-up',
      'attack begins and gains speed',
      'maximum extension and readable impact',
      'follow-through after impact',
      'balanced recovery pose',
    ],
    constraints: [
      'keep hands attached to the same weapon or attack source',
      'do not add a second attack or unrelated locomotion',
    ],
  },
  jump: {
    label: 'single jump action',
    timing: 'one-shot action from takeoff through landing',
    motion:
      'Jump once in place with clear vertical timing and a stable horizontal anchor.',
    keyPoses: [
      'standing anticipation',
      'deep takeoff compression',
      'rising pose',
      'apex pose',
      'descending pose',
      'landing compression',
    ],
    constraints: [
      'keep the horizontal position fixed',
      'do not add running steps',
    ],
  },
  hurt: {
    label: 'single hurt reaction',
    timing: 'short one-shot reaction with impact and recovery',
    motion:
      'React once to an impact while keeping the character recognizable and balanced.',
    keyPoses: [
      'normal ready pose',
      'impact recoil',
      'maximum recoil and compression',
      'controlled recovery',
    ],
    constraints: [
      'do not add an attacker',
      'do not turn the reaction into a death animation',
    ],
  },
  death: {
    label: 'single death action',
    timing: 'one-shot action that ends in a held final pose; it must not loop',
    motion:
      'Lose balance, fall once, and settle into a clear final pose without disappearing.',
    keyPoses: [
      'initial hit or loss of balance',
      'first recoil',
      'body begins to collapse',
      'fall accelerates',
      'body approaches the ground',
      'ground contact',
      'small settling motion',
      'final still pose',
    ],
    constraints: ['do not stand back up', 'do not loop back to the first pose'],
  },
};

function animationActionContract(action?: string) {
  return animationActionContracts[(action || '').toLowerCase()];
}

function actionTimeline(contract: AnimationActionContract, frameCount: number) {
  if (contract.keyPoses.length === frameCount) {
    return contract.keyPoses.map(
      (pose, index) => `- frame ${index + 1}: ${pose}`
    );
  }
  return [
    `- distribute these key poses in order across all ${frameCount} frames`,
    ...contract.keyPoses.map(
      (pose, index) => `- key pose ${index + 1}: ${pose}`
    ),
    '- use the remaining frames as even in-betweens; do not replace them with duplicate holds',
  ];
}

export function buildAnimationPrompt(
  input: Pick<
    SpritePromptInput,
    'prompt' | 'action' | 'direction' | 'frames' | 'frameSize'
  >,
  direction?: string
) {
  const sheet = resolveProviderAnimationSheetSize(
    input.frames,
    input.frameSize,
    input.action
  );
  const facing = token(direction || input.direction, 'east');
  const leftover = sheet.columns * sheet.rows - sheet.frameCount;
  const action = token(input.action, generationDefaults.actionType);
  const contract = animationActionContract(action);
  return [
    'Generate one sprite sheet PNG of the provided character.',
    'Do not generate a video, a GIF, or a single still pose.',
    'The application will slice this sheet and play the frames in order.',
    '',
    'Instruction priority:',
    '1. Sheet layout and selected options below are mandatory.',
    '2. Preserve the identity and visual design of the reference character.',
    '3. User motion notes are secondary style or intensity notes.',
    '4. If user motion notes conflict with the selected action, direction, frame count, or timing contract, ignore only the conflicting part.',
    '',
    'Sheet layout:',
    `- ${sheet.columns} columns x ${sheet.rows} rows`,
    `- ${sheet.frameCount} animation frames, left to right then top to bottom`,
    `- every cell is the same size, with no gaps, borders, or gutters`,
    `- output image size must be exactly ${sheet.provider.width}x${sheet.provider.height} pixels`,
    ...(leftover > 0
      ? [
          `- the last ${leftover} cell${leftover === 1 ? '' : 's'} stay empty and fully transparent`,
        ]
      : []),
    '',
    'User motion notes (secondary):',
    token(input.prompt, ''),
    '',
    `Selected action: ${action}`,
    `Selected direction: ${facing}`,
    `Frame count: ${sheet.frameCount}`,
    `Logical cell size: ${sheet.frameSize}x${sheet.frameSize}`,
    `Output size: ${sheet.provider.width}x${sheet.provider.height}`,
    ...(contract
      ? [
          '',
          'Motion contract:',
          `- action: ${contract.label}`,
          `- timing: ${contract.timing}`,
          `- motion: ${contract.motion}`,
          ...contract.constraints.map((constraint) => `- ${constraint}`),
          '',
          'Ordered pose plan:',
          ...actionTimeline(contract, sheet.frameCount),
        ]
      : [
          '',
          'Motion contract:',
          '- custom action: follow the user motion notes as one coherent action',
          '- keep the timing readable and distribute the motion evenly across every frame',
        ]),
    '',
    'Requirements:',
    '- preserve the character identity',
    '- preserve clothing, colors, silhouette, and art style',
    `- every frame faces ${facing}; do not rotate toward another direction`,
    '- one complete character per cell, with consistent anatomy and limb count',
    '- keep the same scale, camera, ground line, center pivot, and horizontal position',
    '- keep limbs separated and readable; no fused, duplicated, missing, or broken limbs',
    '- secondary motion in hair, clothing, tails, and carried items must follow the body continuously',
    '- each cell contains exactly one animation moment; never combine multiple poses in one cell',
    '- transparent background',
    '- no grid lines, cell borders, gutters, labels, or frame numbers',
    '- no text',
    '- no watermark',
    '- no extra objects or scenery',
  ].join('\n');
}

export function buildIconSheetDetail(
  items: Array<{ name: string; description: string }>
) {
  const selected = items.slice(0, 9);
  const slots = Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3) + 1;
    const column = (index % 3) + 1;
    const item = selected[index];
    return item
      ? `${index + 1}. Row ${row}, column ${column}: "${item.name.trim()}" — ${item.description.trim()}`
      : `${index + 1}. Row ${row}, column ${column}: EMPTY — fully transparent`;
  });

  return [
    `Create one square game-icon sheet containing exactly ${selected.length} distinct item${selected.length === 1 ? '' : 's'} on a fixed 3x3 layout.`,
    'Place the items in row-major order using these exact slots:',
    ...slots,
    '',
    'Sheet requirements:',
    '- one complete item per occupied cell',
    '- keep every item centered inside its own cell with equal padding',
    '- use one unified art style, camera angle, lighting direction, rendering treatment, and visual scale across the entire sheet',
    '- keep silhouettes and important details readable at icon size',
    '- do not let any item cross into another cell',
    '- unused cells must remain empty and fully transparent',
    '- transparent background across the entire sheet',
    '- no grid lines, cell borders, labels, captions, letters, numbers, or watermark',
    '- do not add any item, decoration, effect, character, or scenery that is not listed',
  ].join('\n');
}

export function buildIconDescriptionExpandPrompt(input: {
  style?: string;
  items: Array<{ id: string; name: string; description?: string }>;
}) {
  const style = token(input.style, generationDefaults.style);
  return [
    'Complete missing game-icon descriptions so an image model can draw each asset clearly.',
    'Keep each original item id and name. Do not add, drop, or rename items.',
    'Write one concrete visual description per item: materials, colors, shape, small distinctive details.',
    'Match the language of the item name. Keep each description under 180 characters.',
    'Do not mention UI chrome, watermarks, or extra characters. Assume a transparent background.',
    `Art style to respect: ${style}`,
    '',
    'Return JSON only, in this shape:',
    '{"items":[{"id":"...","description":"..."}]}',
    '',
    JSON.stringify({
      style,
      items: input.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
      })),
    }),
  ].join('\n');
}

export function parseIconDescriptionExpandResult(raw: string) {
  const text = raw.trim();
  if (!text) return [] as Array<{ id: string; description: string }>;
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fenced?.[1]?.trim() || text;
    const start = body.search(/[\[{]/);
    if (start < 0) return [];
    const parsed = JSON.parse(body.slice(start)) as
      | Array<{ id?: string; description?: string }>
      | { items?: Array<{ id?: string; description?: string }> };
    const rows = Array.isArray(parsed) ? parsed : parsed.items || [];
    return rows
      .map((row) => ({
        id: String(row.id || '').trim(),
        description: String(row.description || '').trim(),
      }))
      .filter((row) => row.id && row.description);
  } catch {
    return [];
  }
}
