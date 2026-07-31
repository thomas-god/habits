import { describe, it, expect } from 'vitest';
import { formatTotalUnits, formatUnitLabel, formatPercent, formatDate } from './format.ts';

describe('formatTotalUnits', () => {
	it('formats whole hours', () => {
		expect(formatTotalUnits(3, 60)).toBe('3h');
	});

	it('formats hours and minutes', () => {
		expect(formatTotalUnits(3, 45)).toBe('2h15m');
	});

	it('formats minutes only', () => {
		expect(formatTotalUnits(1, 30)).toBe('30m');
	});

	it('formats a plain unit count when there is no unit of work', () => {
		expect(formatTotalUnits(3, null)).toBe('3');
	});

	it('formats zero units as 0m', () => {
		expect(formatTotalUnits(0, 60)).toBe('0m');
	});
});

describe('formatUnitLabel', () => {
	it('returns None when there is no unit of work', () => {
		expect(formatUnitLabel(null).isNone()).toBe(true);
	});

	it('returns Some with the formatted single-unit label', () => {
		const label = formatUnitLabel(60);
		expect(label.isSome()).toBe(true);
		expect(label.unwrap()).toBe('1h');
	});

	it('formats a unit that mixes hours and minutes', () => {
		expect(formatUnitLabel(90).unwrap()).toBe('1h30m');
	});

	it('formats a unit under an hour', () => {
		expect(formatUnitLabel(45).unwrap()).toBe('45m');
	});
});

describe('formatPercent', () => {
	it('rounds to the nearest percent', () => {
		expect(formatPercent(0.333)).toBe('33%');
	});

	it('formats a full ratio', () => {
		expect(formatPercent(1)).toBe('100%');
	});

	it('formats zero', () => {
		expect(formatPercent(0)).toBe('0%');
	});

	it('rounds up when the fractional part is at least half', () => {
		expect(formatPercent(0.555)).toBe('56%');
	});
});

describe('formatDate', () => {
	it('formats an ISO date string', () => {
		expect(formatDate('2024-06-01')).toBe('Jun 1, 2024');
	});

	it('formats a date at the start of the year', () => {
		expect(formatDate('2024-01-01')).toBe('Jan 1, 2024');
	});

	it('formats a date at the end of the year', () => {
		expect(formatDate('2024-12-31')).toBe('Dec 31, 2024');
	});
});
