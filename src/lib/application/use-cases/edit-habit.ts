import { Day, HabitId, InvalidValue, type DomainError, type GoalKind } from '../../domain/index.ts';
import type { Option } from '../../shared/option.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import { HabitNotFound, type CorruptRecord } from '../ports/errors.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { HabitDTO } from '../dto.ts';
import { toHabitDTO } from '../mappers.ts';
import { parseGoal, parseOptionalDay, parseOptionalDescription } from '../parsing.ts';

/**
 * Every field is optional; only supplied fields are changed. `endDate: null`
 * clears it (it's optional in the domain); `undefined` leaves it unchanged.
 * `description` follows the same convention. `goalKind` and `targetUnits`
 * together redefine the goal: changing either re-derives the goal, falling
 * back to the habit's current kind/target for whichever one is omitted.
 * Existing entries stay valid across a goal change since they only record
 * raw units; just the dynamically computed progress is affected.
 * `unitMinutes` is fixed at creation and cannot be edited.
 */
export interface EditHabitInput {
	habitId: string;
	name?: string;
	goalKind?: GoalKind;
	targetUnits?: number;
	startDate?: string;
	endDate?: string | null;
	description?: string | null;
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

	let goal = habit.goal;
	if (input.goalKind !== undefined || input.targetUnits !== undefined) {
		const kind = input.goalKind ?? habit.kind;
		const targetUnits =
			input.targetUnits ?? ('targetUnits' in habit.goal ? habit.goal.targetUnits : undefined);
		if (kind !== 'progress' && targetUnits === undefined) {
			return err(new InvalidValue(`A target is required for a '${kind}' goal`));
		}
		const goalResult = parseGoal(kind, targetUnits ?? 0);
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
	let endDate: Option<Day> | undefined = undefined;
	if (input.endDate !== undefined) {
		const endDateResult = parseOptionalDay(input.endDate);
		if (!endDateResult.ok) return err(endDateResult.error);
		endDate = endDateResult.value;
	}

	// Same `undefined` vs. explicit-`null` convention as `endDate` above.
	let description: Option<string> | undefined = undefined;
	if (input.description !== undefined) {
		description = parseOptionalDescription(input.description);
	}

	const updatedResult = habit.update({ name: input.name, goal, startDate, endDate, description });
	if (!updatedResult.ok) return err(updatedResult.error);

	await deps.habits.save(updatedResult.value);
	return ok(toHabitDTO(updatedResult.value, deps.clock.today()));
}
