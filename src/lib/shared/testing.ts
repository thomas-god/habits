import type { Result } from './result.ts';

/** Unwrap an `Ok` in tests, or throw with the error for a clear failure. */
export function expectOk<T, E>(result: Result<T, E>): T {
	if (!result.ok) throw new Error(`Expected Ok, got Err: ${String(result.error)}`);
	return result.value;
}

/** Unwrap an `Err` in tests, or throw if it was unexpectedly `Ok`. */
export function expectErr<T, E>(result: Result<T, E>): E {
	if (result.ok) throw new Error(`Expected Err, got Ok: ${String(result.value)}`);
	return result.error;
}
