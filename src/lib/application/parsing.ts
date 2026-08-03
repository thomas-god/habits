import {
	Day,
	DailyGoal,
	OverallGoal,
	ProgressGoal,
	UnitOfWork,
	type DomainError,
	type Goal,
	type GoalKind
} from '../domain/index.ts';
import { none, some, type Option } from '../shared/option.ts';
import { err, ok, type Result } from '../shared/result.ts';

/**
 * Raw-input parsing shared by use cases that build or edit a habit's
 * scheduling/target fields. Centralised here so every entry point into the
 * domain (create, edit) applies the exact same parsing rules.
 */

export function parseGoal(kind: GoalKind, targetUnits: number): Result<Goal, DomainError> {
	switch (kind) {
		case 'daily':
			return DailyGoal.of(targetUnits);
		case 'overall':
			return OverallGoal.of(targetUnits);
		case 'progress':
			return ok(ProgressGoal.of());
	}
}

/** `undefined`/`null` parse to "no end date"; otherwise a strict ISO date. */
export function parseOptionalDay(
	value: string | null | undefined
): Result<Option<Day>, DomainError> {
	if (value === null || value === undefined) return ok(none());
	return Day.fromISO(value).map(some);
}

/** `undefined`/`null` parse to "no unit of work"; otherwise a valid minute count. */
export function parseOptionalUnitOfWork(
	value: number | null | undefined
): Result<Option<UnitOfWork>, DomainError> {
	if (value === null || value === undefined) return ok(none());
	return UnitOfWork.ofMinutes(value).map(some);
}

/** `undefined`/`null`/blank parse to "no description"; otherwise the trimmed string. */
export function parseOptionalDescription(value: string | null | undefined): Option<string> {
	if (value === null || value === undefined) return none();
	const trimmed = value.trim();
	return trimmed.length === 0 ? none() : some(trimmed);
}

export interface HabitFieldsInput {
	unitMinutes?: number | null;
	goalKind: GoalKind;
	targetUnits: number;
	startDate: string;
	endDate?: string | null;
	description?: string | null;
}

export interface ParsedHabitFields {
	unitOfWork: Option<UnitOfWork>;
	goal: Goal;
	startDate: Day;
	endDate: Option<Day>;
	description: Option<string>;
}

/** Parse the raw scheduling/goal fields shared by the create/edit habit inputs. */
export function parseHabitFields(input: HabitFieldsInput): Result<ParsedHabitFields, DomainError> {
	const startDateResult = Day.fromISO(input.startDate);
	if (!startDateResult.ok) return err(startDateResult.error);

	const endDateResult = parseOptionalDay(input.endDate);
	if (!endDateResult.ok) return err(endDateResult.error);

	const unitResult = parseOptionalUnitOfWork(input.unitMinutes);
	if (!unitResult.ok) return err(unitResult.error);

	const goalResult = parseGoal(input.goalKind, input.targetUnits);
	if (!goalResult.ok) return err(goalResult.error);

	return ok({
		startDate: startDateResult.value,
		endDate: endDateResult.value,
		unitOfWork: unitResult.value,
		goal: goalResult.value,
		description: parseOptionalDescription(input.description)
	});
}
