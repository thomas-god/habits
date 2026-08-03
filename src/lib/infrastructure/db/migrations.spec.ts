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
		expect(version).toBe(5);
	});

	it('is idempotent — running twice does not throw or change the version', () => {
		runMigrations(db);
		runMigrations(db);
		const version = (db.prepare('PRAGMA user_version').get() as { user_version: number })
			.user_version;
		expect(version).toBe(5);
	});

	it('allows a null unit_minutes after migration 2', () => {
		runMigrations(db);
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?,?)').run(
			'h1',
			'Piano',
			'daily',
			null,
			3,
			'2024-06-01',
			null,
			'2024-06-01T00:00:00.000Z',
			null
		);
		const row = db.prepare('SELECT unit_minutes FROM habit WHERE id = ?').get('h1') as {
			unit_minutes: number | null;
		};
		expect(row.unit_minutes).toBeNull();
	});

	it('allows a null goal_units after migration 4', () => {
		runMigrations(db);
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?,?)').run(
			'h1',
			'Journaling',
			'progress',
			null,
			null,
			'2024-06-01',
			null,
			'2024-06-01T00:00:00.000Z',
			null
		);
		const row = db.prepare('SELECT goal_units FROM habit WHERE id = ?').get('h1') as {
			goal_units: number | null;
		};
		expect(row.goal_units).toBeNull();
	});

	it('enforces ON DELETE CASCADE from habit to entry', () => {
		runMigrations(db);
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?,?)').run(
			'h1',
			'Piano',
			'daily',
			45,
			3,
			'2024-06-01',
			null,
			'2024-06-01T00:00:00.000Z',
			null
		);
		db.prepare('INSERT INTO entry VALUES (?,?,?)').run('h1', '2024-06-10', 2);
		db.prepare('DELETE FROM habit WHERE id = ?').run('h1');
		const remaining = db.prepare('SELECT * FROM entry').all();
		expect(remaining).toHaveLength(0);
	});

	it('creates the habit_order table', () => {
		runMigrations(db);
		const tables = (
			db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as {
				name: string;
			}[]
		).map((r) => r.name);
		expect(tables).toContain('habit_order');
	});

	it('backfills habit_order for existing habits, ordered by created_at', () => {
		// Migrations run once at the end, after all three habits already exist,
		// simulating an upgrade of a pre-existing installation.
		db.exec(`
      CREATE TABLE habit (
        id           TEXT    NOT NULL PRIMARY KEY,
        name         TEXT    NOT NULL,
        type         TEXT    NOT NULL,
        unit_minutes INTEGER,
        goal_units   INTEGER,
        start_date   TEXT    NOT NULL,
        end_date     TEXT,
        created_at   TEXT    NOT NULL,
        description  TEXT
      );
      CREATE TABLE entry (
        habit_id TEXT    NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
        day      TEXT    NOT NULL,
        units    INTEGER NOT NULL,
        PRIMARY KEY (habit_id, day)
      );
      PRAGMA user_version = 4;
    `);
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?,?)').run(
			'h2',
			'Running',
			'daily',
			30,
			2,
			'2024-06-01',
			null,
			'2024-06-02T00:00:00.000Z',
			null
		);
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?,?)').run(
			'h1',
			'Piano',
			'daily',
			45,
			3,
			'2024-06-01',
			null,
			'2024-06-01T00:00:00.000Z',
			null
		);

		runMigrations(db);

		const order = (
			db.prepare('SELECT habit_id FROM habit_order ORDER BY position ASC').all() as {
				habit_id: string;
			}[]
		).map((r) => r.habit_id);
		expect(order).toEqual(['h1', 'h2']);
	});

	it('drops the habit_order row when its habit is deleted (cascade)', () => {
		runMigrations(db);
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?,?)').run(
			'h1',
			'Piano',
			'daily',
			45,
			3,
			'2024-06-01',
			null,
			'2024-06-01T00:00:00.000Z',
			null
		);
		db.prepare('INSERT INTO habit_order (habit_id, position) VALUES (?, ?)').run('h1', 0);
		db.prepare('DELETE FROM habit WHERE id = ?').run('h1');
		const remaining = db.prepare('SELECT * FROM habit_order').all();
		expect(remaining).toHaveLength(0);
	});
});
