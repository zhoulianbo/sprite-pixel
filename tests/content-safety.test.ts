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

  const originalConsoleError = console.error;
  const logs: string[] = [];
  console.error = (message) => logs.push(String(message));
  try {
    await assert.rejects(
      () => assertPromptAllowedForGeneration('blocked prompt', { scanner }),
      (error: unknown) =>
        error instanceof ContentSafetyError && error.code === 'PROMPT_BLOCKED'
    );
  } finally {
    console.error = originalConsoleError;
  }
  assert.deepEqual(JSON.parse(logs[0]), {
    event: 'content_safety_prompt_blocked',
    provider: 'mock',
    action: 'block',
    reasonCode: ScanReasonCode.RestrictedContent,
    matchedCategories: ['adult_nsfw'],
    requestId: null,
  });
});

test('assertPromptAllowedForGeneration allows review and logs details without the prompt', async () => {
  const scanner: PromptScanner = {
    name: 'waffo',
    async scanPrompt() {
      return {
        action: 'review',
        reasonCode: ScanReasonCode.ServiceDegraded,
        matchedCategories: [],
        requestId: 'REQ_test',
        provider: 'waffo',
      };
    },
  };
  const originalConsoleWarn = console.warn;
  const logs: string[] = [];
  console.warn = (message) => logs.push(String(message));
  try {
    const result = await assertPromptAllowedForGeneration(
      'private prompt text',
      { scanner }
    );
    assert.equal(result?.action, 'review');
  } finally {
    console.warn = originalConsoleWarn;
  }
  assert.deepEqual(JSON.parse(logs[0]), {
    event: 'content_safety_prompt_review_bypassed',
    provider: 'waffo',
    action: 'review',
    reasonCode: ScanReasonCode.ServiceDegraded,
    matchedCategories: [],
    requestId: 'REQ_test',
  });
  assert.doesNotMatch(logs[0], /private prompt text/);
});

test('scanGenerationPrompt logs and allows provider failures as review', async () => {
  const scanner: PromptScanner = {
    name: 'mock',
    async scanPrompt() {
      throw new Error('network down');
    },
  };

  const originalConsoleError = console.error;
  const logs: string[] = [];
  console.error = (message) => logs.push(String(message));
  try {
    const result = await scanGenerationPrompt('hello', { scanner });
    assert.deepEqual(result, {
      action: 'review',
      reasonCode: 'service_degraded',
      matchedCategories: [],
      provider: 'mock',
    });
  } finally {
    console.error = originalConsoleError;
  }
  assert.deepEqual(JSON.parse(logs[0]), {
    event: 'content_safety_scan_failed',
    provider: 'mock',
    code: 'CONTENT_SAFETY_FAILED',
    reason: 'network down',
  });
});
