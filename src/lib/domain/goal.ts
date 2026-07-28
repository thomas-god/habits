import { err, ok, type Result } from '../shared/result.ts';
import { InvalidValue } from './errors.ts';

/**
 * What a habit is aiming for, expressed as a target number of *units* of work.
 * This is purely the target; scheduling (start/end dates) lives on the Habit.
 *
 * Modelled as a discriminated union so that daily vs. overall targets are
 * distinguishable at the type level and exhaustively handled.
 */
export type GoalKind = 'daily' | 'overall';

export type Goal = DailyGoal | OverallGoal;

/** A target amount of work to reach *every day* (e.g. 3h of piano per day). */
export class DailyGoal {
	readonly kind = 'daily' as const;
	readonly targetUnits: number;

	private constructor(targetUnits: number) {
		this.targetUnits = targetUnits;
	}

	static of(targetUnits: number): Result<DailyGoal, InvalidValue> {
		return validateTarget(targetUnits).map(() => new DailyGoal(targetUnits));
	}
}

/** A cumulative target across the whole life of the habit (e.g. 100h total). */
export class OverallGoal {
	readonly kind = 'overall' as const;
	readonly targetUnits: number;

	private constructor(targetUnits: number) {
		this.targetUnits = targetUnits;
	}

	static of(targetUnits: number): Result<OverallGoal, InvalidValue> {
		return validateTarget(targetUnits).map(() => new OverallGoal(targetUnits));
	}
}

function validateTarget(targetUnits: number): Result<number, InvalidValue> {
	if (!Number.isInteger(targetUnits) || targetUnits <= 0) {
		return err(
			new InvalidValue(`Goal target must be a positive whole number of units, got ${targetUnits}`)
		);
	}
	return ok(targetUnits);
}
