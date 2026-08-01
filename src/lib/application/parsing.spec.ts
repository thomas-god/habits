import { describe, it, expect } from 'vitest';
import { DailyGoal, InvalidValue, OverallGoal } from '../domain/index.ts';
import { expectErr, expectOk } from '../shared/testing.ts';
import {
	parseGoal,
	parseHabitFields,
	parseOptionalDay,
	parseOptionalUnitOfWork
} from './parsing.ts';

describe('parseGoal', () => {
	it('returns a DailyGoal for kind "daily"', () => {
		const goal = expectOk(parseGoal('daily', 3));
		expect(goal).toBeInstanceOf(DailyGoal);
		expect((goal as DailyGoal).targetUnits).toBe(3);
	});

	it('returns an OverallGoal for kind "overall"', () => {
		const goal = expectOk(parseGoal('overall', 100));
		expect(goal).toBeInstanceOf(OverallGoal);
		expect((goal as OverallGoal).targetUnits).toBe(100);
	});

	it('returns Err for a non-positive target', () => {
		expect(expectErr(parseGoal('daily', 0))).toBeInstanceOf(InvalidValue);
		expect(parseGoal('overall', -1).ok).toBe(false);
	});
});

describe('parseOptionalDay', () => {
	it('returns none() for null input', () => {
		expect(expectOk(parseOptionalDay(null)).isNone()).toBe(true);
	});

	it('returns none() for undefined input', () => {
		expect(expectOk(parseOptionalDay(undefined)).isNone()).toBe(true);
	});

	it('parses a valid ISO date string', () => {
		expect(expectOk(parseOptionalDay('2024-06-10')).unwrap().toISO()).toBe('2024-06-10');
	});

	it('returns Err for a malformed date string', () => {
		expect(expectErr(parseOptionalDay('not-a-date'))).toBeInstanceOf(InvalidValue);
	});

	it('returns Err for an impossible date', () => {
		expect(parseOptionalDay('2024-02-30').ok).toBe(false);
	});
});

describe('parseOptionalUnitOfWork', () => {
	it('returns none() for null input', () => {
		expect(expectOk(parseOptionalUnitOfWork(null)).isNone()).toBe(true);
	});

	it('returns none() for undefined input', () => {
		expect(expectOk(parseOptionalUnitOfWork(undefined)).isNone()).toBe(true);
	});

	it('parses a valid minute count', () => {
		const result = expectOk(parseOptionalUnitOfWork(45));
		expect(result.isSome()).toBe(true);
		expect(result.unwrap().minutes).toBe(45);
	});

	it('returns Err for a non-positive minute count', () => {
		expect(expectErr(parseOptionalUnitOfWork(0))).toBeInstanceOf(InvalidValue);
	});
});

describe('parseHabitFields', () => {
	const validInput = {
		unitMinutes: 45,
		goalKind: 'daily' as const,
		targetUnits: 3,
		startDate: '2024-06-01'
	};

	it('parses a fully valid input with no end date', () => {
		const fields = expectOk(parseHabitFields(validInput));
		expect(fields.unitOfWork.unwrap().minutes).toBe(45);
		expect(fields.goal).toBeInstanceOf(DailyGoal);
		expect(fields.startDate.toISO()).toBe('2024-06-01');
		expect(fields.endDate.isNone()).toBe(true);
	});

	it('treats an omitted unitMinutes as no unit of work', () => {
		const { unitMinutes: _unitMinutes, ...rest } = validInput;
		const fields = expectOk(parseHabitFields(rest));
		expect(fields.unitOfWork.isNone()).toBe(true);
	});

	it('parses a valid end date', () => {
		const fields = expectOk(parseHabitFields({ ...validInput, endDate: '2024-08-31' }));
		expect(fields.endDate.unwrap().toISO()).toBe('2024-08-31');
	});

	it('treats an explicit null end date as absent', () => {
		expect(expectOk(parseHabitFields({ ...validInput, endDate: null })).endDate.isNone()).toBe(
			true
		);
	});

	it('returns Err for an invalid start date', () => {
		expect(expectErr(parseHabitFields({ ...validInput, startDate: 'bad' }))).toBeInstanceOf(
			InvalidValue
		);
	});

	it('returns Err for an invalid end date', () => {
		expect(expectErr(parseHabitFields({ ...validInput, endDate: '2024-13-01' }))).toBeInstanceOf(
			InvalidValue
		);
	});

	it('returns Err for invalid unit minutes', () => {
		expect(expectErr(parseHabitFields({ ...validInput, unitMinutes: 0 }))).toBeInstanceOf(
			InvalidValue
		);
	});

	it('returns Err for a non-positive target', () => {
		expect(expectErr(parseHabitFields({ ...validInput, targetUnits: -1 }))).toBeInstanceOf(
			InvalidValue
		);
	});

	it('short-circuits on the first error (start date checked before unit minutes)', () => {
		// Both startDate and unitMinutes are invalid; we get a start-date error.
		const error = expectErr(parseHabitFields({ ...validInput, startDate: 'bad', unitMinutes: 0 }));
		expect(error.message).toMatch(/YYYY-MM-DD/);
	});
});
