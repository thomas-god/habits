import { describe, it, expect } from 'vitest';
import { Day, HabitId, InvalidHabit, InvalidValue } from '../../domain/index.ts';
import { expectErr, expectOk } from '../../shared/testing.ts';
import { createHabit } from './create-habit.ts';
import { editHabit } from './edit-habit.ts';
import { HabitNotFound } from '../ports/errors.ts';
import { FixedClock, InMemoryHabitRepository } from '../testing.ts';

async function setup() {
	const habits = new InMemoryHabitRepository();
	const clock = new FixedClock(expectOk(Day.fromISO('2024-06-10')));
	const deps = { habits, clock };

	const habit = expectOk(
		await createHabit(deps, {
			name: 'Piano',
			unitMinutes: 45,
			goalKind: 'daily',
			targetUnits: 4,
			startDate: '2024-06-01'
		})
	);
	return { deps, habitId: habit.id };
}

describe('editHabit', () => {
	it('changes only the supplied fields', async () => {
		const { deps, habitId } = await setup();
		const dto = expectOk(await editHabit(deps, { habitId, name: 'Guitar' }));
		expect(dto.name).toBe('Guitar');
		expect(dto.unitMinutes).toBe(45);
		expect(dto.targetUnits).toBe(4);
	});

	it('changes the target', async () => {
		const { deps, habitId } = await setup();
		const dto = expectOk(await editHabit(deps, { habitId, targetUnits: 100 }));
		expect(dto.kind).toBe('daily');
		expect(dto.targetUnits).toBe(100);
	});

	it('sets an end date', async () => {
		const { deps, habitId } = await setup();
		const dto = expectOk(await editHabit(deps, { habitId, endDate: '2024-06-30' }));
		expect(dto.endDate).toBe('2024-06-30');
	});

	it('clears an end date with an explicit null', async () => {
		const { deps, habitId } = await setup();
		await editHabit(deps, { habitId, endDate: '2024-06-30' });
		const dto = expectOk(await editHabit(deps, { habitId, endDate: null }));
		expect(dto.endDate).toBeNull();
	});

	it('sets a description', async () => {
		const { deps, habitId } = await setup();
		const dto = expectOk(await editHabit(deps, { habitId, description: 'Practice scales' }));
		expect(dto.description).toBe('Practice scales');
	});

	it('clears a description with an explicit null', async () => {
		const { deps, habitId } = await setup();
		await editHabit(deps, { habitId, description: 'Practice scales' });
		const dto = expectOk(await editHabit(deps, { habitId, description: null }));
		expect(dto.description).toBeNull();
	});

	it('leaves the description unchanged when omitted', async () => {
		const { deps, habitId } = await setup();
		await editHabit(deps, { habitId, description: 'Practice scales' });
		const dto = expectOk(await editHabit(deps, { habitId, name: 'Guitar' }));
		expect(dto.description).toBe('Practice scales');
	});

	it('persists the change', async () => {
		const { deps, habitId } = await setup();
		await editHabit(deps, { habitId, name: 'Guitar' });
		const stored = expectOk(await deps.habits.findById(expectOk(HabitId.fromString(habitId))));
		expect(stored?.name).toBe('Guitar');
	});

	it('returns HabitNotFound for an unknown id', async () => {
		const { deps } = await setup();
		const error = expectErr(
			await editHabit(deps, { habitId: HabitId.generate().value, name: 'x' })
		);
		expect(error).toBeInstanceOf(HabitNotFound);
	});

	it('rejects a malformed habit id', async () => {
		const { deps } = await setup();
		const error = expectErr(await editHabit(deps, { habitId: 'not-a-uuid', name: 'x' }));
		expect(error).toBeInstanceOf(InvalidValue);
	});

	it('rejects an empty name', async () => {
		const { deps, habitId } = await setup();
		const error = expectErr(await editHabit(deps, { habitId, name: '   ' }));
		expect(error).toBeInstanceOf(InvalidHabit);
	});

	it('rejects an end date before the start date', async () => {
		const { deps, habitId } = await setup();
		const error = expectErr(await editHabit(deps, { habitId, endDate: '2024-01-01' }));
		expect(error).toBeInstanceOf(InvalidHabit);
	});

	it('rejects a non-positive target', async () => {
		const { deps, habitId } = await setup();
		const error = expectErr(await editHabit(deps, { habitId, targetUnits: 0 }));
		expect(error).toBeInstanceOf(InvalidValue);
	});
});
