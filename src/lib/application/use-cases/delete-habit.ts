import { HabitId, type DomainError } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import { HabitNotFound, type CorruptRecord } from '../ports/errors.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';

export interface DeleteHabitInput {
	habitId: string;
}

export type DeleteHabitError = DomainError | HabitNotFound | CorruptRecord;

export interface DeleteHabitDeps {
	habits: HabitRepository;
}

/** Permanently remove a habit and (per the schema) its recorded entries. */
export async function deleteHabit(
	deps: DeleteHabitDeps,
	input: DeleteHabitInput
): Promise<Result<void, DeleteHabitError>> {
	const idResult = HabitId.fromString(input.habitId);
	if (!idResult.ok) return err(idResult.error);

	const habitResult = await deps.habits.findById(idResult.value);
	if (!habitResult.ok) return err(habitResult.error);
	if (!habitResult.value) return err(new HabitNotFound(input.habitId));

	await deps.habits.delete(idResult.value);
	return ok(undefined);
}
