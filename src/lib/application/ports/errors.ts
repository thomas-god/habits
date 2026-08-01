/**
 * Base class for application-layer errors: failures that arise from
 * orchestrating use cases (e.g. "no such habit") rather than from violating a
 * domain invariant. Kept distinct from `DomainError` so callers can tell "the
 * input was invalid" apart from "the input was well-formed but didn't refer
 * to anything".
 */
export class ApplicationError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = new.target.name;
	}
}

/** No habit exists with the given identity. */
export class HabitNotFound extends ApplicationError {
	constructor(readonly habitId: string) {
		super(`Habit not found: ${habitId}`);
	}
}

/**
 * A persisted record failed to rehydrate into a valid domain object (e.g. a
 * row violates an invariant `Habit.from`/`Entry.create` enforces). Surfaced
 * as a typed error rather than silently trusting corrupt data — see
 * `Habit.from`'s "parse, don't validate" contract.
 */
export class CorruptRecord extends ApplicationError {
	constructor(message: string, cause?: unknown) {
		super(message, { cause });
	}
}

/**
 * The day falls outside the habit's active range (`startDate`..`endDate`,
 * inclusive on both sides). Only known once the habit has been loaded, so
 * this is an application-layer error rather than one `Entry.create` can
 * enforce on its own.
 */
export class EntryDayOutOfRange extends ApplicationError {
	constructor(
		readonly habitId: string,
		readonly day: string
	) {
		super(`Day ${day} is outside habit ${habitId}'s active range`);
	}
}
