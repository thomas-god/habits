import type { DatabaseSync } from 'node:sqlite';

/**
 * Idempotent schema migrations, applied in order on every startup.
 *
 * Each migration is identified by a monotonically increasing integer version.
 * The `schema_version` user-version pragma (built into SQLite, no extra table
 * needed) tracks the last applied version so only new migrations run.
 *
 * Rules for adding migrations:
 *  - Append only. Never edit or remove an existing entry.
 *  - Keep each migration self-contained and wrapped in a transaction.
 *  - Bump the version number by 1.
 */

const MIGRATIONS: { version: number; sql: string }[] = [
	{
		version: 1,
		sql: `
      CREATE TABLE IF NOT EXISTS habit (
        id           TEXT    NOT NULL PRIMARY KEY,
        name         TEXT    NOT NULL,
        type         TEXT    NOT NULL,
        unit_minutes INTEGER NOT NULL,
        goal_units   INTEGER NOT NULL,
        start_date   TEXT    NOT NULL,
        end_date     TEXT,
        created_at   TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entry (
        habit_id TEXT    NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
        day      TEXT    NOT NULL,
        units    INTEGER NOT NULL,
        PRIMARY KEY (habit_id, day)
      );
    `
	},
	{
		version: 2,
		sql: `
      ALTER TABLE habit ALTER COLUMN unit_minutes DROP NOT NULL;
    `
	},
	{
		version: 3,
		sql: `
      ALTER TABLE habit ADD COLUMN description TEXT;
    `
	}
];

export function runMigrations(db: DatabaseSync): void {
	const currentVersion = (db.prepare('PRAGMA user_version').get() as { user_version: number })
		.user_version;

	const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
	if (pending.length === 0) return;

	for (const migration of pending) {
		db.exec('BEGIN');
		try {
			db.exec(migration.sql);
			db.exec(`PRAGMA user_version = ${migration.version}`);
			db.exec('COMMIT');
		} catch (err) {
			db.exec('ROLLBACK');
			throw new Error(`Migration ${migration.version} failed: ${String(err)}`, { cause: err });
		}
	}
}
