import { describe, it, expect } from 'vitest';
import { Day } from './day.ts';
import { DailyGoal, OverallGoal } from './goal.ts';
import { Habit } from './habit.ts';
import { HabitId } from './ids.ts';
import { UnitOfWork } from './unit-of-work.ts';
import { InvalidHabit } from './errors.ts';
import { none, some } from '../shared/option.ts';
import { expectOk, expectErr } from '../shared/testing.ts';

const unit = expectOk(UnitOfWork.ofMinutes(60));
const start = expectOk(Day.fromISO('2024-06-01'));
const dailyGoal = expectOk(DailyGoal.of(3));
const id = HabitId.generate();

function makeHabit(overrides: Partial<Parameters<typeof Habit.from>[0]> = {}) {
	return Habit.from({
		id,
		name: 'Piano',
		unitOfWork: some(unit),
		goal: dailyGoal,
		startDate: start,
		createdAt: new Date(),
		...overrides
	});
}

describe('Habit.from', () => {
	it('parses a valid habit, trimming the name and defaulting the end date', () => {
		const habit = expectOk(makeHabit({ name: '  Piano  ' }));
		expect(habit.name).toBe('Piano');
		expect(habit.endDate).toBeNull();
		expect(habit.id.equals(id)).toBe(true);
		expect(habit.kind).toBe('daily');
	});

	it('preserves the supplied identity', () => {
		const other = HabitId.generate();
		expect(expectOk(makeHabit({ id: other })).id.equals(other)).toBe(true);
	});

	it('returns Err for an empty name', () => {
		expect(expectErr(makeHabit({ name: '   ' }))).toBeInstanceOf(InvalidHabit);
	});

	it('returns Err for an end date before the start date', () => {
		const badEnd = expectOk(Day.fromISO('2024-05-31'));
		expect(expectErr(makeHabit({ endDate: badEnd }))).toBeInstanceOf(InvalidHabit);
	});

	it('allows an end date equal to the start date', () => {
		const habit = expectOk(makeHabit({ endDate: start }));
		expect(habit.endDate?.toISO()).toBe('2024-06-01');
	});

	it('derives kind from an overall goal', () => {
		const habit = expectOk(makeHabit({ goal: expectOk(OverallGoal.of(100)) }));
		expect(habit.kind).toBe('overall');
	});

	it('allows a habit with no unit of work', () => {
		const habit = expectOk(makeHabit({ unitOfWork: none() }));
		expect(habit.unitOfWork.isNone()).toBe(true);
	});
});

describe('Habit.isActive / isEnded', () => {
	const habit = expectOk(makeHabit({ endDate: expectOk(Day.fromISO('2024-06-30')) }));

	it('is inactive before the start date', () => {
		expect(habit.isActive(expectOk(Day.fromISO('2024-05-31')))).toBe(false);
	});

	it('is active within the range (inclusive)', () => {
		expect(habit.isActive(start)).toBe(true);
		expect(habit.isActive(expectOk(Day.fromISO('2024-06-30')))).toBe(true);
	});

	it('is inactive after the end date', () => {
		expect(habit.isActive(expectOk(Day.fromISO('2024-07-01')))).toBe(false);
	});

	it('open-ended habits stay active indefinitely', () => {
		const open = expectOk(makeHabit());
		expect(open.isActive(expectOk(Day.fromISO('2099-01-01')))).toBe(true);
	});

	it('reports ended only strictly after the end date', () => {
		expect(habit.isEnded(expectOk(Day.fromISO('2024-06-30')))).toBe(false);
		expect(habit.isEnded(expectOk(Day.fromISO('2024-07-01')))).toBe(true);
	});
});

describe('Habit.archiveOn', () => {
	const persisted = expectOk(makeHabit());

	it('sets the end date to the archive day and preserves the id', () => {
		const archived = expectOk(persisted.archiveOn(expectOk(Day.fromISO('2024-06-15'))));
		expect(archived.endDate?.toISO()).toBe('2024-06-15');
		expect(archived.id.equals(id)).toBe(true);
		expect(archived.isActive(expectOk(Day.fromISO('2024-06-16')))).toBe(false);
	});

	it('returns Err when archiving before the start date', () => {
		expect(expectErr(persisted.archiveOn(expectOk(Day.fromISO('2024-05-01'))))).toBeInstanceOf(
			InvalidHabit
		);
	});
});

describe('Habit.update', () => {
	const persisted = expectOk(makeHabit());

	it('applies changes, re-validates, and keeps the id', () => {
		const updated = expectOk(persisted.update({ name: 'Guitar', goal: expectOk(DailyGoal.of(2)) }));
		expect(updated.id.equals(id)).toBe(true);
		expect(updated.name).toBe('Guitar');
		expect((updated.goal as DailyGoal).targetUnits).toBe(2);
	});

	it('can clear the end date explicitly', () => {
		const withEnd = expectOk(persisted.update({ endDate: expectOk(Day.fromISO('2024-06-30')) }));
		expect(expectOk(withEnd.update({ endDate: null })).endDate).toBeNull();
	});

	it('can clear the unit of work explicitly', () => {
		const updated = expectOk(persisted.update({ unitOfWork: none() }));
		expect(updated.unitOfWork.isNone()).toBe(true);
	});

	it('returns Err when an update violates an invariant', () => {
		expect(expectErr(persisted.update({ name: '  ' }))).toBeInstanceOf(InvalidHabit);
	});
});
