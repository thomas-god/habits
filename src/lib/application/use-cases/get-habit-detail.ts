import { HabitId, progressFor, type DomainError } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import type { EntryRepository } from '../ports/entry-repository.ts';
import { HabitNotFound, type CorruptRecord } from '../ports/errors.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { HabitDetailDTO } from '../dto.ts';
import { toEntryDTO, toHabitDTO } from '../mappers.ts';

export interface GetHabitDetailInput {
	habitId: string;
}

export type GetHabitDetailError = DomainError | HabitNotFound | CorruptRecord;

export interface GetHabitDetailDeps {
	habits: HabitRepository;
	entries: EntryRepository;
	clock: Clock;
}

/** A single habit with its full recorded history and progress as of today. */
export async function getHabitDetail(
	deps: GetHabitDetailDeps,
	input: GetHabitDetailInput
): Promise<Result<HabitDetailDTO, GetHabitDetailError>> {
	const idResult = HabitId.fromString(input.habitId);
	if (!idResult.ok) return err(idResult.error);

	const habitResult = await deps.habits.findById(idResult.value);
	if (!habitResult.ok) return err(habitResult.error);
	if (!habitResult.value) return err(new HabitNotFound(input.habitId));
	const habit = habitResult.value;

	const entriesResult = await deps.entries.listByHabit(habit.id);
	if (!entriesResult.ok) return err(entriesResult.error);
	const entries = [...entriesResult.value].sort((a, b) =>
		a.day.isBefore(b.day) ? -1 : a.day.equals(b.day) ? 0 : 1
	);

	const today = deps.clock.today();
	return ok({
		habit: toHabitDTO(habit, today),
		progress: progressFor(habit, entries, today),
		entries: entries.map(toEntryDTO)
	});
}
