import { none, some, type Option } from '../shared/option.ts';
import { err, ok, type Result } from '../shared/result.ts';
import { Day } from './day.ts';
import { InvalidHabit } from './errors.ts';
import type { Goal, GoalKind } from './goal.ts';
import { HabitId } from './ids.ts';
import { UnitOfWork } from './unit-of-work.ts';

/**
 * A thing the user wants to make progress on.
 *
 * A habit combines a unit of work (granularity), a goal (the target), and a
 * schedule (a mandatory start date and an optional end date). The end date
 * serves both as an upfront deadline and as the archive marker: archiving a
 * habit simply sets its end date to the day of the archive action.
 *
 * "Active" is never stored — it is derived from the schedule and the current
 * day, so there is a single source of truth.
 *
 * The habit carries a domain identity (`HabitId`) from creation onwards.
 */
export class Habit {
	readonly id: HabitId;
	readonly name: string;
	readonly unitOfWork: Option<UnitOfWork>;
	readonly goal: Goal;
	readonly startDate: Day;
	readonly endDate: Option<Day>;
	readonly createdAt: Date;
	readonly description: Option<string>;

	private constructor(params: {
		id: HabitId;
		name: string;
		unitOfWork: Option<UnitOfWork>;
		goal: Goal;
		startDate: Day;
		endDate: Option<Day>;
		createdAt: Date;
		description: Option<string>;
	}) {
		this.id = params.id;
		this.name = params.name;
		this.unitOfWork = params.unitOfWork;
		this.goal = params.goal;
		this.startDate = params.startDate;
		this.endDate = params.endDate;
		this.createdAt = params.createdAt;
		this.description = params.description;
	}

	/** The goal kind, derived from the goal. */
	get kind(): GoalKind {
		return this.goal.kind;
	}

	/**
	 * The single smart constructor for a habit: parse a full set of fields into
	 * a guaranteed-valid `Habit`, or fail. Following "parse, don't validate",
	 * this is the *only* way to obtain a `Habit`, so holding one is proof its
	 * invariants hold — whether the data came from a form or a database row.
	 *
	 * The caller supplies the identity (`HabitId.generate()` for a new habit,
	 * the stored id when rehydrating) and `createdAt`, keeping this factory free
	 * of hidden defaults or an implicit new-vs-rehydrated distinction.
	 */
	static from(params: {
		id: HabitId;
		name: string;
		unitOfWork: Option<UnitOfWork>;
		goal: Goal;
		startDate: Day;
		endDate?: Option<Day>;
		createdAt: Date;
		description?: Option<string>;
	}): Result<Habit, InvalidHabit> {
		const name = params.name.trim();
		if (name.length === 0) {
			return err(new InvalidHabit('Habit name must not be empty'));
		}
		const endDate = params.endDate ?? none();
		if (endDate.isSomeAnd((end) => end.isBefore(params.startDate))) {
			return err(new InvalidHabit('Habit end date must not be before its start date'));
		}
		const description = (params.description ?? none())
			.map((d) => d.trim())
			.andThen((d) => (d.length === 0 ? none<string>() : some(d)));
		return ok(new Habit({ ...params, name, endDate, description }));
	}

	/**
	 * Whether the habit is active on `day`: on/after its start and, if an end
	 * date is set, on/before it.
	 */
	isActive(day: Day): boolean {
		if (day.isBefore(this.startDate)) return false;
		if (this.endDate.isSomeAnd((end) => day.isAfter(end))) return false;
		return true;
	}

	/** Whether the habit has ended (archived or past its deadline) as of `day`. */
	isEnded(day: Day): boolean {
		return this.endDate.isSomeAnd((end) => end.isBefore(day));
	}

	/** A copy archived on `day` — i.e. with its end date set to that day. */
	archiveOn(day: Day): Result<Habit, InvalidHabit> {
		if (day.isBefore(this.startDate)) {
			return err(new InvalidHabit('Cannot archive a habit before its start date'));
		}
		return ok(new Habit({ ...this, endDate: some(day) }));
	}

	/** A copy with fields changed; re-checks invariants. */
	update(changes: {
		name?: string;
		unitOfWork?: Option<UnitOfWork>;
		goal?: Goal;
		startDate?: Day;
		endDate?: Option<Day>;
		description?: Option<string>;
	}): Result<Habit, InvalidHabit> {
		return Habit.from({
			id: this.id,
			name: changes.name ?? this.name,
			unitOfWork: changes.unitOfWork ?? this.unitOfWork,
			goal: changes.goal ?? this.goal,
			startDate: changes.startDate ?? this.startDate,
			endDate: changes.endDate === undefined ? this.endDate : changes.endDate,
			createdAt: this.createdAt,
			description: changes.description === undefined ? this.description : changes.description
		});
	}
}
