import {
	Day,
	DailyGoal,
	Entry,
	Habit,
	HabitId,
	OverallGoal,
	UnitOfWork
} from '../../domain/index.ts';
import { none, some, type Option } from '../../shared/option.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import { CorruptRecord } from '../../application/ports/errors.ts';

/**
 * Raw row shapes returned by node:sqlite (null-prototype objects).
 * Typed here so the compiler catches column-name typos in the repositories.
 */
export interface HabitRow {
	id: string;
	name: string;
	description: string | null;
	type: string;
	unit_minutes: number | null;
	goal_units: number;
	start_date: string;
	end_date: string | null;
	created_at: string;
}

export interface EntryRow {
	habit_id: string;
	day: string;
	units: number;
}

/** Map a domain `Habit` to its storable column values. */
export function habitToRow(habit: Habit): HabitRow {
	return {
		id: habit.id.value,
		name: habit.name,
		description: habit.description.match({ some: (d) => d, none: () => null }),
		type: habit.goal.kind,
		unit_minutes: habit.unitOfWork.match({ some: (u) => u.minutes, none: () => null }),
		goal_units: habit.goal.targetUnits,
		start_date: habit.startDate.toISO(),
		end_date: habit.endDate.match({ some: (d) => d.toISO(), none: () => null }),
		created_at: habit.createdAt.toISOString()
	};
}

/** Map a domain `Entry` to its storable column values. */
export function entryToRow(entry: Entry): EntryRow {
	return {
		habit_id: entry.habitId.value,
		day: entry.day.toISO(),
		units: entry.units
	};
}

/** Parse a raw database row back into a `Habit`, or return a `CorruptRecord`. */
export function rowToHabit(row: HabitRow): Result<Habit, CorruptRecord> {
	const idResult = HabitId.fromString(row.id);
	if (!idResult.ok) return corrupt(row.id, 'id', idResult.error);

	const startResult = Day.fromISO(row.start_date);
	if (!startResult.ok) return corrupt(row.id, 'start_date', startResult.error);

	const endResult =
		row.end_date !== null ? Day.fromISO(row.end_date).map(some) : ok<Option<Day>, never>(none());
	if (!endResult.ok) return corrupt(row.id, 'end_date', endResult.error);

	const unitResult =
		row.unit_minutes === null
			? ok(none<UnitOfWork>())
			: UnitOfWork.ofMinutes(row.unit_minutes).map(some);
	if (!unitResult.ok) return corrupt(row.id, 'unit_minutes', unitResult.error);

	const goalResult =
		row.type === 'daily'
			? DailyGoal.of(row.goal_units)
			: row.type === 'overall'
				? OverallGoal.of(row.goal_units)
				: err(new CorruptRecord(`Unknown habit type: "${row.type}"`, null));
	if (!goalResult.ok) return corrupt(row.id, 'type/goal_units', goalResult.error);

	const habitResult = Habit.from({
		id: idResult.value,
		name: row.name,
		description: row.description === null ? none() : some(row.description),
		unitOfWork: unitResult.value,
		goal: goalResult.value,
		startDate: startResult.value,
		endDate: endResult.value,
		createdAt: new Date(row.created_at)
	});
	if (!habitResult.ok) return corrupt(row.id, 'invariants', habitResult.error);

	return habitResult;
}

/** Parse a raw database row back into an `Entry`, or return a `CorruptRecord`. */
export function rowToEntry(row: EntryRow): Result<Entry, CorruptRecord> {
	const habitIdResult = HabitId.fromString(row.habit_id);
	if (!habitIdResult.ok) return corrupt(row.habit_id, 'habit_id', habitIdResult.error);

	const dayResult = Day.fromISO(row.day);
	if (!dayResult.ok) return corrupt(`${row.habit_id}:${row.day}`, 'day', dayResult.error);

	const entryResult = Entry.create({
		habitId: habitIdResult.value,
		day: dayResult.value,
		units: row.units
	});
	if (!entryResult.ok) return corrupt(`${row.habit_id}:${row.day}`, 'units', entryResult.error);

	return entryResult;
}

function corrupt(recordId: string, field: string, cause: unknown): Result<never, CorruptRecord> {
	return err(
		new CorruptRecord(
			`Corrupt record (id=${recordId}, field=${field}): ${cause instanceof Error ? cause.message : String(cause)}`,
			cause
		)
	);
}
