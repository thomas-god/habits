import { describe, it, expect } from 'vitest';
import { ok, err, all, type Result } from './result.ts';

describe('Result', () => {
	it('narrows on the ok discriminant', () => {
		const good: Result<number, string> = ok(1);
		const bad: Result<number, string> = err('nope');
		expect(good.ok).toBe(true);
		expect(bad.ok).toBe(false);
		if (good.ok) expect(good.value).toBe(1);
		if (!bad.ok) expect(bad.error).toBe('nope');
	});

	it('maps success and leaves error untouched', () => {
		expect(
			ok<number, string>(2)
				.map((n) => n * 3)
				.unwrap()
		).toBe(6);
		expect(
			err<string, number>('e')
				.map((n) => n * 3)
				.unwrapErr()
		).toBe('e');
	});

	it('mapErr transforms only the error', () => {
		expect(
			err<string, number>('e')
				.mapErr((s) => s.toUpperCase())
				.unwrapErr()
		).toBe('E');
		expect(
			ok<number, string>(1)
				.mapErr((s) => s + '!')
				.unwrap()
		).toBe(1);
	});

	it('andThen chains fallible operations and short-circuits on error', () => {
		const parse = (s: string): Result<number, string> =>
			Number.isNaN(Number(s)) ? err('nan') : ok(Number(s));
		expect(ok<string, string>('4').andThen(parse).unwrap()).toBe(4);
		expect(ok<string, string>('x').andThen(parse).unwrapErr()).toBe('nan');
		expect(err<string, string>('early').andThen(parse).unwrapErr()).toBe('early');
	});

	it('unwrapOr / unwrapOrElse provide fallbacks', () => {
		expect(err<string, number>('e').unwrapOr(9)).toBe(9);
		expect(err<string, number>('e').unwrapOrElse((s) => s.length)).toBe(1);
		expect(ok<number, string>(5).unwrapOr(9)).toBe(5);
	});

	it('match handles both branches', () => {
		const describe = (r: Result<number, string>) =>
			r.match({ ok: (n) => `ok:${n}`, err: (e) => `err:${e}` });
		expect(describe(ok(1))).toBe('ok:1');
		expect(describe(err('boom'))).toBe('err:boom');
	});

	it('unwrap on Err rethrows the underlying Error', () => {
		expect(() => err<Error, number>(new Error('kaboom')).unwrap()).toThrow('kaboom');
	});

	it('all collects values or returns the first error', () => {
		expect(all([ok(1), ok(2), ok(3)]).unwrap()).toEqual([1, 2, 3]);
		expect(all([ok(1), err('bad'), ok(3)]).unwrapErr()).toBe('bad');
	});
});
