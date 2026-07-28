import { describe, it, expect } from 'vitest';
import { Entry } from './entry.ts';
import { Day } from './day.ts';
import { HabitId, EntryKey } from './ids.ts';
import { InvalidValue } from './errors.ts';
import { expectOk, expectErr } from '../shared/testing.ts';

describe('Entry', () => {
	const day = expectOk(Day.fromISO('2024-07-28'));
	const habitId = HabitId.generate();

	it('creates an entry keyed by (habit, day)', () => {
		const entry = expectOk(Entry.create({ habitId, day, units: 2 }));
		expect(entry.habitId.equals(habitId)).toBe(true);
		expect(entry.key.equals(new EntryKey(habitId, day))).toBe(true);
		expect(entry.units).toBe(2);
	});

	it('returns Err for negative or fractional units', () => {
		expect(expectErr(Entry.create({ habitId, day, units: -1 }))).toBeInstanceOf(InvalidValue);
		expect(Entry.create({ habitId, day, units: 1.5 }).ok).toBe(false);
	});

	describe('withUnits', () => {
		const entry = expectOk(Entry.create({ habitId, day, units: 2 }));

		it('returns a copy with the new count, leaving the original untouched', () => {
			const updated = expectOk(entry.withUnits(5));
			expect(updated.units).toBe(5);
			expect(entry.units).toBe(2);
			expect(updated).not.toBe(entry);
		});

		it('allows setting the count to zero', () => {
			expect(expectOk(entry.withUnits(0)).units).toBe(0);
		});

		it('preserves the (habit, day) key', () => {
			expect(expectOk(entry.withUnits(9)).key.equals(entry.key)).toBe(true);
		});

		it('returns Err for negative or fractional units', () => {
			expect(expectErr(entry.withUnits(-1))).toBeInstanceOf(InvalidValue);
			expect(entry.withUnits(2.5).ok).toBe(false);
		});
	});

	describe('adjustBy', () => {
		const entry = expectOk(Entry.create({ habitId, day, units: 2 }));

		it('adds a positive delta', () => {
			expect(entry.adjustBy(3).units).toBe(5);
		});

		it('subtracts a negative delta', () => {
			expect(entry.adjustBy(-1).units).toBe(1);
		});

		it('clamps at zero instead of going negative', () => {
			expect(entry.adjustBy(-5).units).toBe(0);
		});

		it('is a no-op for a zero delta', () => {
			expect(entry.adjustBy(0).units).toBe(2);
		});

		it('leaves the original untouched and preserves the key', () => {
			const adjusted = entry.adjustBy(3);
			expect(entry.units).toBe(2);
			expect(adjusted).not.toBe(entry);
			expect(adjusted.key.equals(entry.key)).toBe(true);
		});
	});
});
