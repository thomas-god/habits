/**
 * A Rust-style `Result<T, E>` container: the value of a computation that may
 * succeed with a `T` or fail with an `E`.
 *
 * Fallible operations return a `Result` instead of throwing, so failure is
 * part of the type and callers are forced to handle it explicitly (via
 * `match`, `unwrapOr`, narrowing on `.ok`, etc.). This keeps recoverable
 * domain errors distinct from unexpected/programmer errors (which may still
 * throw).
 *
 * `Result` is a discriminated union on the `ok` field, so you can narrow with
 * a plain `if (result.ok) { result.value } else { result.error }`, or use the
 * combinator methods for chaining.
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

class ResultBase {}

export class Ok<T, E> extends ResultBase {
	readonly ok = true;
	constructor(readonly value: T) {
		super();
	}

	isOk(): this is Ok<T, E> {
		return true;
	}

	isErr(): this is Err<T, E> {
		return false;
	}

	/** Transform the success value, leaving an error untouched. */
	map<U>(fn: (value: T) => U): Result<U, E> {
		return new Ok(fn(this.value));
	}

	/** Transform the error value (no-op on success). */
	mapErr<F>(_fn: (error: E) => F): Result<T, F> {
		return new Ok(this.value);
	}

	/** Chain another fallible operation (a.k.a. flatMap / bind). */
	andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
		return fn(this.value);
	}

	/** Run a side effect on the success value; returns `this` for chaining. */
	inspect(fn: (value: T) => void): Result<T, E> {
		fn(this.value);
		return this;
	}

	unwrap(): T {
		return this.value;
	}

	unwrapErr(): E {
		throw new Error('Called unwrapErr on an Ok value');
	}

	unwrapOr(_fallback: T): T {
		return this.value;
	}

	unwrapOrElse(_fn: (error: E) => T): T {
		return this.value;
	}

	match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
		return handlers.ok(this.value);
	}
}

export class Err<T, E> extends ResultBase {
	readonly ok = false;
	constructor(readonly error: E) {
		super();
	}

	isOk(): this is Ok<T, E> {
		return false;
	}

	isErr(): this is Err<T, E> {
		return true;
	}

	map<U>(_fn: (value: T) => U): Result<U, E> {
		return new Err(this.error);
	}

	mapErr<F>(fn: (error: E) => F): Result<T, F> {
		return new Err(fn(this.error));
	}

	andThen<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
		return new Err(this.error);
	}

	inspect(_fn: (value: T) => void): Result<T, E> {
		return this;
	}

	unwrap(): T {
		throw this.error instanceof Error
			? this.error
			: new Error(`Called unwrap on an Err value: ${String(this.error)}`);
	}

	unwrapErr(): E {
		return this.error;
	}

	unwrapOr(fallback: T): T {
		return fallback;
	}

	unwrapOrElse(fn: (error: E) => T): T {
		return fn(this.error);
	}

	match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
		return handlers.err(this.error);
	}
}

/** Construct a success. */
export function ok<T, E = never>(value: T): Result<T, E> {
	return new Ok(value);
}

/** Construct a failure. */
export function err<E, T = never>(error: E): Result<T, E> {
	return new Err(error);
}

/**
 * Collect an array of Results into a Result of an array. Returns the first
 * error encountered, or all values if every Result is `Ok`.
 */
export function all<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
	const values: T[] = [];
	for (const result of results) {
		if (!result.ok) return new Err(result.error);
		values.push(result.value);
	}
	return new Ok(values);
}
