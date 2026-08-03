import { describe, it, expect } from 'vitest';
import { Day, HabitId, InvalidValue } from '../../domain/index.ts';
import { expectErr, expectOk } from '../../shared/testing.ts';
import { createHabit } from './create-habit.ts';
import { moveHabit } from './move-habit-order.ts';
import { HabitNotFound } from '../ports/errors.ts';
import { FixedClock, InMemoryHabitOrderRepository, InMemoryHabitRepository } from '../testing.ts';

async function setup() {
	const habits = new InMemoryHabitRepository();
	const habitOrder = new InMemoryHabitOrderRepository();
	const clock = new FixedClock(expectOk(Day.fromISO('2024-06-10')));
	const deps = { habits, habitOrder, clock };

	async function seed(name: string) {
		return expectOk(
			await createHabit(deps, {
				name,
				unitMinutes: 45,
				goalKind: 'daily',
				targetUnits: 4,
				startDate: '2024-06-01'
			})
		);
	}

	const a = await seed('A');
	const b = await seed('B');
	const c = await seed('C');
	return { deps, habitOrder, a, b, c };
}

async function orderedNames(
	habitOrder: InMemoryHabitOrderRepository,
	names: Record<string, string>
) {
	const order = expectOk(await habitOrder.list());
	return order.map((id) => names[id.value]);
}

describe('moveHabit', () => {
	it('swaps a habit with its upward neighbour', async () => {
		const { deps, habitOrder, a, b, c } = await setup();
		const names = { [a.id]: 'A', [b.id]: 'B', [c.id]: 'C' };

		await moveHabit(deps, { habitId: b.id, direction: 'up' });

		expect(await orderedNames(habitOrder, names)).toEqual(['B', 'A', 'C']);
	});

	it('swaps a habit with its downward neighbour', async () => {
		const { deps, habitOrder, a, b, c } = await setup();
		const names = { [a.id]: 'A', [b.id]: 'B', [c.id]: 'C' };

		await moveHabit(deps, { habitId: b.id, direction: 'down' });

		expect(await orderedNames(habitOrder, names)).toEqual(['A', 'C', 'B']);
	});

	it('is a no-op when moving the first habit up', async () => {
		const { deps, habitOrder, a, b, c } = await setup();
		const names = { [a.id]: 'A', [b.id]: 'B', [c.id]: 'C' };

		const result = expectOk(await moveHabit(deps, { habitId: a.id, direction: 'up' }));

		expect(result).toBeUndefined();
		expect(await orderedNames(habitOrder, names)).toEqual(['A', 'B', 'C']);
	});

	it('is a no-op when moving the last habit down', async () => {
		const { deps, habitOrder, a, b, c } = await setup();
		const names = { [a.id]: 'A', [b.id]: 'B', [c.id]: 'C' };

		const result = expectOk(await moveHabit(deps, { habitId: c.id, direction: 'down' }));

		expect(result).toBeUndefined();
		expect(await orderedNames(habitOrder, names)).toEqual(['A', 'B', 'C']);
	});

	it('returns HabitNotFound for an unknown id', async () => {
		const { deps } = await setup();
		const error = expectErr(
			await moveHabit(deps, { habitId: HabitId.generate().value, direction: 'up' })
		);
		expect(error).toBeInstanceOf(HabitNotFound);
	});

	it('rejects a malformed habit id', async () => {
		const { deps } = await setup();
		const error = expectErr(await moveHabit(deps, { habitId: 'not-a-uuid', direction: 'up' }));
		expect(error).toBeInstanceOf(InvalidValue);
	});
});
