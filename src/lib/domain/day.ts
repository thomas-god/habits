import { err, ok, type Result } from '../shared/result.ts';
import { InvalidValue } from './errors.ts';

/** Strict pure-date format guard (Temporal also accepts date-time strings). */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A calendar date (no time, no timezone), represented externally as an ISO
 * `YYYY-MM-DD` string.
 *
 * This is a thin, domain-focused wrapper around `Temporal.PlainDate`: it keeps
 * the exact vocabulary the domain needs (compare, `daysUntil`, `plusDays`)
 * while delegating all parsing, validation and calendar arithmetic to the
 * standard library instead of hand-rolled math.
 */
export class Day {
	private constructor(private readonly plain: Temporal.PlainDate) {}

	get year(): number {
		return this.plain.year;
	}

	get month(): number {
		return this.plain.month; // 1-12
	}

	get dayOfMonth(): number {
		return this.plain.day; // 1-31
	}

	/** Parse a strict ISO `YYYY-MM-DD` string, validating it is a real date. */
	static fromISO(value: string): Result<Day, InvalidValue> {
		if (!ISO_DATE.test(value)) {
			return err(new InvalidValue(`Day must be an ISO date (YYYY-MM-DD), got "${value}"`));
		}
		try {
			return ok(new Day(Temporal.PlainDate.from(value, { overflow: 'reject' })));
		} catch {
			return err(new InvalidValue(`"${value}" is not a valid calendar date`));
		}
	}

	/** The calendar day, in UTC, of the given instant (defaults to now). Infallible. */
	static today(now: Date = new Date()): Day {
		return new Day(now.toTemporalInstant().toZonedDateTimeISO('UTC').toPlainDate());
	}

	/** Wrap an existing `Temporal.PlainDate` (e.g. from a clock adapter). */
	static fromPlainDate(plain: Temporal.PlainDate): Day {
		return new Day(plain);
	}

	/** The underlying `Temporal.PlainDate`, for callers that want richer ops. */
	toPlainDate(): Temporal.PlainDate {
		return this.plain;
	}

	/** ISO `YYYY-MM-DD` representation. */
	toISO(): string {
		return this.plain.toString();
	}

	toString(): string {
		return this.plain.toString();
	}

	equals(other: Day): boolean {
		return this.plain.equals(other.plain);
	}

	isBefore(other: Day): boolean {
		return Temporal.PlainDate.compare(this.plain, other.plain) < 0;
	}

	isAfter(other: Day): boolean {
		return Temporal.PlainDate.compare(this.plain, other.plain) > 0;
	}

	isOnOrBefore(other: Day): boolean {
		return Temporal.PlainDate.compare(this.plain, other.plain) <= 0;
	}

	isOnOrAfter(other: Day): boolean {
		return Temporal.PlainDate.compare(this.plain, other.plain) >= 0;
	}

	/** Number of whole days from this day until `other` (negative if before). */
	daysUntil(other: Day): number {
		return this.plain.until(other.plain, { largestUnit: 'day' }).days;
	}

	/** A new Day `count` days after this one (count may be negative). */
	plusDays(count: number): Day {
		return new Day(this.plain.add({ days: count }));
	}
}
