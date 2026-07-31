/**
 * A Rust-style `Option<T>` container: a value that may or may not be present.
 *
 * Prefer `Option` over `null`/`undefined` when the absence of a value is a
 * normal, expected outcome (a lookup that may miss, an optional field) so
 * callers are forced to handle it explicitly (via `match`, `unwrapOr`,
 * narrowing on `.some`, etc.) instead of accidentally dereferencing a nullish
 * value.
 *
 * `Option` is a discriminated union on the `some` field, so you can narrow
 * with a plain `if (option.some) { option.value }`, or use the combinator
 * methods for chaining.
 */
export type Option<T> = Some<T> | None<T>;

class OptionBase {}

export class Some<T> extends OptionBase {
	readonly some = true;
	constructor(readonly value: T) {
		super();
	}

	isSome(): this is Some<T> {
		return true;
	}

	isNone(): this is None<T> {
		return false;
	}

	/** True if the value is present and satisfies the predicate. */
	isSomeAnd(predicate: (value: T) => boolean): boolean {
		return predicate(this.value);
	}

	/** Transform the value, leaving a None untouched. */
	map<U>(fn: (value: T) => U): Option<U> {
		return new Some(fn(this.value));
	}

	/** Chain another optional operation (a.k.a. flatMap / bind). */
	andThen<U>(fn: (value: T) => Option<U>): Option<U> {
		return fn(this.value);
	}

	/** Run a side effect on the value; returns `this` for chaining. */
	inspect(fn: (value: T) => void): Option<T> {
		fn(this.value);
		return this;
	}

	unwrap(): T {
		return this.value;
	}

	unwrapOr(_fallback: T): T {
		return this.value;
	}

	unwrapOrElse(_fn: () => T): T {
		return this.value;
	}

	match<U>(handlers: { some: (value: T) => U; none: () => U }): U {
		return handlers.some(this.value);
	}
}

export class None<T> extends OptionBase {
	readonly some = false;

	isSome(): this is Some<T> {
		return false;
	}

	isNone(): this is None<T> {
		return true;
	}

	isSomeAnd(_predicate: (value: T) => boolean): boolean {
		return false;
	}

	map<U>(_fn: (value: T) => U): Option<U> {
		return new None();
	}

	andThen<U>(_fn: (value: T) => Option<U>): Option<U> {
		return new None();
	}

	inspect(_fn: (value: T) => void): Option<T> {
		return this;
	}

	unwrap(): T {
		throw new Error('Called unwrap on a None value');
	}

	unwrapOr(fallback: T): T {
		return fallback;
	}

	unwrapOrElse(fn: () => T): T {
		return fn();
	}

	match<U>(handlers: { some: (value: T) => U; none: () => U }): U {
		return handlers.none();
	}
}

/** Construct a present value. */
export function some<T>(value: T): Option<T> {
	return new Some(value);
}

/** Construct an absent value. */
export function none<T = never>(): Option<T> {
	return new None();
}

/** Convert a nullable value into an `Option`. */
export function asOption<T>(value: T | null | undefined): Option<T> {
	if (value === null || value === undefined) {
		return none();
	}
	return some(value);
}
