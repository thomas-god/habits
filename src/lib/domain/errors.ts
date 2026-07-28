/**
 * Base class for all domain-level errors.
 *
 * Domain errors represent violations of business rules / invariants and are
 * independent of any transport or persistence concern. Outer layers can catch
 * `DomainError` to translate these into HTTP responses, form errors, etc.
 */
export class DomainError extends Error {
	constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}

/** A value object or entity was constructed with invalid data. */
export class InvalidValue extends DomainError {}

/** A habit was configured with an inconsistent goal / schedule. */
export class InvalidHabit extends DomainError {}
