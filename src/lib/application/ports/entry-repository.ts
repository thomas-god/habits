import type { Entry, EntryKey, HabitId } from '../../domain/index.ts';
import type { Result } from '../../shared/result.ts';
import type { CorruptRecord } from './errors.ts';

/**
 * Persistence boundary for entries. See `HabitRepository` for the rationale
 * behind returning `Result` from reads but plain Promises from writes.
 *
 * An entry's identity is its `EntryKey` (habit + day) rather than a surrogate
 * id, so `save` is an upsert keyed by `entry.key`.
 */
export interface EntryRepository {
	/** Insert or overwrite the entry for its `(habitId, day)` key. */
	save(entry: Entry): Promise<void>;

	/** The entry at this key, or `null` if no units have been recorded. */
	findByKey(key: EntryKey): Promise<Result<Entry | null, CorruptRecord>>;

	/** Every entry recorded for `habitId`, in no particular order. */
	listByHabit(habitId: HabitId): Promise<Result<Entry[], CorruptRecord>>;
}
