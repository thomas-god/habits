import type { DatabaseSync, StatementSync } from 'node:sqlite';
import { HabitId } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { HabitOrderRepository } from '../../application/ports/habit-order-repository.ts';
import { CorruptRecord } from '../../application/ports/errors.ts';
import type { Logger } from '../../application/ports/logger.ts';

export class SqliteHabitOrderRepository implements HabitOrderRepository {
	private readonly selectAll: StatementSync;
	private readonly updatePosition: StatementSync;
	private readonly insertAtEnd: StatementSync;
	private readonly deleteById: StatementSync;

	constructor(
		private readonly db: DatabaseSync,
		private readonly logger: Logger
	) {
		this.selectAll = db.prepare('SELECT habit_id FROM habit_order ORDER BY position ASC');
		this.updatePosition = db.prepare('UPDATE habit_order SET position = ? WHERE habit_id = ?');
		this.insertAtEnd = db.prepare(`
      INSERT INTO habit_order (habit_id, position)
      VALUES (?, (SELECT COALESCE(MAX(position), -1) + 1 FROM habit_order))
    `);
		this.deleteById = db.prepare('DELETE FROM habit_order WHERE habit_id = ?');
	}

	async list(): Promise<Result<HabitId[], CorruptRecord>> {
		const rows = this.selectAll.all() as unknown as { habit_id: string }[];
		const ids: HabitId[] = [];
		for (const row of rows) {
			const result = HabitId.fromString(row.habit_id);
			if (!result.ok) {
				const error = new CorruptRecord(
					`Corrupt record (id=${row.habit_id}, field=habit_id): ${result.error.message}`,
					result.error
				);
				this.logger.error('habit_order_repository.corrupt_record', {
					habitId: row.habit_id,
					message: error.message
				});
				return err(error);
			}
			ids.push(result.value);
		}
		return ok(ids);
	}

	async save(order: HabitId[]): Promise<void> {
		this.db.exec('BEGIN');
		try {
			order.forEach((id, position) => {
				this.updatePosition.run(position, id.value);
			});
			this.db.exec('COMMIT');
		} catch (e) {
			this.db.exec('ROLLBACK');
			throw e;
		}
	}

	async append(id: HabitId): Promise<void> {
		this.insertAtEnd.run(id.value);
	}

	async remove(id: HabitId): Promise<void> {
		this.deleteById.run(id.value);
	}
}
