import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildPlausibleBootstrapScript,
  getPlausibleInitOptions,
} from '../src/extensions/analytics/plausible-utils';

test('official plausible host does not force a custom endpoint', () => {
  assert.equal(
    getPlausibleInitOptions('https://plausible.io/js/pa-example.js'),
    null
  );
});

test('custom proxy host sends events to the same origin', () => {
  assert.deepEqual(
    getPlausibleInitOptions(
      'https://analytics.bufferbloattest.org/js/pa-F16yRXyfS6GFCari4Fe-4.js'
    ),
    { endpoint: 'https://analytics.bufferbloattest.org/api/event' }
  );
});

test('bootstrap script calls plausible.init for script v2', () => {
  const script = buildPlausibleBootstrapScript(
    'https://analytics.bufferbloattest.org/js/pa-F16yRXyfS6GFCari4Fe-4.js'
  );

  assert.match(script, /plausible\.init\(/);
  assert.match(
    script,
    /endpoint":"https:\/\/analytics\.bufferbloattest\.org\/api\/event"/
  );
});
