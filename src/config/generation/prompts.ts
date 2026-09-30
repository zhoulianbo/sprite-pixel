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
  actionConfig?: {
    jumpType?: string;
    dashType?: string;
    weapon?: string;
    attackStyle?: string;
    shootType?: string;
    castType?: string;
    severity?: string;
    deathType?: string;
  };
  direction?: string;
  frames?: number | 'auto';
  frameSize?: number | string;
  quality?: string;
  palette?: string;
  negativePrompt?: string;
};

export type IconStyleSource =
  'preset' | 'uploaded-reference' | 'asset-reference';

function token(value: string | null | undefined, fallback: string) {
  const raw = value?.trim();
  return raw || fallback;
}

function optionalPreset(value: string | null | undefined) {
  const raw = value?.trim();
  return raw && raw !== 'none' ? raw : '';
}

export function buildCharacterBasePrompt(
  input: Pick<
    SpritePromptInput,
    'prompt' | 'style' | 'perspective' | 'characterType'
  >,
  project?: { artStyle?: string | null } | null
) {
  const concept = token(input.prompt, '');
  const style =
    optionalPreset(input.style) || optionalPreset(project?.artStyle);
  const perspective = optionalPreset(input.perspective);
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
    style ? `Style: ${style}` : '',
    perspective ? `Perspective: ${perspective}` : '',
    `Character type: ${characterType}`,
    'Pose: neutral standing idle pose',
    '',
    'Requirements:',
    '- single character only',
    '- centered composition',
    '- clear silhouette',
    '- readable at small size',
    '- simple readable shapes for sprite animation',
    '- clean game-ready rendering',
    '- transparent background',
    '- no text',
    '- no watermark',
    '- no extra objects',
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n');
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
  videoMotion: string;
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
    videoMotion:
      'Stay planted in one relaxed ready stance and complete one gentle breathing cycle. Let the chest, shoulders, and body rise slightly, settle, then ease back into the starting stance. Keep the motion subtle and continuous, with only a small natural weight shift and soft secondary motion.',
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
    videoMotion:
      'Walk in place continuously at one steady pace. Use clear alternating steps, a modest stride, and a natural rise and fall of the hips and torso. Let both arms counter-swing naturally with the legs. Complete one smooth cycle that connects back to the opening step without stopping.',
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
    videoMotion:
      'Run in place continuously at one steady pace with a slight forward lean. Use long alternating strides, brief airborne moments, and a consistent rhythmic bounce through the hips and torso. Let both arms counter-swing naturally with bent elbows. Complete one energetic cycle that connects smoothly back to the opening stride without slowing down or returning to idle.',
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
      'Perform one decisive attack while preserving the selected attack setup and facing direction across every frame.',
    videoMotion:
      'Begin in a ready combat stance using only the explicitly selected attack setup. Coil into one large, readable anticipation with the weight drawn back, then explode into exactly one fast, exaggerated strike through a wide arc in front of the body. Hold the follow-through briefly, then recover into the ready stance. Drive the reach from the hips, torso, and attacking arm while staying in place.',
    keyPoses: [
      'combat-ready starting pose',
      'clear anticipation and wind-up',
      'attack begins and gains speed',
      'maximum extension and readable impact',
      'follow-through after impact',
      'balanced recovery pose',
    ],
    constraints: [
      'keep the selected attack source and hand state consistent',
      'do not add a second attack or unrelated locomotion',
    ],
  },
  jump: {
    label: 'single jump action',
    timing: 'one-shot action from takeoff through landing',
    motion:
      'Jump once in place with clear vertical timing and a stable horizontal anchor.',
    videoMotion:
      'Perform exactly one jump. Start upright, compress through the knees and hips, push off clearly, rise to one readable apex, descend under control, absorb the landing, and settle back into the starting stance. Keep the body aligned and the horizontal anchor stable throughout the jump.',
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
  dash: {
    label: 'single dash burst',
    timing:
      'one-shot action with sharp anticipation, acceleration, deceleration, and recovery',
    motion:
      'Compress into a readable anticipation, launch into one explosive dash, then stop under control.',
    videoMotion:
      'Perform exactly one short, explosive dash using the selected dash type. Compress into a sharp anticipation, launch with a strong whole-body lean, sustain the burst only briefly, then decelerate under control and recover to the ready stance. Keep the character framed at a stable size and do not turn the burst into a running cycle.',
    keyPoses: [
      'ready stance',
      'sharp anticipation and compression',
      'explosive launch',
      'maximum-speed dash pose',
      'brief continuation with strong secondary motion',
      'deceleration',
      'controlled stop',
      'stable recovery',
    ],
    constraints: ['do not turn this into a running cycle or multiple dashes'],
  },
  shoot: {
    label: 'single ranged attack',
    timing: 'one-shot action with preparation, aim, release, and recovery',
    motion:
      'Prepare, aim, fire or release exactly once, follow through, and recover.',
    videoMotion:
      'Perform exactly one ranged attack using the selected shoot type. Move from a ready stance into a clear aim or draw, release one shot, show one brief readable recoil or follow-through, then lower the attack and recover to the ready stance. Keep the selected firing method and hand positions anatomically consistent for the entire motion.',
    keyPoses: [
      'ready stance',
      'raise the selected firing source or casting hand',
      'aim, draw, or charge',
      'fire or release once',
      'peak firing pose',
      'follow-through',
      'settle',
      'recovery',
    ],
    constraints: ['do not fire repeatedly'],
  },
  cast: {
    label: 'single spell-casting action',
    timing: 'one-shot action with preparation, release, and recovery',
    motion:
      'Gather energy, release one readable cast, follow through, and recover.',
    videoMotion:
      'Perform exactly one spell cast using the selected cast type. Gather energy with a clear preparation, build to one readable release, extend through the casting gesture, then let the energy and body motion settle before returning to the ready stance. Keep the casting hand positions and reference-visible details consistent throughout.',
    keyPoses: [
      'ready stance',
      'begin gathering energy',
      'stronger charge or preparation',
      'cast release',
      'peak casting pose',
      'follow-through',
      'energy settles',
      'recovery',
    ],
    constraints: ['do not perform repeated casts'],
  },
  hurt: {
    label: 'single hurt reaction',
    timing: 'short one-shot reaction with impact and recovery',
    motion:
      'React once to an impact while keeping the character recognizable and balanced.',
    videoMotion:
      'React to exactly one unseen impact. Snap into a clear recoil with an intensity that matches the selected severity, reach one brief maximum compression or stagger, then regain balance and return to the ready stance. Do not add an attacker or turn the reaction into a fall or death.',
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
    videoMotion:
      'Perform exactly one death fall using the selected death type. Begin upright, lose balance from one decisive impact, collapse or fall in the selected direction, make one clear ground contact, then settle into a readable final pose. End there without standing up, disappearing, or looping back to the opening stance.',
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
  pickup: {
    label: 'single ground pickup interaction',
    timing: 'one-shot interaction from reach through recovery',
    motion: 'Bend down, reach, grasp, lift, stand back up, and settle.',
    videoMotion:
      'Perform exactly one ground pickup. Start in the ready stance, bend naturally through the knees and hips, reach down with one hand, close that hand around the single pickup object, lift it while standing back up, then settle into the ready stance. Do not walk away or perform another interaction.',
    keyPoses: [
      'ready stance',
      'reach downward',
      'bend',
      'lowest pickup pose',
      'grasp and lift',
      'stand up',
      'settle',
      'ready pose',
    ],
    constraints: ['do not walk away or perform another action'],
  },
  wave: {
    label: 'single friendly wave gesture',
    timing: 'one-shot gesture that returns to the ready pose',
    motion:
      'Raise one hand, perform a clear relaxed wave, then lower it naturally.',
    videoMotion:
      'Perform one friendly wave with one hand. Raise that hand clearly, make a small relaxed side-to-side wave, lower it naturally, and settle back into the ready stance. Keep the other hand in a natural pose that matches the reference.',
    keyPoses: [
      'ready stance',
      'raise hand',
      'wave outward',
      'wave inward',
      'repeat a small wave',
      'begin lowering hand',
      'settle',
      'ready pose',
    ],
    constraints: ['do not walk or turn away'],
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

function animationOptionLines(
  input: Pick<SpritePromptInput, 'action' | 'actionConfig'>
) {
  const options = input.actionConfig || {};
  const action = (input.action || '').toLowerCase();
  if (action === 'jump') {
    return [`- jump type: ${options.jumpType || 'in-place'}`];
  }
  if (action === 'dash') {
    return [`- dash type: ${options.dashType || 'forward'}`];
  }
  if (action === 'attack') {
    return [
      `- weapon: ${options.weapon || 'keep-current'}`,
      `- attack style: ${options.attackStyle || 'auto'}`,
    ];
  }
  if (action === 'shoot') {
    return [`- shoot type: ${options.shootType || 'bow'}`];
  }
  if (action === 'cast') {
    return [`- cast type: ${options.castType || 'quick'}`];
  }
  if (action === 'hurt') {
    return [`- severity: ${options.severity || 'light'}`];
  }
  if (action === 'death') {
    return [`- death type: ${options.deathType || 'collapse'}`];
  }
  return [];
}

export function buildAnimationPrompt(
  input: Pick<
    SpritePromptInput,
    'prompt' | 'action' | 'actionConfig' | 'direction' | 'frames' | 'frameSize'
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
    ...animationOptionLines(input),
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

function animationVideoInventoryLines(
  input: Pick<SpritePromptInput, 'action' | 'actionConfig'>
) {
  const action = (input.action || '').toLowerCase();
  const options = input.actionConfig || {};

  if (action === 'attack') {
    const weapon = options.weapon || 'keep-current';
    if (weapon === 'unarmed') {
      return [
        '- the selected attack is explicitly unarmed; keep both hands empty throughout and do not add any weapon, shield, tool, or prop',
      ];
    }
    if (weapon === 'keep-current') {
      return [
        '- for keep-current, use only a held item that is visibly present in the reference image',
        '- if neither hand holds an item in the reference image, perform the attack unarmed with both hands empty; never invent a weapon',
      ];
    }
    return [
      `- use exactly one ${weapon} because it is explicitly selected; do not introduce any additional held object`,
    ];
  }

  if (action === 'shoot') {
    const shootType = options.shootType || 'bow';
    if (shootType === 'magic-bolt') {
      return [
        '- cast the single selected magic bolt from the hand; do not add a bow, gun, staff, or other held object unless it is already visible in the reference',
      ];
    }
    return [
      `- use exactly one ${shootType} because it is explicitly selected; do not introduce any other new held object`,
    ];
  }

  if (action === 'cast') {
    const castType = options.castType || 'quick';
    if (castType === 'staff') {
      return [
        '- use exactly one staff because a staff cast is explicitly selected; do not introduce any other new held object',
      ];
    }
    if (castType === 'hand') {
      return [
        '- cast with an empty hand; do not add a staff, wand, weapon, tool, or other held object',
      ];
    }
    return [
      '- preserve the exact held-object state from the reference; if no casting implement is visible, cast with empty hands and do not invent one',
    ];
  }

  if (action === 'pickup') {
    return [
      '- preserve every reference-visible object and introduce exactly one small, plain pickup object as the only new object',
      '- keep the pickup object visible from the opening pose until it is grasped, then keep it attached to the same hand without duplicating, vanishing, or morphing',
    ];
  }

  if (!animationActionContract(action)) {
    return [
      '- match the exact held-object state shown in the reference; add a new held object only when the user motion notes explicitly require it',
    ];
  }

  return [
    '- match the exact held-object state shown in the reference image; if a hand is empty there, keep it empty in every frame',
    '- do not add any new held object, prop, accessory, or visual effect, and do not turn costume details into handheld items',
  ];
}

function animationVideoActionSafetyLines(
  input: Pick<SpritePromptInput, 'action' | 'actionConfig'>
) {
  const action = (input.action || '').toLowerCase();
  const options = input.actionConfig || {};

  switch (action) {
    case 'idle':
      return ['- do not add waving, walking, attacking, or dramatic effects'];
    case 'walk':
    case 'run':
      return [
        '- remain in place without drifting, sliding, teleporting, or turning the locomotion cycle into forward camera travel',
      ];
    case 'jump':
      return [
        options.jumpType === 'forward'
          ? '- express the selected forward jump through body lean and limb motion while keeping the character centered for sprite extraction'
          : '- rise and land on the same centered spot without horizontal drift',
        '- do not add landing dust, impact flashes, motion trails, or ground effects',
      ];
    case 'dash':
      return [
        `- express the selected ${options.dashType || 'forward'} dash through the pose while keeping the character centered for sprite extraction`,
        '- keep one solid character only; do not add afterimages, duplicates, speed lines, smoke, dust, or motion trails',
      ];
    case 'attack':
      return [
        '- do not add an opponent, target, projectile, slash trail, impact burst, blood, or debris unless the user motion notes explicitly request it',
      ];
    case 'shoot':
      return [
        '- release exactly one projectile and keep it inside the frame; do not add a target, opponent, repeated shots, extra ammunition, blood, or debris',
      ];
    case 'cast':
      return [
        '- use one compact spell effect that remains inside the frame; do not summon a creature, target, scenery, or extra prop',
      ];
    case 'hurt':
      return [
        '- keep the impact source unseen; do not add an attacker, projectile, weapon, blood, wound, debris, or impact flash',
      ];
    case 'death':
      return [
        '- keep the cause of death unseen; do not add an attacker, projectile, weapon, blood, wound, debris, or impact flash',
        '- keep the complete fallen body visible and still in the final pose; do not sink, dissolve, or disappear',
      ];
    case 'pickup':
      return [
        '- pick up only the single permitted object; do not spawn, collect, drop, or exchange any additional object',
      ];
    case 'wave':
      return [
        '- keep the gesture to one hand and do not turn it into a salute, dance, walk, or spell cast',
      ];
    default:
      return [];
  }
}

export function buildAnimationVideoPrompt(
  input: Pick<
    SpritePromptInput,
    'prompt' | 'action' | 'actionConfig' | 'direction' | 'frames' | 'frameSize'
  >,
  direction?: string
) {
  const facing = token(direction || input.direction, 'east');
  const action = token(input.action, generationDefaults.actionType);
  const contract = animationActionContract(action);
  return [
    'Animate the provided character as one clean 2D game-animation clip of about two seconds.',
    "Treat the reference image as the authoritative source for the character's complete appearance, clothing, accessories, and whether each hand is empty—not merely as an identity reference.",
    'Change only the pose and viewing direction required by the selected action; do not redesign the character or infer new belongings from the action archetype.',
    '',
    `Use a clear game-animation view facing ${facing}.`,
    `Keep the character facing ${facing} for the entire clip.`,
    'Do not rotate away from the selected direction.',
    '',
    'User motion notes:',
    token(input.prompt, ''),
    '',
    `Selected action: ${action}`,
    ...animationOptionLines(input),
    `Selected direction: ${facing}`,
    ...(contract
      ? [
          '',
          'Continuous motion description:',
          contract.videoMotion,
          '',
          'Action constraints:',
          `- perform only this action: ${contract.label}`,
          `- timing: ${contract.timing}`,
          ...contract.constraints.map((constraint) => `- ${constraint}`),
          ...animationVideoActionSafetyLines(input),
        ]
      : [
          '',
          'Continuous motion description:',
          'Perform the user motion notes as one coherent action with a clear beginning, middle, and end. Keep the timing readable and do not invent additional unrelated actions.',
        ]),
    '',
    'Video requirements:',
    '- preserve the exact character identity, clothing, colors, proportions, silhouette, and art style',
    ...animationVideoInventoryLines(input),
    `- keep the character facing ${facing} for the entire clip`,
    '- compose the camera for the widest and tallest extent of the entire motion before animating, including every reference-visible or explicitly selected element',
    '- keep the camera fixed and keep the complete character and every permitted element fully visible in every frame',
    '- reserve at least 12% empty background between the maximum motion envelope and every frame edge; scale the character down uniformly when needed',
    '- never crop, clip, or let any visible pixel touch or leave the frame edges at any moment',
    '- keep the invisible alignment baseline, scale, and horizontal position stable',
    '- animate natural opposing arm and leg motion where the action requires it',
    '- include continuous secondary motion in hair, clothing, capes, tails, and reference-visible accessories',
    '- use one perfectly uniform plain neutral-grey background with no scenery, floor, ground plane, or unrelated objects',
    '- do not generate any cast shadow, ground shadow, contact shadow, ambient occlusion, reflection, or glow beneath or around the character',
    '- keep the area beneath the feet exactly the same flat background color as the rest of the frame, with a clean silhouette suitable for background removal',
    '- no cuts, camera movement, zoom, text, labels, borders, or watermark',
    ...(input.action !== 'death'
      ? ['- finish in a pose that connects cleanly back to the first pose']
      : []),
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

export function buildIconGenerationPrompt(input: {
  detail: string;
  prompt?: string;
  styleSource?: IconStyleSource;
  hasReference?: boolean;
  style?: string;
  gameGenre?: string | null;
  perspective?: string;
  quality?: string;
  palette?: string | null;
}) {
  const styleSource =
    input.styleSource || (input.hasReference ? 'asset-reference' : 'preset');
  const isPreset = styleSource === 'preset';
  const style = optionalPreset(input.style);
  const perspective = optionalPreset(input.perspective);
  const referenceGuidance =
    styleSource === 'uploaded-reference'
      ? [
          'Reference image guidance:',
          '- use the uploaded image as the primary visual style guide, not as the item list',
          '- match its rendering technique, palette, outlines, shading, materials, camera angle, lighting, proportions, icon framing, and visual scale',
          '- create each listed item as a new icon; do not copy the reference subject unless that subject is explicitly listed',
          '- do not apply an unrelated game genre, preset style, or project palette',
        ]
      : styleSource === 'asset-reference'
        ? [
            'Reference image guidance:',
            '- use the selected existing project asset as the primary visual style guide',
            '- make every generated icon look like it belongs to the same game asset set as that reference',
            '- match its rendering technique, palette, outlines, shading, materials, camera angle, lighting, proportions, icon framing, and visual scale',
            '- create each listed item as a new icon; do not copy the reference subject unless that subject is explicitly listed',
            '- do not apply an unrelated game genre, preset style, or project palette',
          ]
        : [];

  return [
    input.prompt?.trim() || '',
    input.detail,
    '',
    ...(isPreset
      ? [
          input.gameGenre?.trim()
            ? `Game genre: ${input.gameGenre.trim()}`
            : '',
          style ? `Art style: ${style}` : '',
          perspective ? `Perspective: ${perspective}` : '',
          input.palette?.trim() ? `Palette: ${input.palette.trim()}` : '',
        ]
      : referenceGuidance),
    `Output quality: ${input.quality || generationDefaults.quality}`,
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n');
}

export function buildIconDescriptionExpandPrompt(input: {
  styleSource?: IconStyleSource;
  style?: string;
  gameGenre?: string | null;
  items: Array<{ id: string; name: string; description?: string }>;
}) {
  const styleSource = input.styleSource || 'preset';
  const style = optionalPreset(input.style);
  const isPreset = styleSource === 'preset';
  return [
    'Complete missing game-icon descriptions so an image model can draw each asset clearly.',
    'Keep each original item id and name. Do not add, drop, or rename items.',
    'Write one concrete visual description per item: materials, colors, shape, small distinctive details.',
    'Match the language of the item name. Keep each description under 180 characters.',
    'Do not mention UI chrome, watermarks, or extra characters. Assume a transparent background.',
    ...(isPreset
      ? [
          input.gameGenre?.trim()
            ? `Game genre context: ${input.gameGenre.trim()}`
            : '',
          style ? `Art style to respect: ${style}` : '',
        ]
      : [
          'Inspect the attached reference image before writing any item description.',
          'Treat its visual language as binding: match its shape simplification, proportions, palette, outline weight, shading amount, camera angle, and icon framing.',
          'Describe each new item as if it belongs to the same icon set. Keep details no more complex or realistic than the reference.',
          'Do not invent ornate materials, gems, decorations, realistic textures, or rendering techniques that are absent from the reference image.',
        ]),
    '',
    'Return JSON only, in this shape:',
    '{"items":[{"id":"...","description":"..."}]}',
    '',
    JSON.stringify({
      ...(isPreset && style ? { style } : {}),
      ...(isPreset && input.gameGenre?.trim()
        ? { gameGenre: input.gameGenre.trim() }
        : {}),
      items: input.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
      })),
    }),
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n');
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
