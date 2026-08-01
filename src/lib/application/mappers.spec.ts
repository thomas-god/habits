import { describe, it, expect } from 'vitest';
import { Day, DailyGoal, Entry, Habit, HabitId, OverallGoal, UnitOfWork } from '../domain/index.ts';
import { none, some } from '../shared/option.ts';
import { expectOk } from '../shared/testing.ts';
import { toEntryDTO, toHabitDTO } from './mappers.ts';

const unit = expectOk(UnitOfWork.ofMinutes(45));
const start = expectOk(Day.fromISO('2024-06-01'));
const createdAt = new Date('2024-06-01T08:00:00.000Z');

function makeHabit(overrides: Partial<Parameters<typeof Habit.from>[0]> = {}) {
	return expectOk(
		Habit.from({
			id: HabitId.generate(),
			name: 'Piano',
			unitOfWork: some(unit),
			goal: expectOk(DailyGoal.of(3)),
			startDate: start,
			createdAt,
			...overrides
		})
	);
}

describe('toHabitDTO', () => {
	it('maps all scalar fields correctly', () => {
		const habit = makeHabit();
		const today = expectOk(Day.fromISO('2024-06-10'));
		const dto = toHabitDTO(habit, today);

		expect(dto.id).toBe(habit.id.value);
		expect(dto.name).toBe('Piano');
		expect(dto.unitMinutes).toBe(45);
		expect(dto.kind).toBe('daily');
		expect(dto.targetUnits).toBe(3);
		expect(dto.startDate).toBe('2024-06-01');
		expect(dto.endDate).toBeNull();
		expect(dto.createdAt).toBe('2024-06-01T08:00:00.000Z');
	});

	it('serialises a present end date as an ISO string', () => {
		const habit = makeHabit({ endDate: some(expectOk(Day.fromISO('2024-08-31'))) });
		const dto = toHabitDTO(habit, expectOk(Day.fromISO('2024-06-10')));
		expect(dto.endDate).toBe('2024-08-31');
	});

	it('resolves active = true when today is within [startDate, endDate]', () => {
		const habit = makeHabit({ endDate: some(expectOk(Day.fromISO('2024-06-30'))) });
		expect(toHabitDTO(habit, expectOk(Day.fromISO('2024-06-15'))).active).toBe(true);
		expect(toHabitDTO(habit, start).active).toBe(true); // start date inclusive
		expect(toHabitDTO(habit, expectOk(Day.fromISO('2024-06-30'))).active).toBe(true); // end date inclusive
	});

	it('resolves active = false outside the schedule', () => {
		const habit = makeHabit({ endDate: some(expectOk(Day.fromISO('2024-06-30'))) });
		expect(toHabitDTO(habit, expectOk(Day.fromISO('2024-05-31'))).active).toBe(false); // before start
		expect(toHabitDTO(habit, expectOk(Day.fromISO('2024-07-01'))).active).toBe(false); // after end
	});

	it('resolves active = true for an open-ended habit regardless of how far in the future', () => {
		const habit = makeHabit();
		expect(toHabitDTO(habit, expectOk(Day.fromISO('2099-12-31'))).active).toBe(true);
	});

	it('maps an overall goal correctly', () => {
		const habit = makeHabit({ goal: expectOk(OverallGoal.of(100)) });
		const dto = toHabitDTO(habit, start);
		expect(dto.kind).toBe('overall');
		expect(dto.targetUnits).toBe(100);
	});

	it('maps a habit with no unit of work to a null unitMinutes', () => {
		const habit = makeHabit({ unitOfWork: none() });
		const dto = toHabitDTO(habit, start);
		expect(dto.unitMinutes).toBeNull();
	});
});

describe('toEntryDTO', () => {
	it('maps day and units', () => {
		const habitId = HabitId.generate();
		const day = expectOk(Day.fromISO('2024-06-10'));
		const entry = expectOk(Entry.create({ habitId, day, units: 3 }));
		const dto = toEntryDTO(entry);
		expect(dto.day).toBe('2024-06-10');
		expect(dto.units).toBe(3);
	});

	it('maps a zero-unit entry', () => {
		const entry = expectOk(
			Entry.create({
				habitId: HabitId.generate(),
				day: expectOk(Day.fromISO('2024-06-10')),
				units: 0
			})
		);
		expect(toEntryDTO(entry).units).toBe(0);
	});
});
