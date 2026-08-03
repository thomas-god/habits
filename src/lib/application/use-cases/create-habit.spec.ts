import { describe, it, expect } from 'vitest';
import { Day, InvalidHabit, InvalidValue } from '../../domain/index.ts';
import { expectErr, expectOk } from '../../shared/testing.ts';
import { FixedClock, InMemoryHabitOrderRepository, InMemoryHabitRepository } from '../testing.ts';
import { createHabit, type CreateHabitDeps, type CreateHabitInput } from './create-habit.ts';

function setup() {
	const habits = new InMemoryHabitRepository();
	const habitOrder = new InMemoryHabitOrderRepository();
	const clock = new FixedClock(expectOk(Day.fromISO('2024-06-10')));
	const deps: CreateHabitDeps = { habits, habitOrder, clock };
	return { deps, habits, clock };
}

const validInput: CreateHabitInput = {
	name: 'Piano',
	unitMinutes: 45,
	goalKind: 'daily',
	targetUnits: 4,
	startDate: '2024-06-01'
};

describe('createHabit', () => {
	it('persists a habit and returns its DTO', async () => {
		const { deps, habits } = setup();
		const dto = expectOk(await createHabit(deps, validInput));

		expect(dto.name).toBe('Piano');
		expect(dto.unitMinutes).toBe(45);
		expect(dto.kind).toBe('daily');
		expect(dto.targetUnits).toBe(4);
		expect(dto.startDate).toBe('2024-06-01');
		expect(dto.endDate).toBeNull();
		expect(dto.active).toBe(true);
		expect(dto.description).toBeNull();

		const stored = (await habits.listAll()).unwrap();
		expect(stored).toHaveLength(1);
		expect(stored[0].name).toBe('Piano');
	});

	it('computes active against the clock, not the input', async () => {
		const { deps } = setup(); // clock fixed at 2024-06-10
		const dto = expectOk(
			await createHabit(deps, { ...validInput, startDate: '2024-07-01' }) // starts in the future
		);
		expect(dto.active).toBe(false);
	});

	it('supports an overall goal with an end date', async () => {
		const { deps } = setup();
		const dto = expectOk(
			await createHabit(deps, {
				name: 'CAD',
				unitMinutes: 60,
				goalKind: 'overall',
				targetUnits: 100,
				startDate: '2024-06-01',
				endDate: '2024-08-31'
			})
		);
		expect(dto.kind).toBe('overall');
		expect(dto.endDate).toBe('2024-08-31');
	});

	it('accepts an optional description', async () => {
		const { deps } = setup();
		const dto = expectOk(
			await createHabit(deps, { ...validInput, description: '  Practice scales  ' })
		);
		expect(dto.description).toBe('Practice scales');
	});

	it('rejects a malformed start date', async () => {
		const { deps } = setup();
		const error = expectErr(await createHabit(deps, { ...validInput, startDate: 'not-a-date' }));
		expect(error).toBeInstanceOf(InvalidValue);
	});

	it('rejects a non-positive target', async () => {
		const { deps } = setup();
		const error = expectErr(await createHabit(deps, { ...validInput, targetUnits: 0 }));
		expect(error).toBeInstanceOf(InvalidValue);
	});

	it('rejects an end date before the start date', async () => {
		const { deps } = setup();
		const error = expectErr(await createHabit(deps, { ...validInput, endDate: '2024-05-01' }));
		expect(error).toBeInstanceOf(InvalidHabit);
	});

	it('rejects an empty name', async () => {
		const { deps } = setup();
		const error = expectErr(await createHabit(deps, { ...validInput, name: '   ' }));
		expect(error).toBeInstanceOf(InvalidHabit);
	});
});
