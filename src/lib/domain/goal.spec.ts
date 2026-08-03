import { describe, it, expect } from 'vitest';
import { DailyGoal, OverallGoal, ProgressGoal } from './goal.ts';
import { InvalidValue } from './errors.ts';
import { expectOk, expectErr } from '../shared/testing.ts';

describe('Goal', () => {
	it('exposes a discriminant and target', () => {
		expect(expectOk(DailyGoal.of(3)).kind).toBe('daily');
		expect(expectOk(OverallGoal.of(100)).kind).toBe('overall');
	});

	it('returns Err for non-positive targets', () => {
		expect(expectErr(DailyGoal.of(0))).toBeInstanceOf(InvalidValue);
		expect(OverallGoal.of(-1).ok).toBe(false);
	});
});

describe('ProgressGoal', () => {
	it('exposes a discriminant and no target', () => {
		const goal = ProgressGoal.of();
		expect(goal.kind).toBe('progress');
		expect('targetUnits' in goal).toBe(false);
	});
});
