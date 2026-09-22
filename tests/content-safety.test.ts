import assert from 'node:assert/strict';
import test from 'node:test';

import { ScanAction, ScanReasonCode } from '@waffo/pancake-ts';

import {
  ContentSafetyError,
  type PromptScanner,
} from '../src/extensions/content-safety';
import {
  assertPromptAllowedForGeneration,
  scanGenerationPrompt,
  toPromptScanLocale,
} from '../src/shared/services/content-safety';

test('toPromptScanLocale maps app locales to Waffo locales', () => {
  assert.equal(toPromptScanLocale('zh'), 'zh');
  assert.equal(toPromptScanLocale('zh-Hant'), 'zh');
  assert.equal(toPromptScanLocale('ja'), 'ja');
  assert.equal(toPromptScanLocale('en'), 'en');
  assert.equal(toPromptScanLocale('ko'), 'en');
});

test('assertPromptAllowedForGeneration skips empty prompts', async () => {
  const result = await assertPromptAllowedForGeneration('   ');
  assert.equal(result, null);
});

test('assertPromptAllowedForGeneration allows scanned prompts', async () => {
  const scanner: PromptScanner = {
    name: 'mock',
    async scanPrompt() {
      return {
        action: 'allow',
        reasonCode: ScanReasonCode.Allowed,
        matchedCategories: [],
        provider: 'mock',
      };
    },
  };

  const result = await assertPromptAllowedForGeneration('a cute pixel cat', {
    scanner,
  });
  assert.equal(result?.action, 'allow');
});

test('assertPromptAllowedForGeneration blocks restricted prompts', async () => {
  const scanner: PromptScanner = {
    name: 'mock',
    async scanPrompt() {
      return {
        action: ScanAction.Block,
        reasonCode: ScanReasonCode.RestrictedContent,
        matchedCategories: ['adult_nsfw'],
        provider: 'mock',
      };
    },
  };

  await assert.rejects(
    () => assertPromptAllowedForGeneration('blocked prompt', { scanner }),
    (error: unknown) =>
      error instanceof ContentSafetyError && error.code === 'PROMPT_BLOCKED'
  );
});

test('scanGenerationPrompt maps provider failures to CONTENT_SAFETY_FAILED', async () => {
  const scanner: PromptScanner = {
    name: 'mock',
    async scanPrompt() {
      throw new Error('network down');
    },
  };

  await assert.rejects(
    () => scanGenerationPrompt('hello', { scanner }),
    (error: unknown) =>
      error instanceof ContentSafetyError &&
      error.code === 'CONTENT_SAFETY_FAILED'
  );
});
