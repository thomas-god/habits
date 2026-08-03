import { describe, it, expect } from 'vitest';
import { Day, HabitId, InvalidValue } from '../../domain/index.ts';
import { expectErr, expectOk } from '../../shared/testing.ts';
import { createHabit } from './create-habit.ts';
import { recordEntry } from './record-entry.ts';
import { deleteHabit } from './delete-habit.ts';
import { HabitNotFound } from '../ports/errors.ts';
import {
	FixedClock,
	InMemoryEntryRepository,
	InMemoryHabitOrderRepository,
	InMemoryHabitRepository
} from '../testing.ts';

async function setup() {
	const habits = new InMemoryHabitRepository();
	const habitOrder = new InMemoryHabitOrderRepository();
	const entries = new InMemoryEntryRepository();
	const clock = new FixedClock(expectOk(Day.fromISO('2024-06-10')));
	const deps = { habits, habitOrder, entries, clock };

	const habit = expectOk(
		await createHabit(deps, {
			name: 'Piano',
			unitMinutes: 45,
			goalKind: 'daily',
			targetUnits: 4,
			startDate: '2024-06-01'
		})
	);
	return { deps, habits, entries, habitId: habit.id };
}

describe('deleteHabit', () => {
	it('removes the habit', async () => {
		const { deps, habits, habitId } = await setup();
		expectOk(await deleteHabit(deps, { habitId }));
		expect(expectOk(await habits.findById(expectOk(HabitId.fromString(habitId))))).toBeNull();
	});

	it('returns HabitNotFound for an unknown id', async () => {
		const { deps } = await setup();
		const error = expectErr(await deleteHabit(deps, { habitId: HabitId.generate().value }));
		expect(error).toBeInstanceOf(HabitNotFound);
	});

	it('rejects a malformed habit id', async () => {
		const { deps } = await setup();
		const error = expectErr(await deleteHabit(deps, { habitId: 'not-a-uuid' }));
		expect(error).toBeInstanceOf(InvalidValue);
	});

	it('is a no-op on entries from the repository perspective (schema cascade is an infra concern)', async () => {
		// The application layer only orchestrates habits.delete(); cascading
		// deletion of entries is guaranteed by the persistence schema
		// (ON DELETE CASCADE for the SQLite adapter), not by this use case.
		const { deps, entries, habitId } = await setup();
		await recordEntry(deps, { habitId, units: 1 });
		expectOk(await deleteHabit(deps, { habitId }));
		expect(
			(await entries.listByHabit(expectOk(HabitId.fromString(habitId)))).unwrap()
		).toHaveLength(1);
	});
});
