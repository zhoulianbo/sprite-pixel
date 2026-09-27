import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assetRolesForFileKind,
  parseProjectFileKind,
} from '../src/shared/lib/asset-file-kind';
import {
  extensionFromMime,
  generationAssetType,
  isCompletableUploadKey,
  isProviderReachableUrl,
  isRootStorageKey,
  projectAssetStorageKey,
  uploadStorageKeyForRole,
  userUploadStorageKey,
} from '../src/shared/lib/storage-paths';

test('user uploads go under uploads/YYYY-MM', () => {
  const key = userUploadStorageKey(
    'file-1',
    'png',
    new Date('2026-09-16T09:00:00.000Z')
  );
  assert.equal(key, 'uploads/2026-09/file-1.png');
});

test('character reference uploads go under projects/{id}/character', () => {
  assert.equal(
    uploadStorageKeyForRole('proj-1', 'reference', 'file-1', 'png'),
    'projects/proj-1/character/file-1.png'
  );
  assert.equal(
    uploadStorageKeyForRole('proj-1', 'base_reference', 'file-2', 'webp'),
    'projects/proj-1/character/file-2.webp'
  );
  assert.equal(
    uploadStorageKeyForRole(
      'proj-1',
      'motion_reference',
      'file-3',
      'png',
      new Date('2026-09-16T09:00:00.000Z')
    ),
    'uploads/2026-09/file-3.png'
  );
  assert.equal(
    isCompletableUploadKey('projects/proj-1/character/file-1.png', 'proj-1'),
    true
  );
  assert.equal(
    isCompletableUploadKey('projects/other/character/file-1.png', 'proj-1'),
    false
  );
});

test('generated assets go under projects/{id}/{type}', () => {
  assert.equal(
    projectAssetStorageKey('proj-1', 'character', 'out-1', 'png'),
    'projects/proj-1/character/out-1.png'
  );
  assert.equal(generationAssetType('animation'), 'animation');
  assert.equal(generationAssetType('icon_batch'), 'icon');
  assert.equal(generationAssetType('character'), 'character');
});

test('root storage keys skip the provider upload prefix', () => {
  assert.equal(isRootStorageKey('projects/abc/character/1.png'), true);
  assert.equal(isRootStorageKey('uploads/2026-09/1.png'), true);
  assert.equal(isRootStorageKey('digest.png'), false);
  assert.equal(extensionFromMime('image/webp'), 'webp');
});

test('project file picker kinds map to asset roles', () => {
  assert.deepEqual(assetRolesForFileKind('character'), [
    'base_reference',
    'direction_reference',
  ]);
  assert.deepEqual(assetRolesForFileKind('icon'), ['icon']);
  assert.deepEqual(assetRolesForFileKind('sheet'), ['spritesheet']);
  assert.equal(parseProjectFileKind('icon'), 'icon');
  assert.equal(parseProjectFileKind('unknown'), undefined);
});

test('provider-facing asset urls must be publicly reachable', () => {
  assert.equal(isProviderReachableUrl('https://files.example.com/a.png'), true);
  assert.equal(isProviderReachableUrl('http://127.0.0.1:8787/a.png'), false);
});
