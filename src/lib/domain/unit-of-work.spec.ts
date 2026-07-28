import { describe, it, expect } from 'vitest';
import { UnitOfWork } from './unit-of-work.ts';
import { InvalidValue } from './errors.ts';
import { expectOk, expectErr } from '../shared/testing.ts';

describe('UnitOfWork', () => {
	it('converts unit counts to minutes', () => {
		expect(expectOk(UnitOfWork.ofMinutes(45)).minutesFor(3)).toBe(135);
	});

	it('returns Err for non-positive or fractional minutes', () => {
		expect(expectErr(UnitOfWork.ofMinutes(0))).toBeInstanceOf(InvalidValue);
		expect(UnitOfWork.ofMinutes(-5).ok).toBe(false);
		expect(UnitOfWork.ofMinutes(1.5).ok).toBe(false);
	});
});
