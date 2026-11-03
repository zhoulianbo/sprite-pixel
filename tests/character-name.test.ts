import assert from 'node:assert/strict';
import { test } from 'node:test';

import { characterNameFromPrompt } from '../src/shared/lib/character-name';

test('Latin names use the first three words, including accented words and hyphens', () => {
  assert.equal(
    characterNameFromPrompt(' Cute woodland squirrel with a green cloak '),
    'Cute woodland squirrel'
  );
  assert.equal(
    characterNameFromPrompt('Un écureuil héroïque dans la forêt'),
    'Un écureuil héroïque'
  );
  assert.equal(
    characterNameFromPrompt('A single full-body character'),
    'A single full-body'
  );
  assert.equal(characterNameFromPrompt('Night\n  Keeper'), 'Night Keeper');
});

test('non-Latin names fit twelve width units with six Chinese characters', () => {
  assert.equal(characterNameFromPrompt('森林中的可爱松鼠角色'), '森林中的可爱');
  assert.equal(characterNameFromPrompt('かわいい森のリス'), 'かわいい森の');
  assert.equal(characterNameFromPrompt('小松鼠 NPC 冒险者'), '小松鼠 NPC');
  assert.equal(characterNameFromPrompt('1234567890123456'), '123456789012');
});

test('keeps complete graphemes and handles empty prompts', () => {
  assert.equal(characterNameFromPrompt('👩‍🚀森林中的松鼠角色'), '👩‍🚀森林中的松');
  assert.equal(characterNameFromPrompt(' \n '), '');
});
