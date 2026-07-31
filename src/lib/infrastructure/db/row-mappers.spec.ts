import { describe, it, expect } from 'vitest';
import {
	Day,
	DailyGoal,
	Entry,
	Habit,
	HabitId,
	OverallGoal,
	UnitOfWork
} from '../../domain/index.ts';
import { CorruptRecord } from '../../application/ports/errors.ts';
import { none, some } from '../../shared/option.ts';
import { expectOk, expectErr } from '../../shared/testing.ts';
import {
	entryToRow,
	habitToRow,
	rowToEntry,
	rowToHabit,
	type EntryRow,
	type HabitRow
} from './row-mappers.ts';

const habitId = HabitId.generate();
const unit = expectOk(UnitOfWork.ofMinutes(45));
const start = expectOk(Day.fromISO('2024-06-01'));
const createdAt = new Date('2024-06-01T08:00:00.000Z');

function makeHabit(overrides: Partial<Parameters<typeof Habit.from>[0]> = {}) {
	return expectOk(
		Habit.from({
			id: habitId,
			name: 'Piano',
			unitOfWork: some(unit),
			goal: expectOk(DailyGoal.of(3)),
			startDate: start,
			createdAt,
			...overrides
		})
	);
}

function validHabitRow(overrides: Partial<HabitRow> = {}): HabitRow {
	return {
		id: habitId.value,
		name: 'Piano',
		type: 'daily',
		unit_minutes: 45,
		goal_units: 3,
		start_date: '2024-06-01',
		end_date: null,
		created_at: '2024-06-01T08:00:00.000Z',
		...overrides
	};
}

function validEntryRow(overrides: Partial<EntryRow> = {}): EntryRow {
	return { habit_id: habitId.value, day: '2024-06-10', units: 2, ...overrides };
}

describe('habitToRow', () => {
	it('maps all fields correctly', () => {
		const row = habitToRow(makeHabit());
		expect(row.id).toBe(habitId.value);
		expect(row.name).toBe('Piano');
		expect(row.type).toBe('daily');
		expect(row.unit_minutes).toBe(45);
		expect(row.goal_units).toBe(3);
		expect(row.start_date).toBe('2024-06-01');
		expect(row.end_date).toBeNull();
		expect(row.created_at).toBe('2024-06-01T08:00:00.000Z');
	});

	it('serialises an end date', () => {
		const row = habitToRow(makeHabit({ endDate: expectOk(Day.fromISO('2024-08-31')) }));
		expect(row.end_date).toBe('2024-08-31');
	});

	it('maps an overall goal', () => {
		const row = habitToRow(makeHabit({ goal: expectOk(OverallGoal.of(100)) }));
		expect(row.type).toBe('overall');
		expect(row.goal_units).toBe(100);
	});

	it('maps a habit with no unit of work to a null unit_minutes', () => {
		const row = habitToRow(makeHabit({ unitOfWork: none() }));
		expect(row.unit_minutes).toBeNull();
	});
});

describe('rowToHabit', () => {
	it('round-trips a valid row', () => {
		const habit = expectOk(rowToHabit(validHabitRow()));
		expect(habit.id.value).toBe(habitId.value);
		expect(habit.name).toBe('Piano');
		expect(habit.unitOfWork.unwrap().minutes).toBe(45);
		expect(habit.kind).toBe('daily');
		expect(habit.goal.targetUnits).toBe(3);
		expect(habit.startDate.toISO()).toBe('2024-06-01');
		expect(habit.endDate).toBeNull();
		expect(habit.createdAt.toISOString()).toBe('2024-06-01T08:00:00.000Z');
	});

	it('parses an overall habit with an end date', () => {
		const habit = expectOk(
			rowToHabit(validHabitRow({ type: 'overall', goal_units: 100, end_date: '2024-08-31' }))
		);
		expect(habit.kind).toBe('overall');
		expect(habit.endDate?.toISO()).toBe('2024-08-31');
	});

	it('returns CorruptRecord for an invalid habit id', () => {
		expect(expectErr(rowToHabit(validHabitRow({ id: 'bad' })))).toBeInstanceOf(CorruptRecord);
	});

	it('returns CorruptRecord for an invalid start_date', () => {
		expect(expectErr(rowToHabit(validHabitRow({ start_date: 'not-a-date' })))).toBeInstanceOf(
			CorruptRecord
		);
	});

	it('returns CorruptRecord for an invalid end_date', () => {
		expect(expectErr(rowToHabit(validHabitRow({ end_date: '2024-13-01' })))).toBeInstanceOf(
			CorruptRecord
		);
	});

	it('returns CorruptRecord for an unknown type', () => {
		expect(expectErr(rowToHabit(validHabitRow({ type: 'unknown' })))).toBeInstanceOf(CorruptRecord);
	});

	it('returns CorruptRecord for a zero unit_minutes', () => {
		expect(expectErr(rowToHabit(validHabitRow({ unit_minutes: 0 })))).toBeInstanceOf(CorruptRecord);
	});

	it('round-trips a null unit_minutes as no unit of work', () => {
		const habit = expectOk(rowToHabit(validHabitRow({ unit_minutes: null })));
		expect(habit.unitOfWork.isNone()).toBe(true);
	});
});

describe('entryToRow / rowToEntry', () => {
	it('entryToRow maps all fields', () => {
		const entry = expectOk(
			Entry.create({ habitId, day: expectOk(Day.fromISO('2024-06-10')), units: 2 })
		);
		const row = entryToRow(entry);
		expect(row.habit_id).toBe(habitId.value);
		expect(row.day).toBe('2024-06-10');
		expect(row.units).toBe(2);
	});

	it('rowToEntry round-trips a valid row', () => {
		const entry = expectOk(rowToEntry(validEntryRow()));
		expect(entry.habitId.value).toBe(habitId.value);
		expect(entry.day.toISO()).toBe('2024-06-10');
		expect(entry.units).toBe(2);
	});

	it('returns CorruptRecord for an invalid habit_id', () => {
		expect(expectErr(rowToEntry(validEntryRow({ habit_id: 'bad' })))).toBeInstanceOf(CorruptRecord);
	});

	it('returns CorruptRecord for an invalid day', () => {
		expect(expectErr(rowToEntry(validEntryRow({ day: 'not-a-date' })))).toBeInstanceOf(
			CorruptRecord
		);
	});

	it('returns CorruptRecord for negative units', () => {
		expect(expectErr(rowToEntry(validEntryRow({ units: -1 })))).toBeInstanceOf(CorruptRecord);
	});
});
