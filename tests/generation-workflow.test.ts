import assert from 'node:assert/strict';
import test from 'node:test';

import { startGenerationWorkflow } from '../src/shared/services/generation-workflow';

test('development workflow fallback advances without a Cloudflare binding', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'development');
  let resolveAdvanced!: () => void;
  const advanced = new Promise<void>((resolve) => {
    resolveAdvanced = resolve;
  });
  const instanceId = `local-test-${Date.now()}`;

  try {
    const result = await startGenerationWorkflow(
      'generation-test',
      instanceId,
      {
        async advance() {
          resolveAdvanced();
          return { terminal: true, retryAfterSeconds: 0 };
        },
        async fail() {
          assert.fail('terminal success must not invoke failure recovery');
        },
      }
    );

    assert.equal(result.id, instanceId);
    await advanced;
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    } else {
      Reflect.set(process.env, 'NODE_ENV', previousNodeEnv);
    }
  }
});
