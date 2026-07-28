import { HabitId, type DomainError } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import { HabitNotFound, type CorruptRecord } from '../ports/errors.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { HabitDTO } from '../dto.ts';
import { toHabitDTO } from '../mappers.ts';

export interface ArchiveHabitInput {
	habitId: string;
}

export type ArchiveHabitError = DomainError | HabitNotFound | CorruptRecord;

export interface ArchiveHabitDeps {
	habits: HabitRepository;
	clock: Clock;
}

/** Archive a habit by setting its end date to today. */
export async function archiveHabit(
	deps: ArchiveHabitDeps,
	input: ArchiveHabitInput
): Promise<Result<HabitDTO, ArchiveHabitError>> {
	const idResult = HabitId.fromString(input.habitId);
	if (!idResult.ok) return err(idResult.error);

	const habitResult = await deps.habits.findById(idResult.value);
	if (!habitResult.ok) return err(habitResult.error);
	if (!habitResult.value) return err(new HabitNotFound(input.habitId));

	const today = deps.clock.today();
	const archivedResult = habitResult.value.archiveOn(today);
	if (!archivedResult.ok) return err(archivedResult.error);

	await deps.habits.save(archivedResult.value);
	return ok(toHabitDTO(archivedResult.value, today));
}
