import { describe, it, expect } from 'vitest';
import { Day, HabitId, InvalidValue } from '../../domain/index.ts';
import { expectErr, expectOk } from '../../shared/testing.ts';
import { createHabit } from './create-habit.ts';
import { recordEntry } from './record-entry.ts';
import { getHabitDetail } from './get-habit-detail.ts';
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
			name: 'CAD',
			unitMinutes: 60,
			goalKind: 'overall',
			targetUnits: 100,
			startDate: '2024-06-01'
		})
	);
	return { deps, habitId: habit.id };
}

describe('getHabitDetail', () => {
	it('returns the habit, its progress, and its history ordered by day', async () => {
		const { deps, habitId } = await setup();
		await recordEntry(deps, { habitId, day: '2024-06-05', units: 3 });
		await recordEntry(deps, { habitId, day: '2024-06-02', units: 2 });

		const detail = expectOk(await getHabitDetail(deps, { habitId }));
		expect(detail.habit.name).toBe('CAD');
		expect(detail.progress.kind).toBe('overall');
		expect(detail.progress.doneUnits).toBe(5);
		expect(detail.entries.map((e) => e.day)).toEqual(['2024-06-02', '2024-06-05']);
	});

	it('returns an empty history for a freshly created habit', async () => {
		const { deps, habitId } = await setup();
		const detail = expectOk(await getHabitDetail(deps, { habitId }));
		expect(detail.entries).toEqual([]);
		expect(detail.progress.doneUnits).toBe(0);
	});

	it('returns HabitNotFound for an unknown (but well-formed) id', async () => {
		const { deps } = await setup();
		const error = expectErr(await getHabitDetail(deps, { habitId: HabitId.generate().value }));
		expect(error).toBeInstanceOf(HabitNotFound);
	});

	it('rejects a malformed habit id', async () => {
		const { deps } = await setup();
		const error = expectErr(await getHabitDetail(deps, { habitId: 'not-a-uuid' }));
		expect(error).toBeInstanceOf(InvalidValue);
	});
});
