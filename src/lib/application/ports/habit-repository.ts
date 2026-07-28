import type { Habit, HabitId } from '../../domain/index.ts';
import type { Result } from '../../shared/result.ts';
import type { CorruptRecord } from './errors.ts';

/**
 * Persistence boundary for habits, defined (as a driven port) by the
 * application layer and implemented by an infrastructure adapter (e.g. the
 * SQLite repository) or a test fake (in-memory).
 *
 * Reads return a `Result` because the stored data may fail to rehydrate into
 * a valid `Habit` (`CorruptRecord`) — an expected, typed outcome the caller
 * must handle. Absence is not an error: a missing habit is `null`, not `Err`.
 * Writes (`save`/`delete`) are plain Promises: unrecoverable I/O failures
 * (disk full, connection lost) are environmental faults, not domain-meaningful
 * outcomes, so they propagate as rejected promises rather than typed errors.
 */
export interface HabitRepository {
	/** Insert or overwrite the habit with this id. */
	save(habit: Habit): Promise<void>;

	/** The habit with this id, or `null` if none exists. */
	findById(id: HabitId): Promise<Result<Habit | null, CorruptRecord>>;

	/** Every habit, active or ended. */
	listAll(): Promise<Result<Habit[], CorruptRecord>>;

	/** Remove the habit with this id (and, per the schema, its entries). */
	delete(id: HabitId): Promise<void>;
}
