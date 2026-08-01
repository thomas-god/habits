import { describe, it, expect } from 'vitest';
import { Day } from '../../domain/index.ts';
import { expectOk } from '../../shared/testing.ts';
import { createHabit } from './create-habit.ts';
import { endHabit } from './end-habit.ts';
import { recordEntry } from './record-entry.ts';
import { listHabitsWithTodayEntry } from './list-habits-with-today-entry.ts';
import { FixedClock, InMemoryEntryRepository, InMemoryHabitRepository } from '../testing.ts';

async function setup() {
	const habits = new InMemoryHabitRepository();
	const entries = new InMemoryEntryRepository();
	const clock = new FixedClock(expectOk(Day.fromISO('2024-06-10')));
	const deps = { habits, entries, clock };
	return { deps, habits, entries, clock };
}

describe('listHabitsWithTodayEntry', () => {
	it('returns each active habit with its entry for today', async () => {
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
		await recordEntry(deps, { habitId: piano.id, units: 2 });

		const list = expectOk(await listHabitsWithTodayEntry(deps));
		expect(list).toHaveLength(1);
		expect(list[0].habit.name).toBe('Piano');
		expect(list[0].habit.id).toBe(piano.id);
		expect(list[0].today.day).toBe('2024-06-10');
		expect(list[0].today.units).toBe(2);
	});

	it('creates a default entry with 0 units when no entry exists for today', async () => {
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

		const list = expectOk(await listHabitsWithTodayEntry(deps));
		expect(list).toHaveLength(1);
		expect(list[0].habit.id).toBe(piano.id);
		expect(list[0].today.day).toBe('2024-06-10');
		expect(list[0].today.units).toBe(0);
	});

	it('returns multiple habits with their respective entries', async () => {
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
		const running = expectOk(
			await createHabit(deps, {
				name: 'Running',
				unitMinutes: 30,
				goalKind: 'daily',
				targetUnits: 2,
				startDate: '2024-06-01'
			})
		);
		await recordEntry(deps, { habitId: piano.id, units: 3 });
		await recordEntry(deps, { habitId: running.id, units: 1 });

		const list = expectOk(await listHabitsWithTodayEntry(deps));
		expect(list).toHaveLength(2);

		const pianoResult = list.find((h) => h.habit.name === 'Piano');
		expect(pianoResult).toBeDefined();
		expect(pianoResult!.today.units).toBe(3);

		const runningResult = list.find((h) => h.habit.name === 'Running');
		expect(runningResult).toBeDefined();
		expect(runningResult!.today.units).toBe(1);
	});

	it('excludes ended habits by default (from the day after ending)', async () => {
		// The end day itself is still within [start, end] (inclusive), so we
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
		await endHabit(deps, { habitId: habit.id }); // ends on 2024-06-10

		const nextDayDeps = {
			habits,
			entries,
			clock: new FixedClock(expectOk(Day.fromISO('2024-06-11')))
		};
		expect(expectOk(await listHabitsWithTodayEntry(nextDayDeps))).toHaveLength(0);
	});

	it('includes ended habits when requested', async () => {
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
		await endHabit(deps, { habitId: habit.id }); // ends on 2024-06-10

		const nextDayDeps = {
			habits,
			entries,
			clock: new FixedClock(expectOk(Day.fromISO('2024-06-11')))
		};
		const list = expectOk(await listHabitsWithTodayEntry(nextDayDeps, { includeEnded: true }));
		expect(list).toHaveLength(1);
		expect(list[0].habit.name).toBe('Piano');
		expect(list[0].habit.active).toBe(false);
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
		expect(expectOk(await listHabitsWithTodayEntry(deps))).toHaveLength(0);
	});

	it('includes future habits when includeEnded is true', async () => {
		const { deps } = await setup();
		const future = expectOk(
			await createHabit(deps, {
				name: 'Future',
				unitMinutes: 45,
				goalKind: 'daily',
				targetUnits: 4,
				startDate: '2024-07-01'
			})
		);
		const list = expectOk(await listHabitsWithTodayEntry(deps, { includeEnded: true }));
		expect(list).toHaveLength(1);
		expect(list[0].habit.name).toBe('Future');
		expect(list[0].habit.id).toBe(future.id);
		expect(list[0].habit.active).toBe(false);
	});

	it('returns an empty list when there are no habits', async () => {
		const { deps } = await setup();
		expect(expectOk(await listHabitsWithTodayEntry(deps))).toEqual([]);
	});

	it("only includes today's entry, not entries from other days", async () => {
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

		// Record entry for yesterday
		const yesterdayDeps = {
			habits,
			entries,
			clock: new FixedClock(expectOk(Day.fromISO('2024-06-09')))
		};
		await recordEntry(yesterdayDeps, { habitId: habit.id, units: 5 });

		// Check today's list
		const list = expectOk(await listHabitsWithTodayEntry(deps));
		expect(list).toHaveLength(1);
		expect(list[0].today.day).toBe('2024-06-10');
		expect(list[0].today.units).toBe(0); // no entry for today, should default to 0
	});

	it('uses the correct today entry when multiple entries exist', async () => {
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

		// Record entries for multiple days
		const june8Deps = {
			habits,
			entries,
			clock: new FixedClock(expectOk(Day.fromISO('2024-06-08')))
		};
		await recordEntry(june8Deps, { habitId: habit.id, units: 1 });

		const june9Deps = {
			habits,
			entries,
			clock: new FixedClock(expectOk(Day.fromISO('2024-06-09')))
		};
		await recordEntry(june9Deps, { habitId: habit.id, units: 2 });

		// Record entry for today
		await recordEntry(deps, { habitId: habit.id, units: 3 });

		const list = expectOk(await listHabitsWithTodayEntry(deps));
		expect(list).toHaveLength(1);
		expect(list[0].today.day).toBe('2024-06-10');
		expect(list[0].today.units).toBe(3); // only today's entry
	});

	it('marks habits correctly as active or inactive', async () => {
		const { deps } = await setup();
		expectOk(
			await createHabit(deps, {
				name: 'Active',
				unitMinutes: 45,
				goalKind: 'daily',
				targetUnits: 4,
				startDate: '2024-06-01'
			})
		);

		const list = expectOk(await listHabitsWithTodayEntry(deps));
		expect(list).toHaveLength(1);
		expect(list[0].habit.active).toBe(true);
	});
});
