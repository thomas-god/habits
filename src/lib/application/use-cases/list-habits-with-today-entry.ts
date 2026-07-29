import { Entry } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import type { CorruptRecord } from '../ports/errors.ts';
import type { EntryRepository } from '../ports/entry-repository.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { HabitWithTodayEntryDTO } from '../dto.ts';
import { toEntryDTO, toHabitDTO } from '../mappers.ts';
import { asOption, unwrapOr } from '../../shared/option.ts';

export interface ListHabitsWithTodayEntryInput {
	/** Include ended (archived / past-deadline) habits. Defaults to false. */
	includeArchived?: boolean;
}

export type ListHabitsWithTodayEntryError = CorruptRecord;

export interface ListHabitsWithTodayEntryDeps {
	habits: HabitRepository;
	entries: EntryRepository;
	clock: Clock;
}

/** Every (by default, active) habit paired with its entry for today. */
export async function listHabitsWithTodayEntry(
	deps: ListHabitsWithTodayEntryDeps,
	input: ListHabitsWithTodayEntryInput = {}
): Promise<Result<HabitWithTodayEntryDTO[], ListHabitsWithTodayEntryError>> {
	const today = deps.clock.today();

	const habitsResult = await deps.habits.listAll();
	if (!habitsResult.ok) return err(habitsResult.error);
	const habits = input.includeArchived
		? habitsResult.value
		: habitsResult.value.filter((habit) => habit.isActive(today));

	const results: HabitWithTodayEntryDTO[] = [];
	for (const habit of habits) {
		const entriesResult = await deps.entries.listByHabit(habit.id);
		if (!entriesResult.ok) return err(entriesResult.error);
		const todayEntry = unwrapOr(
			asOption(entriesResult.value.find((entry) => entry.day.equals(today))),
			Entry.create({ habitId: habit.id, day: today, units: 0 }).unwrap()
		);
		results.push({
			habit: toHabitDTO(habit, today),
			today: toEntryDTO(todayEntry)
		});
	}
	return ok(results);
}
