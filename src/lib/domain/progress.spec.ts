import { describe, it, expect } from 'vitest';
import { Day } from './day.ts';
import { DailyGoal, OverallGoal } from './goal.ts';
import { Habit } from './habit.ts';
import { UnitOfWork } from './unit-of-work.ts';
import { Entry } from './entry.ts';
import { HabitId } from './ids.ts';
import { dailyProgress, overallProgress, progressFor, totalUnits } from './progress.ts';
import { expectOk } from '../shared/testing.ts';

const unit = expectOk(UnitOfWork.ofMinutes(60));
const start = expectOk(Day.fromISO('2024-06-01'));

function daily(target: number) {
	return expectOk(
		Habit.from({
			id: HabitId.generate(),
			name: 'Piano',
			unitOfWork: unit,
			goal: expectOk(DailyGoal.of(target)),
			startDate: start,
			createdAt: new Date()
		})
	);
}

function overall(target: number, endDate: Day | null = null) {
	return expectOk(
		Habit.from({
			id: HabitId.generate(),
			name: 'CAD',
			unitOfWork: unit,
			goal: expectOk(OverallGoal.of(target)),
			startDate: start,
			endDate,
			createdAt: new Date()
		})
	);
}

describe('totalUnits', () => {
	it('sums entry units', () => {
		const habitId = HabitId.generate();
		const entries = [
			expectOk(Entry.create({ habitId, day: expectOk(Day.fromISO('2024-06-02')), units: 2 })),
			expectOk(Entry.create({ habitId, day: expectOk(Day.fromISO('2024-06-03')), units: 3 }))
		];
		expect(totalUnits(entries)).toBe(5);
	});
});

describe('dailyProgress', () => {
	it('reports partial progress', () => {
		const p = dailyProgress(daily(3), 1);
		expect(p.ratio).toBeCloseTo(1 / 3);
		expect(p.remainingUnits).toBe(2);
		expect(p.met).toBe(false);
	});

	it('caps ratio at 1 and marks met when reached or exceeded', () => {
		const p = dailyProgress(daily(3), 5);
		expect(p.ratio).toBe(1);
		expect(p.remainingUnits).toBe(0);
		expect(p.met).toBe(true);
	});

	it('throws for a habit with an overall goal (programmer error)', () => {
		expect(() => dailyProgress(overall(100), 1)).toThrow();
	});
});

describe('overallProgress', () => {
	const today = expectOk(Day.fromISO('2024-06-10'));

	it('reports cumulative progress with no deadline', () => {
		const p = overallProgress(overall(100), 40, today);
		expect(p.ratio).toBeCloseTo(0.4);
		expect(p.remainingUnits).toBe(60);
		expect(p.met).toBe(false);
		expect(p.daysRemaining).toBeNull();
		expect(p.requiredUnitsPerDay).toBeNull();
	});

	it('paces required units per day against the end date (inclusive of today)', () => {
		const end = expectOk(Day.fromISO('2024-06-19')); // 10 days remaining incl. today
		const p = overallProgress(overall(100, end), 40, today);
		expect(p.daysRemaining).toBe(10);
		expect(p.requiredUnitsPerDay).toBeCloseTo(6); // 60 remaining / 10 days
	});

	it('marks met and stops requiring further work', () => {
		const end = expectOk(Day.fromISO('2024-06-19'));
		const p = overallProgress(overall(100, end), 100, today);
		expect(p.met).toBe(true);
		expect(p.remainingUnits).toBe(0);
		expect(p.requiredUnitsPerDay).toBeNull();
	});

	it('handles a passed deadline without dividing by zero', () => {
		const end = expectOk(Day.fromISO('2024-06-05')); // already passed
		const p = overallProgress(overall(100, end), 40, today);
		expect(p.daysRemaining).toBe(0);
		expect(p.requiredUnitsPerDay).toBeNull();
	});

	it('throws for a habit with a daily goal (programmer error)', () => {
		expect(() => overallProgress(daily(3), 1, today)).toThrow();
	});
});

describe('progressFor', () => {
	const today = expectOk(Day.fromISO('2024-06-10'));
	const habitId = HabitId.generate();

	it("dispatches to dailyProgress using only today's entry", () => {
		const entries = [
			expectOk(Entry.create({ habitId, day: expectOk(Day.fromISO('2024-06-09')), units: 5 })),
			expectOk(Entry.create({ habitId, day: today, units: 2 }))
		];
		const p = progressFor(daily(3), entries, today);
		expect(p.kind).toBe('daily');
		expect(p.doneUnits).toBe(2);
	});

	it('defaults to zero done units when there is no entry for today', () => {
		const p = progressFor(daily(3), [], today);
		expect(p.doneUnits).toBe(0);
	});

	it('dispatches to overallProgress summing every entry', () => {
		const entries = [
			expectOk(Entry.create({ habitId, day: expectOk(Day.fromISO('2024-06-09')), units: 5 })),
			expectOk(Entry.create({ habitId, day: today, units: 2 }))
		];
		const p = progressFor(overall(100), entries, today);
		expect(p.kind).toBe('overall');
		expect(p.doneUnits).toBe(7);
	});
});
