import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAnimationPrompt,
  buildAnimationVideoPrompt,
  buildCharacterBasePrompt,
  buildCharacterEditPrompt,
  resolveGenerationAspectRatio,
} from '../src/config/generation';
import {
  distributeCredits,
  getGenerationCredits,
} from '../src/config/generation/model-routes';
import {
  aggregateGenerationStatus,
  fitGptImagePixelSize,
  resolveAnimationGrid,
  resolveAnimationSheetSize,
  resolveAnimationVideoDuration,
  resolveDirectionSelection,
  SPRITE_DIRECTIONS,
  toggleLinkedDirections,
  uniqueDirectionSources,
} from '../src/config/generation/sprite';
import {
  findActiveBaseFile,
  groupDirectionFiles,
  normalizeDirection,
} from '../src/shared/lib/character-workspace';
import { getDefaultProjectId } from '../src/shared/lib/project-id';
import { toPublicSpriteGeneration } from '../src/shared/lib/public-generation';
import { isProviderReachableUrl } from '../src/shared/lib/storage-paths';

test('default project ids are deterministic and isolated per user', () => {
  assert.equal(getDefaultProjectId('user-a'), getDefaultProjectId('user-a'));
  assert.notEqual(getDefaultProjectId('user-a'), getDefaultProjectId('user-b'));
  assert.match(getDefaultProjectId('user-a'), /^[0-9a-f-]{36}$/);
});

test('direction modes map to canonical cardinal and diagonal tasks', () => {
  assert.deepEqual(SPRITE_DIRECTIONS[4], ['north', 'east', 'south', 'west']);
  assert.equal(SPRITE_DIRECTIONS[8].length, 8);
  assert.ok(SPRITE_DIRECTIONS[8].includes('north_east'));
  assert.ok(SPRITE_DIRECTIONS[8].includes('south_west'));
});

test('direction selection links flip pairs and counts unique generated images', () => {
  assert.deepEqual(uniqueDirectionSources(['north', 'east', 'south', 'west']), [
    'north',
    'east',
    'south',
  ]);
  assert.deepEqual(
    toggleLinkedDirections(
      ['north', 'east', 'south', 'west'],
      'north_west'
    ).sort(),
    ['east', 'north', 'north_east', 'north_west', 'south', 'west'].sort()
  );
  assert.deepEqual(
    toggleLinkedDirections(
      ['east', 'north', 'north_east', 'north_west', 'south', 'west'],
      'north_east'
    ).sort(),
    ['east', 'north', 'south', 'west'].sort()
  );
  assert.deepEqual(toggleLinkedDirections(['north', 'south'], 'north'), [
    'south',
  ]);
  const fourWay = resolveDirectionSelection(['north', 'east', 'south', 'west']);
  assert.deepEqual(fourWay.sources, ['north', 'east', 'south']);
  assert.equal(fourWay.selected.includes('west'), true);
  const eightWay = resolveDirectionSelection([...SPRITE_DIRECTIONS[8]]);
  assert.deepEqual(eightWay.sources, [
    'north',
    'north_east',
    'east',
    'south_east',
    'south',
  ]);
  const westOnly = resolveDirectionSelection(['west']);
  assert.deepEqual(westOnly.selected, ['east', 'west']);
  assert.deepEqual(westOnly.sources, ['east']);
});

test('workspace direction aliases and batches use canonical directions', () => {
  assert.equal(normalizeDirection('right'), 'east');
  assert.equal(normalizeDirection('up-left'), 'north_west');
  const source = {
    id: 'source-file',
    variantId: 'variant-a',
    generationId: null,
    role: 'base_reference',
    isActiveReference: true,
    metadataJson: '{}',
    url: '/source.png',
    createdAt: '2026-09-17T00:00:00.000Z',
  };
  const groups = groupDirectionFiles([
    source,
    {
      id: 'north-file',
      variantId: 'variant-a',
      generationId: 'generation-a',
      role: 'direction_reference',
      isActiveReference: false,
      metadataJson: '{"direction":"up","referenceFileId":"source-file"}',
      url: '/north.png',
      createdAt: '2026-09-18T00:00:00.000Z',
    },
    {
      id: 'east-file',
      variantId: 'variant-a',
      generationId: 'generation-a',
      role: 'direction_reference',
      isActiveReference: false,
      metadataJson: '{"direction":"east","referenceFileId":"source-file"}',
      url: '/east.png',
      createdAt: '2026-09-18T00:00:00.000Z',
    },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].mode, '4');
  assert.equal(groups[0].files[0].direction, 'north');
  assert.equal(groups[0].files[0].file?.id, 'north-file');
  assert.equal(groups[0].files[1].file?.id, 'east-file');
  assert.equal(groups[0].sourceFile?.id, 'source-file');
});

