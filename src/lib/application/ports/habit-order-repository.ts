import type { HabitId } from '../../domain/index.ts';
import type { Result } from '../../shared/result.ts';
import type { CorruptRecord } from './errors.ts';

/**
 * Persistence boundary for the display order of habits, kept independent of
 * `HabitRepository` so ordering is a purely presentational concern layered on
 * top of habits rather than an attribute of the `Habit` entity itself.
 */
export interface HabitOrderRepository {
	/** All habit ids in display order, ascending. */
	list(): Promise<Result<HabitId[], CorruptRecord>>;

	/** Replace the full order; each id's position becomes its index in `order`. */
	save(order: HabitId[]): Promise<void>;

	/** Append a habit id at the end of the order (called when a habit is created). */
	append(id: HabitId): Promise<void>;

	/** Remove a habit id from the order (called when a habit is deleted). */
	remove(id: HabitId): Promise<void>;
}
