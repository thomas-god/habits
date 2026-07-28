import type { Day } from '../../domain/index.ts';

/**
 * Access to "now", as a driven port.
 *
 * Use cases never call `Day.today()`/`new Date()` directly: they ask the
 * injected `Clock` instead, so tests can supply a fixed instant and the
 * infrastructure adapter (`system-clock.ts`) is the only place that reads the
 * real wall clock.
 */
export interface Clock {
	/** The current calendar day, used for scheduling/progress calculations. */
	today(): Day;

	/** The current instant, used for timestamps such as `Habit.createdAt`. */
	now(): Date;
}
