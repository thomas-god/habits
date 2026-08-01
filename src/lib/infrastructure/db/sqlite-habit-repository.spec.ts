import { describe, it, expect, beforeEach } from 'vitest';
import { Day, DailyGoal, Habit, HabitId, OverallGoal, UnitOfWork } from '../../domain/index.ts';
import { CorruptRecord } from '../../application/ports/errors.ts';
import { some } from '../../shared/option.ts';
import { expectOk } from '../../shared/testing.ts';
import { openDatabase } from './database.ts';
import { runMigrations } from './migrations.ts';
import { SqliteHabitRepository } from './sqlite-habit-repository.ts';
import type { DatabaseSync } from 'node:sqlite';

function makeDb() {
	const db = openDatabase(':memory:');
	runMigrations(db);
	return db;
}

function makeHabit(db: DatabaseSync, overrides: Partial<Parameters<typeof Habit.from>[0]> = {}) {
	return expectOk(
		Habit.from({
			id: HabitId.generate(),
			name: 'Piano',
			unitOfWork: some(expectOk(UnitOfWork.ofMinutes(45))),
			goal: expectOk(DailyGoal.of(3)),
			startDate: expectOk(Day.fromISO('2024-06-01')),
			createdAt: new Date('2024-06-01T00:00:00.000Z'),
			...overrides
		})
	);
	void db; // db not needed to build a habit; passed for clarity in tests
}

describe('SqliteHabitRepository', () => {
	let db: DatabaseSync;
	let repo: SqliteHabitRepository;

	beforeEach(() => {
		db = makeDb();
		repo = new SqliteHabitRepository(db);
	});

	it('saves and retrieves a habit by id', async () => {
		const habit = makeHabit(db);
		await repo.save(habit);
		const found = expectOk(await repo.findById(habit.id));
		expect(found?.id.value).toBe(habit.id.value);
		expect(found?.name).toBe('Piano');
	});

	it('returns null for an unknown id', async () => {
		expect(expectOk(await repo.findById(HabitId.generate()))).toBeNull();
	});

	it('save is an upsert — overwrites the existing row', async () => {
		const habit = makeHabit(db);
		await repo.save(habit);
		const updated = expectOk(habit.update({ name: 'Guitar' }));
		await repo.save(updated);
		const found = expectOk(await repo.findById(habit.id));
		expect(found?.name).toBe('Guitar');
		expect(expectOk(await repo.listAll())).toHaveLength(1);
	});

	it('lists all habits', async () => {
		await repo.save(makeHabit(db));
		await repo.save(makeHabit(db, { name: 'CAD', goal: expectOk(OverallGoal.of(100)) }));
		const habits = expectOk(await repo.listAll());
		expect(habits).toHaveLength(2);
	});

	it('returns an empty list when there are no habits', async () => {
		expect(expectOk(await repo.listAll())).toEqual([]);
	});

	it('deletes a habit by id', async () => {
		const habit = makeHabit(db);
		await repo.save(habit);
		await repo.delete(habit.id);
		expect(expectOk(await repo.findById(habit.id))).toBeNull();
		expect(expectOk(await repo.listAll())).toHaveLength(0);
	});

	it('persists and restores an end date', async () => {
		const habit = makeHabit(db, { endDate: some(expectOk(Day.fromISO('2024-08-31'))) });
		await repo.save(habit);
		const found = expectOk(await repo.findById(habit.id));
		expect(found?.endDate.unwrap().toISO()).toBe('2024-08-31');
	});

	it('persists and restores a description', async () => {
		const habit = makeHabit(db, { description: some('Practice scales') });
		await repo.save(habit);
		const found = expectOk(await repo.findById(habit.id));
		expect(found?.description.unwrap()).toBe('Practice scales');
	});

	it('persists and restores an overall goal', async () => {
		const habit = makeHabit(db, { goal: expectOk(OverallGoal.of(100)) });
		await repo.save(habit);
		const found = expectOk(await repo.findById(habit.id));
		expect(found?.kind).toBe('overall');
		expect(found?.goal.targetUnits).toBe(100);
	});

	it('returns CorruptRecord when a stored row violates invariants', async () => {
		// Bypass the domain by writing a corrupt row directly.
		db.prepare('INSERT INTO habit VALUES (?,?,?,?,?,?,?,?,?)').run(
			'bad-uuid',
			'',
			'daily',
			45,
			3,
			'2024-06-01',
			null,
			'2024-06-01T00:00:00.000Z',
			null
		);
		const listResult = await repo.listAll();
		expect(listResult.ok).toBe(false);
		if (!listResult.ok) expect(listResult.error).toBeInstanceOf(CorruptRecord);
	});
});
