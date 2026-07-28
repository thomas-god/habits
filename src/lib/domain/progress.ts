import type { Day } from './day.ts';
import type { Entry } from './entry.ts';
import type { Habit } from './habit.ts';

/** Sum of the units recorded across a set of entries. */
export function totalUnits(entries: readonly Entry[]): number {
	return entries.reduce((sum, entry) => sum + entry.units, 0);
}

export interface DailyProgress {
	readonly kind: 'daily';
	readonly doneUnits: number;
	readonly targetUnits: number;
	/** Fraction in [0, 1] of the daily target reached (capped at 1). */
	readonly ratio: number;
	readonly remainingUnits: number;
	readonly met: boolean;
}

export interface OverallProgress {
	readonly kind: 'overall';
	readonly doneUnits: number;
	readonly targetUnits: number;
	/** Fraction in [0, 1] of the total target reached (capped at 1). */
	readonly ratio: number;
	readonly remainingUnits: number;
	readonly met: boolean;
	/** Whole days remaining until the end date, inclusive of today; null if open-ended. */
	readonly daysRemaining: number | null;
	/** Units/day needed from today to still hit the target by the end date; null if open-ended or already met. */
	readonly requiredUnitsPerDay: number | null;
}

export type Progress = DailyProgress | OverallProgress;

/** Progress of a daily-goal habit for a single day, given the units done that day. */
export function dailyProgress(habit: Habit, unitsDone: number): DailyProgress {
	if (habit.goal.kind !== 'daily') {
		throw new Error('dailyProgress requires a habit with a daily goal');
	}
	const targetUnits = habit.goal.targetUnits;
	return {
		kind: 'daily',
		doneUnits: unitsDone,
		targetUnits,
		ratio: ratioOf(unitsDone, targetUnits),
		remainingUnits: Math.max(0, targetUnits - unitsDone),
		met: unitsDone >= targetUnits
	};
}

/**
 * Cumulative progress of an overall-goal habit, given the total units done so
 * far and the current day (used to pace against the end date, if any).
 */
export function overallProgress(habit: Habit, unitsDone: number, today: Day): OverallProgress {
	if (habit.goal.kind !== 'overall') {
		throw new Error('overallProgress requires a habit with an overall goal');
	}
	const targetUnits = habit.goal.targetUnits;
	const remainingUnits = Math.max(0, targetUnits - unitsDone);
	const met = unitsDone >= targetUnits;

	let daysRemaining: number | null = null;
	let requiredUnitsPerDay: number | null = null;
	if (habit.endDate) {
		// Inclusive of today: an end date of today still leaves one day.
		daysRemaining = Math.max(0, today.daysUntil(habit.endDate) + 1);
		if (!met && daysRemaining > 0) {
			requiredUnitsPerDay = remainingUnits / daysRemaining;
		}
	}

	return {
		kind: 'overall',
		doneUnits: unitsDone,
		targetUnits,
		ratio: ratioOf(unitsDone, targetUnits),
		remainingUnits,
		met,
		daysRemaining,
		requiredUnitsPerDay
	};
}

function ratioOf(done: number, target: number): number {
	if (target <= 0) return 0;
	return Math.min(1, done / target);
}

/**
 * Progress for `habit` given its recorded `entries`, computed as of `today`.
 * Dispatches to `dailyProgress` (using today's entry, if any) or
 * `overallProgress` (summing all entries) based on the habit's goal kind, so
 * callers don't need to duplicate that branching.
 */
export function progressFor(habit: Habit, entries: readonly Entry[], today: Day): Progress {
	if (habit.kind === 'daily') {
		const todaysEntry = entries.find((entry) => entry.day.equals(today));
		return dailyProgress(habit, todaysEntry?.units ?? 0);
	}
	return overallProgress(habit, totalUnits(entries), today);
}
