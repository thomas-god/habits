import { describe, it, expect } from 'vitest';
import { Day, HabitId, InvalidValue } from '../../domain/index.ts';
import { expectErr, expectOk } from '../../shared/testing.ts';
import { createHabit } from './create-habit.ts';
import { FixedClock, InMemoryEntryRepository, InMemoryHabitRepository } from '../testing.ts';
import { HabitNotFound } from '../ports/errors.ts';
import { recordEntry, type RecordEntryDeps } from './record-entry.ts';

async function setup() {
	const habits = new InMemoryHabitRepository();
	const entries = new InMemoryEntryRepository();
	const clock = new FixedClock(expectOk(Day.fromISO('2024-06-10')));
	const deps: RecordEntryDeps = { habits, entries, clock };

	const habit = expectOk(
		await createHabit(
			{ habits, clock },
			{
				name: 'Piano',
				unitMinutes: 45,
				goalKind: 'daily',
				targetUnits: 4,
				startDate: '2024-06-01'
			}
		)
	);
	return { deps, entries, habitId: habit.id };
}

describe('recordEntry', () => {
	it('sets an absolute unit count, defaulting the day to today', async () => {
		const { deps, habitId } = await setup();
		const dto = expectOk(await recordEntry(deps, { habitId, units: 3 }));
		expect(dto.day).toBe('2024-06-10');
		expect(dto.units).toBe(3);
	});

	it('records for an explicit day', async () => {
		const { deps, habitId } = await setup();
		const dto = expectOk(await recordEntry(deps, { habitId, day: '2024-06-05', units: 2 }));
		expect(dto.day).toBe('2024-06-05');
		expect(dto.units).toBe(2);
	});

	it('overwrites a previous absolute value for the same day', async () => {
		const { deps, habitId } = await setup();
		await recordEntry(deps, { habitId, day: '2024-06-05', units: 2 });
		const dto = expectOk(await recordEntry(deps, { habitId, day: '2024-06-05', units: 5 }));
		expect(dto.units).toBe(5);
	});

	it('nudges the existing count with a positive delta', async () => {
		const { deps, habitId } = await setup();
		await recordEntry(deps, { habitId, day: '2024-06-05', units: 2 });
		const dto = expectOk(await recordEntry(deps, { habitId, day: '2024-06-05', delta: 1 }));
		expect(dto.units).toBe(3);
	});

	it('nudges a nonexistent entry from a base of zero', async () => {
		const { deps, habitId } = await setup();
		const dto = expectOk(await recordEntry(deps, { habitId, day: '2024-06-05', delta: 2 }));
		expect(dto.units).toBe(2);
	});

	it('clamps a negative delta at zero', async () => {
		const { deps, habitId } = await setup();
		await recordEntry(deps, { habitId, day: '2024-06-05', units: 1 });
		const dto = expectOk(await recordEntry(deps, { habitId, day: '2024-06-05', delta: -5 }));
		expect(dto.units).toBe(0);
	});

	it('returns HabitNotFound for an unknown (but well-formed) habit id', async () => {
		const { deps } = await setup();
		const error = expectErr(
			await recordEntry(deps, { habitId: HabitId.generate().value, units: 1 })
		);
		expect(error).toBeInstanceOf(HabitNotFound);
	});

	it('rejects a malformed habit id', async () => {
		const { deps } = await setup();
		const error = expectErr(await recordEntry(deps, { habitId: 'not-a-uuid', units: 1 }));
		expect(error).toBeInstanceOf(InvalidValue);
	});

	it('rejects a malformed day', async () => {
		const { deps, habitId } = await setup();
		const error = expectErr(await recordEntry(deps, { habitId, day: 'nope', units: 1 }));
		expect(error).toBeInstanceOf(InvalidValue);
	});

	it('rejects negative absolute units', async () => {
		const { deps, habitId } = await setup();
		const error = expectErr(await recordEntry(deps, { habitId, units: -1 }));
		expect(error).toBeInstanceOf(InvalidValue);
	});

	it('persists the entry via the repository', async () => {
		const { deps, entries, habitId } = await setup();
		await recordEntry(deps, { habitId, day: '2024-06-05', units: 4 });
		const stored = (await entries.listByHabit(expectOk(HabitId.fromString(habitId)))).unwrap();
		expect(stored).toHaveLength(1);
		expect(stored[0].units).toBe(4);
	});
});
