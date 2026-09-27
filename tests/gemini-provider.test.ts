import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  AIMediaType,
  AITaskStatus,
  GeminiProvider,
} from '../src/extensions/ai';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('Gemini text generate uses gemini-2.5-flash and returns JSON text', async () => {
  let requestUrl = '';
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body || '{}'));
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              { text: '{"items":[{"id":"a","description":"wooden barrel"}]}' },
            ],
          },
        },
      ],
    });
  };

  const provider = new GeminiProvider({ apiKey: 'test-key' });
  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.TEXT,
      model: 'gemini-2.5-flash',
      prompt: 'expand',
      options: {
        reasoningEffort: 'none',
        responseMimeType: 'application/json',
      },
    },
  });

  assert.match(requestUrl, /models\/gemini-2.5-flash:generateContent/);
  assert.equal(
    (requestBody?.generationConfig as { responseMimeType?: string })
      ?.responseMimeType,
    'application/json'
  );
  assert.deepEqual(
    (
      requestBody?.generationConfig as {
        thinkingConfig?: { thinkingBudget?: number };
      }
    )?.thinkingConfig,
    { thinkingBudget: 0 }
  );
  assert.equal(result.taskStatus, AITaskStatus.SUCCESS);
  assert.equal(
    result.taskResult?.text,
    '{"items":[{"id":"a","description":"wooden barrel"}]}'
  );
});

test('Gemini text generation includes reference image bytes', async () => {
  let requestBody: Record<string, any> | undefined;
  globalThis.fetch = async (input, init) => {
    if (String(input) === 'https://cdn.example.com/reference.png') {
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'content-type': 'image/png' },
      });
    }
    requestBody = JSON.parse(String(init?.body || '{}'));
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              { text: '{"items":[{"id":"a","description":"orange book"}]}' },
            ],
          },
        },
      ],
    });
  };

  const provider = new GeminiProvider({ apiKey: 'test-key' });
  await provider.generate({
    params: {
      mediaType: AIMediaType.TEXT,
      model: 'gemini-2.5-flash',
      prompt: 'inspect the reference and expand',
      options: {
        images: ['https://cdn.example.com/reference.png'],
        responseMimeType: 'application/json',
      },
    },
  });

  assert.deepEqual(requestBody?.contents?.[0]?.parts, [
    { text: 'inspect the reference and expand' },
    {
      inlineData: {
        mimeType: 'image/png',
        data: 'AQID',
      },
    },
  ]);
});
