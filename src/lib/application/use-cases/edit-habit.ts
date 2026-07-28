import { Day, HabitId, UnitOfWork, type DomainError } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import { HabitNotFound, type CorruptRecord } from '../ports/errors.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { HabitDTO } from '../dto.ts';
import { toHabitDTO } from '../mappers.ts';
import { parseGoal } from '../parsing.ts';

/** Every field is optional; only supplied fields are changed. `endDate: null` clears it. */
export interface EditHabitInput {
	habitId: string;
	name?: string;
	unitMinutes?: number;
	goalKind?: 'daily' | 'overall';
	targetUnits?: number;
	startDate?: string;
	endDate?: string | null;
}

export type EditHabitError = DomainError | HabitNotFound | CorruptRecord;

export interface EditHabitDeps {
	habits: HabitRepository;
	clock: Clock;
}

export async function editHabit(
	deps: EditHabitDeps,
	input: EditHabitInput
): Promise<Result<HabitDTO, EditHabitError>> {
	const idResult = HabitId.fromString(input.habitId);
	if (!idResult.ok) return err(idResult.error);

	const habitResult = await deps.habits.findById(idResult.value);
	if (!habitResult.ok) return err(habitResult.error);
	if (!habitResult.value) return err(new HabitNotFound(input.habitId));
	const habit = habitResult.value;

	let unitOfWork = habit.unitOfWork;
	if (input.unitMinutes !== undefined) {
		const unitResult = UnitOfWork.ofMinutes(input.unitMinutes);
		if (!unitResult.ok) return err(unitResult.error);
		unitOfWork = unitResult.value;
	}

	let goal = habit.goal;
	if (input.goalKind !== undefined || input.targetUnits !== undefined) {
		const goalResult = parseGoal(
			input.goalKind ?? habit.kind,
			input.targetUnits ?? habit.goal.targetUnits
		);
		if (!goalResult.ok) return err(goalResult.error);
		goal = goalResult.value;
	}

	let startDate = habit.startDate;
	if (input.startDate !== undefined) {
		const startDateResult = Day.fromISO(input.startDate);
		if (!startDateResult.ok) return err(startDateResult.error);
		startDate = startDateResult.value;
	}

	// `undefined` here means "leave unchanged" (as opposed to explicit `null` = clear).
	let endDate: Day | null | undefined = undefined;
	if (input.endDate !== undefined) {
		if (input.endDate === null) {
			endDate = null;
		} else {
			const endDateResult = Day.fromISO(input.endDate);
			if (!endDateResult.ok) return err(endDateResult.error);
			endDate = endDateResult.value;
		}
	}

	const updatedResult = habit.update({ name: input.name, unitOfWork, goal, startDate, endDate });
	if (!updatedResult.ok) return err(updatedResult.error);

	await deps.habits.save(updatedResult.value);
	return ok(toHabitDTO(updatedResult.value, deps.clock.today()));
}
