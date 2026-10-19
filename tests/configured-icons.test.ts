import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { configuredIcons } from '../src/shared/blocks/common/icon-registry';

test('configured navigation, action and content icons are registered', () => {
  for (const root of ['src', 'content']) {
    for (const name of readdirSync(root, { recursive: true })) {
      const file = String(name);
      if (!/\.(?:tsx?|json|mdx?)$/.test(file) || file.includes('migrations'))
        continue;
      const source = readFileSync(join(root, file), 'utf8');
      const matches = [
        ...source.matchAll(
          /(?:["']?icon["']?\s*:\s*|<SmartIcon\s+name=)["']([A-Za-z][A-Za-z0-9]+)["']/g
        ),
        ...source.matchAll(/^icon:\s*([A-Za-z][A-Za-z0-9]+)\s*$/gm),
      ];
      for (const match of matches) {
        // workspace.tabs.icon is the English label "Icons", not an icon name.
        if (file.endsWith('workspace.json') && match[1] === 'Icons') continue;
        assert.ok(
          Object.hasOwn(configuredIcons, match[1]),
          `${root}/${file}: register ${match[1]}`
        );
      }
    }
  }
});

test('registered icons render SVGs with the requested size and class', () => {
  for (const [name, Icon] of Object.entries(configuredIcons)) {
    const html = renderToStaticMarkup(
      createElement(Icon, { size: 20, className: 'test-icon' })
    );
    assert.match(html, /^<svg\b/, name);
    assert.match(html, /class="[^"]*test-icon/, name);
    assert.match(html, /width="20"/, name);
  }
});
