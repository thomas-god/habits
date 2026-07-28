import { describe, it, expect } from 'vitest';
import { Day } from '../../domain/index.ts';
import { expectOk } from '../../shared/testing.ts';
import { createHabit } from './create-habit.ts';
import { archiveHabit } from './archive-habit.ts';
import { recordEntry } from './record-entry.ts';
import { listHabitsWithProgress } from './list-habits-with-progress.ts';
import { FixedClock, InMemoryEntryRepository, InMemoryHabitRepository } from '../testing.ts';

async function setup() {
	const habits = new InMemoryHabitRepository();
	const entries = new InMemoryEntryRepository();
	const clock = new FixedClock(expectOk(Day.fromISO('2024-06-10')));
	const deps = { habits, entries, clock };
	return { deps, habits, entries, clock };
}

describe('listHabitsWithProgress', () => {
	it('returns each active habit with its progress', async () => {
		const { deps } = await setup();
		const piano = expectOk(
			await createHabit(deps, {
				name: 'Piano',
				unitMinutes: 45,
				goalKind: 'daily',
				targetUnits: 4,
				startDate: '2024-06-01'
			})
		);
		await recordEntry(deps, { habitId: piano.id, units: 1 });

		const list = expectOk(await listHabitsWithProgress(deps));
		expect(list).toHaveLength(1);
		expect(list[0].habit.name).toBe('Piano');
		expect(list[0].progress.kind).toBe('daily');
		expect(list[0].progress.doneUnits).toBe(1);
	});

	it('excludes archived habits by default (from the day after archiving)', async () => {
		// The archive day itself is still within [start, end] (inclusive), so we
		// list "the day after" to observe the habit becoming inactive.
		const { deps, habits, entries } = await setup();
		const habit = expectOk(
			await createHabit(deps, {
				name: 'Piano',
				unitMinutes: 45,
				goalKind: 'daily',
				targetUnits: 4,
				startDate: '2024-06-01'
			})
		);
		await archiveHabit(deps, { habitId: habit.id }); // ends on 2024-06-10

		const nextDayDeps = {
			habits,
			entries,
			clock: new FixedClock(expectOk(Day.fromISO('2024-06-11')))
		};
		expect(expectOk(await listHabitsWithProgress(nextDayDeps))).toHaveLength(0);
		expect(
			expectOk(await listHabitsWithProgress(nextDayDeps, { includeArchived: true }))
		).toHaveLength(1);
	});

	it('excludes habits that have not started yet', async () => {
		const { deps } = await setup();
		await createHabit(deps, {
			name: 'Future',
			unitMinutes: 45,
			goalKind: 'daily',
			targetUnits: 4,
			startDate: '2024-07-01'
		});
		expect(expectOk(await listHabitsWithProgress(deps))).toHaveLength(0);
	});

	it('returns an empty list when there are no habits', async () => {
		const { deps } = await setup();
		expect(expectOk(await listHabitsWithProgress(deps))).toEqual([]);
	});
});
