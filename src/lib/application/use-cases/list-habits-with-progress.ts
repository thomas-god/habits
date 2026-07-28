import { progressFor } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import type { CorruptRecord } from '../ports/errors.ts';
import type { EntryRepository } from '../ports/entry-repository.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { HabitProgressDTO } from '../dto.ts';
import { toHabitDTO } from '../mappers.ts';

export interface ListHabitsWithProgressInput {
	/** Include ended (archived / past-deadline) habits. Defaults to false. */
	includeArchived?: boolean;
}

export type ListHabitsWithProgressError = CorruptRecord;

export interface ListHabitsWithProgressDeps {
	habits: HabitRepository;
	entries: EntryRepository;
	clock: Clock;
}

/** Every (by default, active) habit paired with its progress as of today. */
export async function listHabitsWithProgress(
	deps: ListHabitsWithProgressDeps,
	input: ListHabitsWithProgressInput = {}
): Promise<Result<HabitProgressDTO[], ListHabitsWithProgressError>> {
	const today = deps.clock.today();

	const habitsResult = await deps.habits.listAll();
	if (!habitsResult.ok) return err(habitsResult.error);
	const habits = input.includeArchived
		? habitsResult.value
		: habitsResult.value.filter((habit) => habit.isActive(today));

	const results: HabitProgressDTO[] = [];
	for (const habit of habits) {
		const entriesResult = await deps.entries.listByHabit(habit.id);
		if (!entriesResult.ok) return err(entriesResult.error);
		results.push({
			habit: toHabitDTO(habit, today),
			progress: progressFor(habit, entriesResult.value, today)
		});
	}
	return ok(results);
}
