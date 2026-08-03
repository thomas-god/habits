import type { GoalKind, Progress } from '../domain/index.ts';

/**
 * Data shapes crossing the application boundary. Use cases take plain input
 * DTOs and return plain output DTOs — never domain objects — so the UI (or
 * any other driving adapter) never depends on domain types directly.
 *
 * Dates are plain ISO strings; `Progress` (from the domain) is already a
 * plain, behaviour-free data shape, so it is reused as-is rather than wrapped.
 */
export interface HabitDTO {
	readonly id: string;
	readonly name: string;
	readonly description: string | null;
	readonly unitMinutes: number | null;
	readonly kind: GoalKind;
	/** null for a "progress" goal, which has no target. */
	readonly targetUnits: number | null;
	readonly startDate: string;
	readonly endDate: string | null;
	readonly createdAt: string;
	/** Whether the habit is active as of the day it was computed for. */
	readonly active: boolean;
}

export interface EntryDTO {
	readonly day: string;
	readonly units: number;
}

export interface HabitProgressDTO {
	readonly habit: HabitDTO;
	readonly progress: Progress;
}

export interface HabitWithTodayEntryDTO {
	readonly habit: HabitDTO;
	readonly today: EntryDTO;
}

export interface HabitDetailDTO {
	readonly habit: HabitDTO;
	readonly progress: Progress;
	/** History for this habit, ordered by day ascending. */
	readonly entries: EntryDTO[];
}
