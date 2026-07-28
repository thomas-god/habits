import { describe, it, expect } from 'vitest';
import { Day, HabitId, InvalidValue } from '../../domain/index.ts';
import { expectErr, expectOk } from '../../shared/testing.ts';
import { createHabit } from './create-habit.ts';
import { archiveHabit } from './archive-habit.ts';
import { HabitNotFound } from '../ports/errors.ts';
import { FixedClock, InMemoryHabitRepository } from '../testing.ts';

async function setup(today = '2024-06-10') {
	const habits = new InMemoryHabitRepository();
	const clock = new FixedClock(expectOk(Day.fromISO(today)));
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

describe('archiveHabit', () => {
	it("sets the habit's end date to today", async () => {
		const { deps, habitId } = await setup('2024-06-10');
		const dto = expectOk(await archiveHabit(deps, { habitId }));
		expect(dto.endDate).toBe('2024-06-10');
		expect(dto.active).toBe(true); // archive day itself is still within range
	});

	it('makes the habit inactive from the following day', async () => {
		const { deps, habitId } = await setup('2024-06-10');
		await archiveHabit(deps, { habitId });
		const stored = expectOk(await deps.habits.findById(expectOk(HabitId.fromString(habitId))));
		expect(stored?.isActive(expectOk(Day.fromISO('2024-06-11')))).toBe(false);
	});

	it('persists the archived habit', async () => {
		const { deps, habitId } = await setup();
		await archiveHabit(deps, { habitId });
		const stored = expectOk(await deps.habits.findById(expectOk(HabitId.fromString(habitId))));
		expect(stored?.endDate?.toISO()).toBe('2024-06-10');
	});

	it('rejects archiving before the start date', async () => {
		const { deps, habitId } = await setup('2024-05-01'); // before the 2024-06-01 start date
		const error = expectErr(await archiveHabit(deps, { habitId }));
		expect(error).toBeDefined();
	});

	it('returns HabitNotFound for an unknown id', async () => {
		const { deps } = await setup();
		const error = expectErr(await archiveHabit(deps, { habitId: HabitId.generate().value }));
		expect(error).toBeInstanceOf(HabitNotFound);
	});

	it('rejects a malformed habit id', async () => {
		const { deps } = await setup();
		const error = expectErr(await archiveHabit(deps, { habitId: 'not-a-uuid' }));
		expect(error).toBeInstanceOf(InvalidValue);
	});
});
