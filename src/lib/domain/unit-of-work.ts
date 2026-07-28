import { err, ok, type Result } from '../shared/result.ts';
import { InvalidValue } from './errors.ts';

/**
 * The granularity of a single recordable chunk of effort for a habit,
 * expressed as a positive whole number of minutes (e.g. 45', 1h = 60').
 *
 * Progress everywhere else is counted in *units*; this value object is the
 * bridge between a unit count and real time.
 */
export class UnitOfWork {
	readonly minutes: number;

	private constructor(minutes: number) {
		this.minutes = minutes;
	}

	static ofMinutes(minutes: number): Result<UnitOfWork, InvalidValue> {
		if (!Number.isInteger(minutes) || minutes <= 0) {
			return err(
				new InvalidValue(`Unit of work must be a positive whole number of minutes, got ${minutes}`)
			);
		}
		return ok(new UnitOfWork(minutes));
	}

	/** Total minutes represented by `units` of this unit of work. */
	minutesFor(units: number): number {
		return units * this.minutes;
	}

	equals(other: UnitOfWork): boolean {
		return this.minutes === other.minutes;
	}
}
