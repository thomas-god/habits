import { Day } from '../domain/index.ts';
import type { Clock } from '../application/ports/clock.ts';

/** Production `Clock` that reads the real wall clock. */
export class SystemClock implements Clock {
	today(): Day {
		return Day.today();
	}

	now(): Date {
		return new Date();
	}
}
