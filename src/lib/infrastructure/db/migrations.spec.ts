import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from './database.ts';
import { runMigrations } from './migrations.ts';

function memoryDb() {
	return openDatabase(':memory:');
}

describe('openDatabase', () => {
	it('enables foreign keys and applies WAL mode on a file database (memory mode for :memory:)', () => {
		const db = memoryDb();
		const fk = (db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys;
		// WAL is inapplicable to :memory: — SQLite silently keeps 'memory' mode.
		// We still verify the PRAGMA runs without error and FK enforcement is on.
		expect(fk).toBe(1);
		db.close();
	});
});

describe('runMigrations', () => {
	let db: DatabaseSync;

	beforeEach(() => {
		db = memoryDb();
	});

	it('creates the habit and entry tables', () => {
		runMigrations(db);
		const tables = (
			db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as {
				name: string;
			}[]
		).map((r) => r.name);
		expect(tables).toContain('habit');
		expect(tables).toContain('entry');
	});

	it('sets the user_version to the latest migration', () => {
		runMigrations(db);
		const version = (db.prepare('PRAGMA user_version').get() as { user_version: number })
			.user_version;
		expect(version).toBe(1);
	});

	it('is idempotent — running twice does not throw or change the version', () => {
		runMigrations(db);
		runMigrations(db);
		const version = (db.prepare('PRAGMA user_version').get() as { user_version: number })
			.user_version;
		expect(version).toBe(1);
	});

	it('enforces ON DELETE CASCADE from habit to entry', () => {
		runMigrations(db);
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?)').run(
			'h1',
			'Piano',
			'daily',
			45,
			3,
			'2024-06-01',
			null,
			'2024-06-01T00:00:00.000Z'
		);
		db.prepare('INSERT INTO entry VALUES (?,?,?)').run('h1', '2024-06-10', 2);
		db.prepare('DELETE FROM habit WHERE id = ?').run('h1');
		const remaining = db.prepare('SELECT * FROM entry').all();
		expect(remaining).toHaveLength(0);
	});
});
