import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { Habit, HabitId } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { HabitRepository } from '../../application/ports/habit-repository.ts';
import type { CorruptRecord } from '../../application/ports/errors.ts';
import { habitToRow, rowToHabit, type HabitRow } from './row-mappers.ts';

export class SqliteHabitRepository implements HabitRepository {
	private readonly upsert: StatementSync;
	private readonly selectById: StatementSync;
	private readonly selectAll: StatementSync;
	private readonly deleteById: StatementSync;

	constructor(private readonly db: DatabaseSync) {
		this.upsert = db.prepare(`
      INSERT INTO habit (id, name, description, type, unit_minutes, goal_units, start_date, end_date, created_at)
      VALUES (:id, :name, :description, :type, :unit_minutes, :goal_units, :start_date, :end_date, :created_at)
      ON CONFLICT(id) DO UPDATE SET
        name         = excluded.name,
        description  = excluded.description,
        type         = excluded.type,
        unit_minutes = excluded.unit_minutes,
        goal_units   = excluded.goal_units,
        start_date   = excluded.start_date,
        end_date     = excluded.end_date
    `);
		this.selectById = db.prepare('SELECT * FROM habit WHERE id = ?');
		this.selectAll = db.prepare('SELECT * FROM habit');
		this.deleteById = db.prepare('DELETE FROM habit WHERE id = ?');
	}

	async save(habit: Habit): Promise<void> {
		this.upsert.run(habitToRow(habit) as unknown as Parameters<typeof this.upsert.run>[0]);
	}

	async findById(id: HabitId): Promise<Result<Habit | null, CorruptRecord>> {
		const row = this.selectById.get(id.value) as unknown as HabitRow | undefined;
		if (row === undefined) return ok(null);
		return rowToHabit(row);
	}

	async listAll(): Promise<Result<Habit[], CorruptRecord>> {
		const rows = this.selectAll.all() as unknown as HabitRow[];
		const habits: Habit[] = [];
		for (const row of rows) {
			const result = rowToHabit(row);
			if (!result.ok) return err(result.error);
			habits.push(result.value);
		}
		return ok(habits);
	}

	async delete(id: HabitId): Promise<void> {
		this.deleteById.run(id.value);
	}
}
