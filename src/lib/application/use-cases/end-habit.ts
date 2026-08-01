import { HabitId, type DomainError } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import { HabitNotFound, type CorruptRecord } from '../ports/errors.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { HabitDTO } from '../dto.ts';
import { toHabitDTO } from '../mappers.ts';

export interface EndHabitInput {
	habitId: string;
}

export type EndHabitError = DomainError | HabitNotFound | CorruptRecord;

export interface EndHabitDeps {
	habits: HabitRepository;
	clock: Clock;
}

/** End a habit by setting its end date to today. */
export async function endHabit(
	deps: EndHabitDeps,
	input: EndHabitInput
): Promise<Result<HabitDTO, EndHabitError>> {
	const idResult = HabitId.fromString(input.habitId);
	if (!idResult.ok) return err(idResult.error);

	const habitResult = await deps.habits.findById(idResult.value);
	if (!habitResult.ok) return err(habitResult.error);
	if (!habitResult.value) return err(new HabitNotFound(input.habitId));

	const today = deps.clock.today();
	const endedResult = habitResult.value.endOn(today);
	if (!endedResult.ok) return err(endedResult.error);

	await deps.habits.save(endedResult.value);
	return ok(toHabitDTO(endedResult.value, today));
}
