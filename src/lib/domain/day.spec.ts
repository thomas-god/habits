import { describe, it, expect } from 'vitest';
import { Day } from './day.ts';
import { InvalidValue } from './errors.ts';
import { expectOk } from '../shared/testing.ts';

describe('Day', () => {
	it('parses and round-trips a valid ISO date', () => {
		const day = expectOk(Day.fromISO('2024-07-28'));
		expect(day.year).toBe(2024);
		expect(day.month).toBe(7);
		expect(day.dayOfMonth).toBe(28);
		expect(day.toISO()).toBe('2024-07-28');
	});

	it('returns Err for malformed strings', () => {
		const result = Day.fromISO('2024-7-28');
		expect(result.ok).toBe(false);
		expect(result.unwrapErr()).toBeInstanceOf(InvalidValue);
		expect(Day.fromISO('not-a-date').ok).toBe(false);
	});

	it('returns Err for impossible calendar dates', () => {
		expect(Day.fromISO('2024-02-30').ok).toBe(false);
		expect(Day.fromISO('2023-02-29').ok).toBe(false);
	});

	it('accepts a valid leap day', () => {
		expect(expectOk(Day.fromISO('2024-02-29')).toISO()).toBe('2024-02-29');
	});

	it('compares dates', () => {
		const a = expectOk(Day.fromISO('2024-01-01'));
		const b = expectOk(Day.fromISO('2024-01-02'));
		expect(a.isBefore(b)).toBe(true);
		expect(b.isAfter(a)).toBe(true);
		expect(a.isOnOrBefore(a)).toBe(true);
		expect(a.isOnOrAfter(a)).toBe(true);
		expect(a.equals(expectOk(Day.fromISO('2024-01-01')))).toBe(true);
	});

	it('computes day differences across month boundaries', () => {
		const a = expectOk(Day.fromISO('2024-01-30'));
		const b = expectOk(Day.fromISO('2024-02-02'));
		expect(a.daysUntil(b)).toBe(3);
		expect(b.daysUntil(a)).toBe(-3);
	});

	it('adds days across a leap year boundary', () => {
		const feb28 = expectOk(Day.fromISO('2024-02-28'));
		expect(feb28.plusDays(1).toISO()).toBe('2024-02-29');
		expect(feb28.plusDays(2).toISO()).toBe('2024-03-01');
	});

	it('derives today in UTC', () => {
		const day = Day.today(new Date(Date.UTC(2024, 6, 28, 23, 59)));
		expect(day.toISO()).toBe('2024-07-28');
	});
});
