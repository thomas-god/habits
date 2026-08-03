import { describe, it, expect, beforeEach } from 'vitest';
import { Day, DailyGoal, Habit, HabitId, UnitOfWork } from '../../domain/index.ts';
import { CorruptRecord } from '../../application/ports/errors.ts';
import { some } from '../../shared/option.ts';
import { expectOk } from '../../shared/testing.ts';
import { NoopLogger } from '../../application/testing.ts';
import { openDatabase } from './database.ts';
import { runMigrations } from './migrations.ts';
import { SqliteHabitRepository } from './sqlite-habit-repository.ts';
import { SqliteHabitOrderRepository } from './sqlite-habit-order-repository.ts';
import type { DatabaseSync } from 'node:sqlite';

function makeDb() {
	const db = openDatabase(':memory:');
	runMigrations(db);
	return db;
}

function makeHabit(name: string, createdAt: string) {
	return expectOk(
		Habit.from({
			id: HabitId.generate(),
			name,
			unitOfWork: some(expectOk(UnitOfWork.ofMinutes(45))),
			goal: expectOk(DailyGoal.of(3)),
			startDate: expectOk(Day.fromISO('2024-06-01')),
			createdAt: new Date(createdAt)
		})
	);
}

describe('SqliteHabitOrderRepository', () => {
	let db: DatabaseSync;
	let habits: SqliteHabitRepository;
	let repo: SqliteHabitOrderRepository;

	beforeEach(() => {
		db = makeDb();
		habits = new SqliteHabitRepository(db, new NoopLogger());
		repo = new SqliteHabitOrderRepository(db, new NoopLogger());
	});

	it('returns an empty order when no habits exist', async () => {
		expect(expectOk(await repo.list())).toEqual([]);
	});

	it('appends new ids to the end of the order', async () => {
		const a = makeHabit('A', '2024-06-01T00:00:00.000Z');
		const b = makeHabit('B', '2024-06-02T00:00:00.000Z');
		await habits.save(a);
		await habits.save(b);
		await repo.append(a.id);
		await repo.append(b.id);

		const order = expectOk(await repo.list());
		expect(order.map((id) => id.value)).toEqual([a.id.value, b.id.value]);
	});

	it('save replaces the order, positions following the array index', async () => {
		const a = makeHabit('A', '2024-06-01T00:00:00.000Z');
		const b = makeHabit('B', '2024-06-02T00:00:00.000Z');
		await habits.save(a);
		await habits.save(b);
		await repo.append(a.id);
		await repo.append(b.id);

		await repo.save([b.id, a.id]);

		const order = expectOk(await repo.list());
		expect(order.map((id) => id.value)).toEqual([b.id.value, a.id.value]);
	});

	it('removes an id from the order', async () => {
		const a = makeHabit('A', '2024-06-01T00:00:00.000Z');
		const b = makeHabit('B', '2024-06-02T00:00:00.000Z');
		await habits.save(a);
		await habits.save(b);
		await repo.append(a.id);
		await repo.append(b.id);

		await repo.remove(a.id);

		const order = expectOk(await repo.list());
		expect(order.map((id) => id.value)).toEqual([b.id.value]);
	});

	it('drops the order row when the referenced habit is deleted (cascade)', async () => {
		const a = makeHabit('A', '2024-06-01T00:00:00.000Z');
		await habits.save(a);
		await repo.append(a.id);

		await habits.delete(a.id);

		expect(expectOk(await repo.list())).toEqual([]);
	});

	it('returns CorruptRecord when a stored row has a malformed habit id', async () => {
		// habit_order has a FK to habit(id), so first write a (domain-invalid,
		// but FK-satisfying) habit row directly, bypassing HabitId validation.
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?,?)').run(
			'bad-uuid',
			'A',
			'daily',
			45,
			3,
			'2024-06-01',
			null,
			'2024-06-01T00:00:00.000Z',
			null
		);
		db.prepare('INSERT INTO habit_order (habit_id, position) VALUES (?, ?)').run('bad-uuid', 0);

		const listResult = await repo.list();
		expect(listResult.ok).toBe(false);
		if (!listResult.ok) expect(listResult.error).toBeInstanceOf(CorruptRecord);
	});
});
