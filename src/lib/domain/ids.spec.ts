import { describe, it, expect } from 'vitest';
import { Day } from './day.ts';
import { HabitId, EntryKey } from './ids.ts';
import { InvalidValue } from './errors.ts';
import { expectOk, expectErr } from '../shared/testing.ts';

describe('HabitId', () => {
	it('generates distinct valid habit ids', () => {
		const a = HabitId.generate();
		const b = HabitId.generate();
		expect(a.equals(b)).toBe(false);
		expect(expectOk(HabitId.fromString(a.value)).equals(a)).toBe(true);
	});

	it('rejects malformed habit id strings', () => {
		expect(expectErr(HabitId.fromString('not-a-uuid'))).toBeInstanceOf(InvalidValue);
		expect(HabitId.fromString('').ok).toBe(false);
	});
});

describe('EntryKey', () => {
	const day = expectOk(Day.fromISO('2024-07-28'));
	const habitId = HabitId.generate();

	it('equals another key with the same habit and day', () => {
		const a = new EntryKey(habitId, day);
		const b = new EntryKey(habitId, expectOk(Day.fromISO('2024-07-28')));
		expect(a.equals(b)).toBe(true);
	});

	it('differs when habit or day differ', () => {
		const a = new EntryKey(habitId, day);
		expect(a.equals(new EntryKey(HabitId.generate(), day))).toBe(false);
		expect(a.equals(new EntryKey(habitId, expectOk(Day.fromISO('2024-07-29'))))).toBe(false);
	});

	it('has a stable string form usable as a map key', () => {
		expect(new EntryKey(habitId, day).toString()).toBe(`${habitId.value}:2024-07-28`);
	});
});
