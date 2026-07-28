import { openDatabase } from './db/database.ts';
import { runMigrations } from './db/migrations.ts';
import { SqliteHabitRepository } from './db/sqlite-habit-repository.ts';
import { SqliteEntryRepository } from './db/sqlite-entry-repository.ts';
import { SystemClock } from './system-clock.ts';

/**
 * Composition root: the single place that wires concrete adapters to the
 * application-layer ports and exposes fully-injected use-case functions.
 *
 * Import from `$lib/server/app.ts` in SvelteKit routes — never import infra
 * adapters or this file directly from UI code.
 */

function buildContainer(dbPath?: string) {
	const db = openDatabase(dbPath);
	runMigrations(db);

	const habits = new SqliteHabitRepository(db);
	const entries = new SqliteEntryRepository(db);
	const clock = new SystemClock();

	const deps = { habits, entries, clock };

	// Lazily import use cases to keep the module graph clean (avoids importing
	// all use-case modules into every file that touches the container).
	return {
		deps,
		/** Close the underlying database (call on process exit / in tests). */
		close: () => db.close()
	};
}

export type Container = ReturnType<typeof buildContainer>;

/** Singleton container for the running server process. */
let _container: Container | undefined;

export function getContainer(): Container {
	_container ??= buildContainer();
	return _container;
}

/** Build a container against a specific database path (e.g. `:memory:` in tests). */
export { buildContainer };
