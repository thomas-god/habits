import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { Entry, EntryKey, HabitId } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { EntryRepository } from '../../application/ports/entry-repository.ts';
import type { CorruptRecord } from '../../application/ports/errors.ts';
import { entryToRow, rowToEntry, type EntryRow } from './row-mappers.ts';

export class SqliteEntryRepository implements EntryRepository {
	private readonly upsert: StatementSync;
	private readonly selectByKey: StatementSync;
	private readonly selectByHabit: StatementSync;

	constructor(private readonly db: DatabaseSync) {
		this.upsert = db.prepare(`
      INSERT INTO entry (habit_id, day, units)
      VALUES (?, ?, ?)
      ON CONFLICT(habit_id, day) DO UPDATE SET units = excluded.units
    `);
		this.selectByKey = db.prepare('SELECT * FROM entry WHERE habit_id = ? AND day = ?');
		this.selectByHabit = db.prepare('SELECT * FROM entry WHERE habit_id = ?');
	}

	async save(entry: Entry): Promise<void> {
		const row = entryToRow(entry);
		this.upsert.run(row.habit_id, row.day, row.units);
	}

	async findByKey(key: EntryKey): Promise<Result<Entry | null, CorruptRecord>> {
		const row = this.selectByKey.get(key.habitId.value, key.day.toISO()) as unknown as
			EntryRow | undefined;
		if (row === undefined) return ok(null);
		return rowToEntry(row);
	}

	async listByHabit(habitId: HabitId): Promise<Result<Entry[], CorruptRecord>> {
		const rows = this.selectByHabit.all(habitId.value) as unknown as EntryRow[];
		const entries: Entry[] = [];
		for (const row of rows) {
			const result = rowToEntry(row);
			if (!result.ok) return err(result.error);
			entries.push(result.value);
		}
		return ok(entries);
	}
}
