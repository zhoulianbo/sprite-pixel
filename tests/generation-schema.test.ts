import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const domainTables = [
  'project',
  'asset_item',
  'asset_variant',
  'generation',
  'generation_task',
  'asset_file',
  'project_reference',
  'generation_input',
  'asset_region',
  'animation_set',
  'animation_clip',
  'animation_version',
  'animation_frame',
] as const;

function sqliteJson(database: string, sql: string) {
  const output = execFileSync('sqlite3', ['-json', database, sql], {
    encoding: 'utf8',
  }).trim();
  return output ? JSON.parse(output) : [];
}

function normalizeDefault(value: unknown) {
  if (value === undefined || value === null) return null;
  return String(value)
    .trim()
    .replace(/^\((.*)\)$/, '$1')
    .replaceAll('"', "'")
    .toLowerCase();
}

function normalizeSql(value: string) {
  return value
    .replaceAll('`', '"')
    .replace(/"[^"]+"\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

test('0000 + 0001 matches the Drizzle snapshot domain contract', () => {
  const root = resolve(import.meta.dirname, '..');
  const migrationDir = join(root, 'src/config/db/migrations_d1');
  const temporary = mkdtempSync(join(tmpdir(), 'generation-schema-'));
  const database = join(temporary, 'contract.sqlite');
  const combined = join(temporary, 'migrations.sql');
  try {
    writeFileSync(
      combined,
      [
        readFileSync(join(migrationDir, '0000_free_zombie.sql'), 'utf8'),
        readFileSync(
          join(migrationDir, '0001_sprite_assets.sql'),
          'utf8'
        ).replaceAll('--> statement-breakpoint', ''),
      ].join('\n')
    );
    execFileSync('sqlite3', [database, `.read ${combined}`]);

    const snapshot = JSON.parse(
      readFileSync(join(migrationDir, 'meta/0001_snapshot.json'), 'utf8')
    );
    const actualTables = sqliteJson(
      database,
      "select name from sqlite_master where type='table' order by name"
    ).map((row: { name: string }) => row.name);

    for (const tableName of domainTables) {
      assert.ok(actualTables.includes(tableName), `${tableName} is migrated`);
      const table = snapshot.tables[tableName];
      assert.ok(table, `${tableName} is present in the snapshot`);

      const columns = sqliteJson(database, `pragma table_info('${tableName}')`);
      assert.deepEqual(
        columns.map((column: any) => column.name),
        Object.keys(table.columns),
        `${tableName} columns`
      );
      for (const column of columns) {
        const expected = table.columns[column.name];
        assert.equal(column.type.toLowerCase(), expected.type.toLowerCase());
        assert.equal(Boolean(column.notnull), Boolean(expected.notNull));
        assert.equal(Boolean(column.pk), Boolean(expected.primaryKey));
        assert.equal(
          normalizeDefault(column.dflt_value),
          normalizeDefault(expected.default),
          `${tableName}.${column.name} default`
        );
      }

      const indexes = sqliteJson(database, `pragma index_list('${tableName}')`)
        .filter((index: any) => !index.name.startsWith('sqlite_autoindex_'))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      const expectedIndexes = Object.values(table.indexes).sort(
        (a: any, b: any) => a.name.localeCompare(b.name)
      ) as any[];
      assert.deepEqual(
        indexes.map((index: any) => index.name),
        expectedIndexes.map((index: any) => index.name),
        `${tableName} indexes`
      );
      for (const expected of expectedIndexes) {
        const actual = indexes.find(
          (index: any) => index.name === expected.name
        );
        assert.equal(Boolean(actual.unique), Boolean(expected.isUnique));
        assert.deepEqual(
          sqliteJson(database, `pragma index_info('${expected.name}')`).map(
            (column: any) => column.name
          ),
          expected.columns
        );
        assert.equal(Boolean(actual.partial), Boolean(expected.where));
        if (expected.where) {
          const [{ sql }] = sqliteJson(
            database,
            `select sql from sqlite_master where type='index' and name='${expected.name}'`
          );
          assert.ok(
            normalizeSql(sql).includes(normalizeSql(expected.where)),
            `${expected.name} partial predicate`
          );
        }
      }

      const foreignKeys = sqliteJson(
        database,
        `pragma foreign_key_list('${tableName}')`
      )
        .map((foreignKey: any) =>
          [
            foreignKey.from,
            foreignKey.table,
            foreignKey.to,
            foreignKey.on_delete.toLowerCase(),
          ].join('|')
        )
        .sort();
      const expectedForeignKeys = Object.values(table.foreignKeys)
        .map((foreignKey: any) =>
          [
            foreignKey.columnsFrom[0],
            foreignKey.tableTo,
            foreignKey.columnsTo[0],
            foreignKey.onDelete,
          ].join('|')
        )
        .sort();
      assert.deepEqual(
        foreignKeys,
        expectedForeignKeys,
        `${tableName} foreign keys`
      );
    }

    assert.ok(!snapshot.tables.asset);
    assert.ok(!snapshot.tables.asset_set);
    assert.equal(
      sqliteJson(database, 'pragma foreign_key_check').length,
      0,
      'all migrated foreign keys are valid'
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
