import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  appendIconLine,
  capIconInput,
  ICON_LIST_MAX,
  needsIconDescriptionExpand,
  parseIconList,
} from '../src/config/generation/icon';
import {
  buildIconSheetDetail,
  parseIconDescriptionExpandResult,
} from '../src/config/generation/prompts';

const id = () => 'id';

test('parses a trailing english colon as name only', () => {
  const items = parseIconList('木箱:', [], id);
  assert.equal(items[0].name, '木箱');
  assert.equal(items[0].description, undefined);
});

test('parses name and description with colon separators', () => {
  const items = parseIconList(
    '生命药水：红色玻璃瓶\nIron Sword: worn short sword\n盾牌',
    [],
    id
  );
  assert.equal(items.length, 3);
  assert.equal(items[0].name, '生命药水');
  assert.equal(items[0].description, '红色玻璃瓶');
  assert.equal(items[1].name, 'Iron Sword');
  assert.equal(items[1].description, 'worn short sword');
  assert.equal(items[2].name, '盾牌');
  assert.equal(items[2].description, undefined);
});

test('caps icon list at nine items and appends until full', () => {
  const lines = Array.from(
    { length: 12 },
    (_, index) => `道具${index + 1}`
  ).join('\n');
  assert.equal(parseIconList(lines, [], id).length, ICON_LIST_MAX);
  let value = Array.from({ length: 8 }, (_, index) => `道具${index + 1}`).join(
    '\n'
  );
  value = appendIconLine(value, '宝箱');
  assert.equal(parseIconList(value, [], id).length, 9);
  assert.equal(appendIconLine(value, '多余'), value);
  assert.equal(
    capIconInput(`${value}\n第十个\n第十一个`).split('\n').filter(Boolean)
      .length,
    9
  );
});

test('flags only missing icon descriptions for expansion', () => {
  assert.equal(needsIconDescriptionExpand('木桶', undefined), true);
  assert.equal(needsIconDescriptionExpand('木桶', ''), true);
  assert.equal(needsIconDescriptionExpand('木桶', '木桶'), false);
  assert.equal(needsIconDescriptionExpand('木桶', '棕色木桶'), false);
  assert.equal(needsIconDescriptionExpand('Torch', 'fire'), false);
  assert.equal(needsIconDescriptionExpand('', ''), false);
});

test('parses expanded icon descriptions from model JSON', () => {
  const rows = parseIconDescriptionExpandResult(
    '```json\n{"items":[{"id":"a","description":"带铁箍的木桶"},{"id":"","description":"x"}]}\n```'
  );
  assert.deepEqual(rows, [{ id: 'a', description: '带铁箍的木桶' }]);
  assert.deepEqual(parseIconDescriptionExpandResult('not json'), []);
});

test('builds one fixed 3x3 sheet prompt for all selected icons', () => {
  const prompt = buildIconSheetDetail([
    { name: '木桶', description: '带铁箍的棕色木质酒桶' },
    { name: '药水', description: '装有蓝色液体的玻璃瓶' },
    { name: '短剑', description: '带金色护手的银色短剑' },
  ]);
  assert.match(prompt, /exactly 3 distinct items/);
  assert.match(prompt, /fixed 3x3 layout/);
  assert.match(prompt, /Row 1, column 1: "木桶"/);
  assert.match(prompt, /Row 1, column 3: "短剑"/);
  assert.match(prompt, /Row 2, column 1: EMPTY — fully transparent/);
  assert.match(prompt, /one unified art style/);
  assert.match(prompt, /no grid lines, cell borders, labels/);
});