test('animation auto frames follow the optimized action ranges and square grid', () => {
  assert.deepEqual(resolveAnimationGrid('auto', 'idle'), {
    frameCount: 14,
    columns: 4,
    rows: 4,
  });
  assert.deepEqual(resolveAnimationGrid('auto', 'walk'), {
    frameCount: 16,
    columns: 4,
    rows: 4,
  });
  assert.deepEqual(resolveAnimationGrid('auto', 'death'), {
    frameCount: 18,
    columns: 5,
    rows: 4,
  });
  assert.deepEqual(resolveAnimationGrid(13), {
    frameCount: 13,
    columns: 4,
    rows: 4,
  });
});

test('animation video duration stays at the two-second action clip', () => {
  assert.equal(resolveAnimationVideoDuration('run'), 2);
  assert.equal(resolveAnimationVideoDuration('attack'), 2);
  assert.equal(resolveAnimationVideoDuration('jump'), 2);
  assert.equal(resolveAnimationVideoDuration('death'), 2);
  assert.equal(resolveAnimationVideoDuration('custom-action'), 2);
});

test('animation sheet size is frame size times the grid', () => {
  assert.deepEqual(resolveAnimationSheetSize('auto', 32, 'walk'), {
    frameCount: 16,
    columns: 4,
    rows: 4,
    frameSize: 32,
    width: 128,
    height: 128,
    aspectRatio: '128x128',
  });
  assert.equal(
    resolveAnimationSheetSize('auto', '256', 'idle').aspectRatio,
    '1024x1024'
  );
});

test('provider animation size is scaled from frame count and frame size', () => {
  const sixBy64 = fitGptImagePixelSize(256, 128);
  assert.equal(sixBy64.aspectRatio, '1280x640');
  assert.equal(sixBy64.scale, 5);
  assert.equal(fitGptImagePixelSize(1024, 1024).aspectRatio, '1024x1024');
});

test('logical generation status preserves partial successes', () => {
  assert.equal(aggregateGenerationStatus(['success', 'failed']), 'partial');
  assert.equal(
    aggregateGenerationStatus(['success', 'postprocessing_failed']),
    'partial'
  );
  assert.equal(aggregateGenerationStatus(['failed', 'canceled']), 'failed');
  assert.equal(aggregateGenerationStatus(['success', 'success']), 'success');
  assert.equal(
    aggregateGenerationStatus(['success', 'processing']),
    'processing'
  );
});

test('character and animation prompts follow the production templates', () => {
  assert.equal(
    buildCharacterBasePrompt({
      prompt: '一个披着红色斗篷的小小火焰骑士',
      style: 'pixel-art',
      perspective: 'isometric',
      characterType: 'humanoid',
    }),
    [
      'Create one full-body base character reference.',
      '',
      'Character concept:',
      '一个披着红色斗篷的小小火焰骑士',
      '',
      'Style: pixel-art',
      'Perspective: isometric',
      'Character type: humanoid',
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
    ].join('\n')
  );
  const animationPrompt = buildAnimationPrompt(
    {
      prompt: '向前冲刺后挥剑攻击，动作连贯，结束时回到待机姿势',
      action: 'attack',
      frames: 'auto',
      frameSize: 64,
    },
    'east'
  );
  assert.match(animationPrompt, /Instruction priority:/);
  assert.match(animationPrompt, /Selected action: attack/);
  assert.match(animationPrompt, /Selected direction: east/);
  assert.match(animationPrompt, /one-shot action with readable anticipation/);
  assert.match(
    animationPrompt,
    /key pose 4: maximum extension and readable impact/
  );
  assert.match(
    animationPrompt,
    /If user motion notes conflict with the selected action[\s\S]*ignore only the conflicting part/
  );
  assert.match(animationPrompt, /no grid lines, cell borders, gutters/);

  const videoPrompt = buildAnimationVideoPrompt(
    {
      prompt: '披风自然跟随动作摆动',
      action: 'run',
      frames: 16,
      frameSize: 128,
    },
    'east'
  );
  assert.match(videoPrompt, /Animate the provided character/);
  assert.match(
    videoPrompt,
    /Run in place continuously at one steady pace[\s\S]*brief airborne moments/
  );
  assert.match(videoPrompt, /stable grip/);
  assert.match(videoPrompt, /secondary motion in hair, clothing, capes/);
  assert.doesNotMatch(videoPrompt, /Target key-frame count/);
  assert.doesNotMatch(videoPrompt, /Ordered pose plan/);
  assert.doesNotMatch(videoPrompt, /key pose \d/);
  assert.doesNotMatch(videoPrompt, /sprite sheet PNG/);
});

