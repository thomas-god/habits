import { err, ok, type Result } from '../shared/result.ts';
import { Day } from './day.ts';
import { InvalidValue } from './errors.ts';
import { EntryKey, HabitId } from './ids.ts';

/**
 * A record of how many *units* of work were done for a habit on a given day.
 *
 * There is at most one Entry per (habit, day); recording again adjusts the
 * unit count rather than creating a duplicate.
 *
 * Its identity is the natural composite `EntryKey` (habit + day), not a
 * surrogate id: recording again on the same day adjusts the unit count rather
 * than creating a second entry.
 */
export class Entry {
	readonly habitId: HabitId;
	readonly day: Day;
	readonly units: number;

	private constructor(habitId: HabitId, day: Day, units: number) {
		this.habitId = habitId;
		this.day = day;
		this.units = units;
	}

	/** The composite identity (habit + day) of this entry. */
	get key(): EntryKey {
		return new EntryKey(this.habitId, this.day);
	}

	/** A brand-new entry. */
	static create(params: {
		habitId: HabitId;
		day: Day;
		units: number;
	}): Result<Entry, InvalidValue> {
		return validateUnits(params.units).map(
			() => new Entry(params.habitId, params.day, params.units)
		);
	}

	/** Rehydrate an entry from persistence (equivalent to create; kept for intent). */
	static restore(params: {
		habitId: HabitId;
		day: Day;
		units: number;
	}): Result<Entry, InvalidValue> {
		return Entry.create(params);
	}

	/** A copy with the unit count changed to `units`. */
	withUnits(units: number): Result<Entry, InvalidValue> {
		return validateUnits(units).map(() => new Entry(this.habitId, this.day, units));
	}

	/** A copy with `delta` units added (clamped so it never goes below zero). Infallible. */
	adjustBy(delta: number): Entry {
		const next = Math.max(0, this.units + delta);
		return new Entry(this.habitId, this.day, next);
	}
}

function validateUnits(units: number): Result<number, InvalidValue> {
	if (!Number.isInteger(units) || units < 0) {
		return err(new InvalidValue(`Entry units must be a non-negative whole number, got ${units}`));
	}
	return ok(units);
}
