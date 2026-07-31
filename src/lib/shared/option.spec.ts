import { describe, it, expect } from 'vitest';
import { some, none, asOption, type Option } from './option.ts';

describe('Option', () => {
	it('narrows on the some discriminant', () => {
		const present: Option<number> = some(1);
		const absent: Option<number> = none();
		expect(present.some).toBe(true);
		expect(absent.some).toBe(false);
		if (present.some) expect(present.value).toBe(1);
	});

	it('isSome / isNone narrow the type', () => {
		const present: Option<number> = some(1);
		const absent: Option<number> = none();
		expect(present.isSome()).toBe(true);
		expect(present.isNone()).toBe(false);
		expect(absent.isSome()).toBe(false);
		expect(absent.isNone()).toBe(true);
	});

	it('isSomeAnd checks the predicate only when present', () => {
		expect(some(4).isSomeAnd((n) => n > 2)).toBe(true);
		expect(some(1).isSomeAnd((n) => n > 2)).toBe(false);
		expect(none<number>().isSomeAnd((n) => n > 2)).toBe(false);
	});

	it('maps the value and leaves None untouched', () => {
		expect(
			some(2)
				.map((n) => n * 3)
				.unwrap()
		).toBe(6);
		expect(
			none<number>()
				.map((n) => n * 3)
				.isNone()
		).toBe(true);
	});

	it('andThen chains optional operations and short-circuits on None', () => {
		const parse = (s: string): Option<number> => (Number.isNaN(Number(s)) ? none() : some(Number(s)));
		expect(some('4').andThen(parse).unwrap()).toBe(4);
		expect(some('x').andThen(parse).isNone()).toBe(true);
		expect(none<string>().andThen(parse).isNone()).toBe(true);
	});

	it('inspect runs a side effect on Some and is a no-op on None', () => {
		let seen: number | undefined;
		some(5).inspect((n) => (seen = n));
		expect(seen).toBe(5);

		seen = undefined;
		none<number>().inspect((n) => (seen = n));
		expect(seen).toBeUndefined();
	});

	it('unwrapOr / unwrapOrElse provide fallbacks', () => {
		expect(none<number>().unwrapOr(9)).toBe(9);
		expect(none<number>().unwrapOrElse(() => 7)).toBe(7);
		expect(some(5).unwrapOr(9)).toBe(5);
		expect(some(5).unwrapOrElse(() => 7)).toBe(5);
	});

	it('match handles both branches', () => {
		const describe = (o: Option<number>) => o.match({ some: (n) => `some:${n}`, none: () => 'none' });
		expect(describe(some(1))).toBe('some:1');
		expect(describe(none())).toBe('none');
	});

	it('unwrap throws on None', () => {
		expect(() => none().unwrap()).toThrow('Called unwrap on a None value');
	});

	it('asOption converts nullish values to None and others to Some', () => {
		expect(asOption(null).isNone()).toBe(true);
		expect(asOption(undefined).isNone()).toBe(true);
		expect(asOption(0).unwrap()).toBe(0);
		expect(asOption('x').unwrap()).toBe('x');
	});
});