test('video action prompts use continuous motion instead of frame choreography', () => {
  const actions = [
    'idle',
    'walk',
    'run',
    'attack',
    'jump',
    'dash',
    'shoot',
    'cast',
    'hurt',
    'death',
    'pickup',
    'wave',
  ];

  for (const action of actions) {
    const prompt = buildAnimationVideoPrompt({
      action,
      direction: 'east',
      frames: 16,
      frameSize: 128,
    });
    assert.match(prompt, /Continuous motion description:/);
    assert.doesNotMatch(prompt, /frame \d|key pose|in-betweens/i);
  }

  const attackPrompt = buildAnimationVideoPrompt({
    action: 'attack',
    actionConfig: {
      weapon: 'keep-current',
      attackStyle: 'slash',
    },
    direction: 'east',
  });
  assert.match(attackPrompt, /exactly one fast, exaggerated strike/);
  assert.match(attackPrompt, /use only the item already carried/);
});

test('none character presets leave style and perspective to the prompt', () => {
  const prompt = buildCharacterBasePrompt({
    prompt: 'a hand-drawn forest mage viewed from behind',
    style: 'none',
    perspective: 'none',
    characterType: 'humanoid',
  });
  assert.doesNotMatch(prompt, /^Style:/m);
  assert.doesNotMatch(prompt, /^Perspective:/m);
  assert.match(prompt, /a hand-drawn forest mage viewed from behind/);
});

test('character edit prompts keep identity and follow pose or costume', () => {
  assert.match(
    buildCharacterEditPrompt({
      prompt: '双手持剑，侧身警戒',
      perspective: 'side',
      editType: 'pose',
    }),
    /Edit the provided character image in place[\s\S]*双手持剑，侧身警戒[\s\S]*Edit type: pose[\s\S]*Output perspective: side/
  );
  assert.match(
    buildCharacterEditPrompt({
      prompt: '披上红色斗篷',
      perspective: 'front',
      editType: 'costume',
    }),
    /Change only the costume\/outfit[\s\S]*披上红色斗篷[\s\S]*Edit type: costume[\s\S]*Output perspective: front/
  );
  assert.doesNotMatch(
    buildCharacterEditPrompt({
      prompt: '双手持剑，侧身警戒',
      editType: 'pose',
    }),
    /Output perspective/
  );
});

test('only one base image is treated as the active reference', () => {
  const files = [
    {
      id: 'pose',
      role: 'base_reference',
      isActiveReference: false,
      metadataJson: '{}',
      url: '/pose.png',
    },
    {
      id: 'original',
      role: 'base_reference',
      isActiveReference: true,
      metadataJson: '{}',
      url: '/original.png',
    },
    {
      id: 'stale',
      role: 'base_reference',
      isActiveReference: true,
      metadataJson: '{}',
      url: '/stale.png',
    },
  ];
  assert.equal(findActiveBaseFile(files)?.id, 'original');
});

test('quality maps to Grsai pixel aspect ratios', () => {
  assert.equal(resolveGenerationAspectRatio('1k'), '1024x1024');
  assert.equal(resolveGenerationAspectRatio('2k'), '2048x2048');
  assert.equal(resolveGenerationAspectRatio('4k'), '2880x2880');
  assert.equal(resolveGenerationAspectRatio(), '1024x1024');
});

test('provider input urls reject localhost and private r2 endpoints', () => {
  assert.equal(
    isProviderReachableUrl('http://localhost:3000/api/files/abc/input?token=1'),
    false
  );
  assert.equal(
    isProviderReachableUrl(
      'https://abc.r2.cloudflarestorage.com/bucket/projects/x.png'
    ),
    false
  );
  assert.equal(
    isProviderReachableUrl(
      'https://abc.r2.cloudflarestorage.com/bucket/projects/x.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc'
    ),
    true
  );
  assert.equal(
    isProviderReachableUrl('https://cdn.spritepixel.com/projects/x.png'),
    true
  );
});

test('generation API payload hides provider and model names', () => {
  const publicData = toPublicSpriteGeneration({
    id: 'g1',
    creditsCost: 1,
    paramsJson:
      '{"model":{"provider":"grsai","model":"gpt-image-2.5","credits":1}}',
    params: {
      prompt: 'knight',
      plannedItemId: 'planned-item',
      plannedVariantId: 'planned-variant',
      plannedSetId: 'planned-set',
      model: { provider: 'grsai', model: 'gpt-image-2.5', credits: 1 },
    },
  });
  assert.equal('paramsJson' in publicData, false);
  assert.equal(publicData.params.model, undefined);
  assert.equal(publicData.params.plannedItemId, undefined);
  assert.equal(publicData.params.plannedVariantId, undefined);
  assert.equal(publicData.params.plannedSetId, undefined);
  assert.equal(publicData.params.prompt, 'knight');
  assert.equal(publicData.creditsCost, 1);
});

test('SpritePixel credit costs bill batches as a flat fee', () => {
  assert.equal(getGenerationCredits('character'), 2);
  assert.equal(getGenerationCredits('animation', { taskCount: 4 }), 12);
  assert.equal(getGenerationCredits('icon', { taskCount: 9 }), 3);
  assert.equal(getGenerationCredits('icon', { taskCount: 2, retry: true }), 2);
  assert.deepEqual(distributeCredits(3, 9), [1, 1, 1, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(distributeCredits(3, 1), [3]);
});
