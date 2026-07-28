import { Habit, HabitId, type DomainError, type GoalKind } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { HabitDTO } from '../dto.ts';
import { toHabitDTO } from '../mappers.ts';
import { parseHabitFields } from '../parsing.ts';

export interface CreateHabitInput {
	name: string;
	unitMinutes: number;
	goalKind: GoalKind;
	targetUnits: number;
	startDate: string;
	endDate?: string | null;
}

export type CreateHabitError = DomainError;

export interface CreateHabitDeps {
	habits: HabitRepository;
	clock: Clock;
}

/** Parse `input`, build a new `Habit` with a freshly minted identity, and persist it. */
export async function createHabit(
	deps: CreateHabitDeps,
	input: CreateHabitInput
): Promise<Result<HabitDTO, CreateHabitError>> {
	const fieldsResult = parseHabitFields(input);
	if (!fieldsResult.ok) return err(fieldsResult.error);
	const { unitOfWork, goal, startDate, endDate } = fieldsResult.value;

	const habitResult = Habit.from({
		id: HabitId.generate(),
		name: input.name,
		unitOfWork,
		goal,
		startDate,
		endDate,
		createdAt: deps.clock.now()
	});
	if (!habitResult.ok) return err(habitResult.error);

	await deps.habits.save(habitResult.value);
	return ok(toHabitDTO(habitResult.value, deps.clock.today()));
}
