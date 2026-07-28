import { DatabaseSync } from 'node:sqlite';
import { env } from 'node:process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Open (and configure) the SQLite database.
 *
 * The path is resolved from the `DATABASE_PATH` environment variable, falling
 * back to `<cwd>/data/habits.db`. `:memory:` is accepted as-is for tests.
 * The parent directory is created automatically if it does not exist.
 *
 * Settings applied to every connection:
 *  - WAL journal mode  — better concurrent read performance.
 *  - foreign_keys ON   — enforces ON DELETE CASCADE for entries.
 *  - busy_timeout      — retries briefly instead of failing immediately when
 *                        the WAL is locked by another process.
 */
export function openDatabase(path?: string): DatabaseSync {
	const dbPath = path ?? env.DATABASE_PATH ?? resolve('data', 'habits.db');

	if (dbPath !== ':memory:') {
		mkdirSync(dirname(dbPath), { recursive: true });
	}

	const db = new DatabaseSync(dbPath);
	db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
	return db;
}
