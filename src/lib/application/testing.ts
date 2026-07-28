import type { Day, Entry, EntryKey, Habit, HabitId } from '../domain/index.ts';
import { ok, type Result } from '../shared/result.ts';
import type { Clock } from './ports/clock.ts';
import type { CorruptRecord } from './ports/errors.ts';
import type { EntryRepository } from './ports/entry-repository.ts';
import type { HabitRepository } from './ports/habit-repository.ts';

/**
 * In-memory fakes implementing the application ports, for use-case tests.
 * They satisfy the exact same interfaces the SQLite adapters will, so use
 * cases are tested against real port contracts without touching a database.
 */

export class InMemoryHabitRepository implements HabitRepository {
	private readonly byId = new Map<string, Habit>();

	async save(habit: Habit): Promise<void> {
		this.byId.set(habit.id.value, habit);
	}

	async findById(id: HabitId): Promise<Result<Habit | null, CorruptRecord>> {
		return ok(this.byId.get(id.value) ?? null);
	}

	async listAll(): Promise<Result<Habit[], CorruptRecord>> {
		return ok([...this.byId.values()]);
	}

	async delete(id: HabitId): Promise<void> {
		this.byId.delete(id.value);
	}
}

export class InMemoryEntryRepository implements EntryRepository {
	private readonly byKey = new Map<string, Entry>();

	async save(entry: Entry): Promise<void> {
		this.byKey.set(entry.key.toString(), entry);
	}

	async findByKey(key: EntryKey): Promise<Result<Entry | null, CorruptRecord>> {
		return ok(this.byKey.get(key.toString()) ?? null);
	}

	async listByHabit(habitId: HabitId): Promise<Result<Entry[], CorruptRecord>> {
		return ok([...this.byKey.values()].filter((entry) => entry.habitId.equals(habitId)));
	}
}

/** A `Clock` fixed at a given day (and, by default, midnight UTC on that day). */
export class FixedClock implements Clock {
	private readonly instant: Date;

	constructor(
		private readonly day: Day,
		instant?: Date
	) {
		this.instant = instant ?? new Date(`${day.toISO()}T00:00:00.000Z`);
	}

	today(): Day {
		return this.day;
	}

	now(): Date {
		return this.instant;
	}
}
