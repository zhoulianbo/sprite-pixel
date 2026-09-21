import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { iconPromptExpandModel } from '../src/config/generation/model-routes';
import { AIMediaType, AITaskStatus, GeminiProvider } from '../src/extensions/ai';

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
            parts: [{ text: '{"items":[{"id":"a","description":"wooden barrel"}]}' }],
          },
        },
      ],
    });
  };

  const provider = new GeminiProvider({ apiKey: 'test-key' });
  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.TEXT,
      model: iconPromptExpandModel.model,
      prompt: 'expand',
      options: { responseMimeType: 'application/json' },
    },
  });

  assert.match(requestUrl, /models\/gemini-2.5-flash:generateContent/);
  assert.equal(
    (requestBody?.generationConfig as { responseMimeType?: string })
      ?.responseMimeType,
    'application/json'
  );
  assert.equal(result.taskStatus, AITaskStatus.SUCCESS);
  assert.equal(
    result.taskResult?.text,
    '{"items":[{"id":"a","description":"wooden barrel"}]}'
  );
});
