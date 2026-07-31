import type { Day, Entry, Habit } from '../domain/index.ts';
import type { EntryDTO, HabitDTO } from './dto.ts';

/** Map a domain `Habit` to its wire-safe DTO, resolving `active` against `today`. */
export function toHabitDTO(habit: Habit, today: Day): HabitDTO {
	return {
		id: habit.id.value,
		name: habit.name,
		unitMinutes: habit.unitOfWork.match({ some: (u) => u.minutes, none: () => null }),
		kind: habit.kind,
		targetUnits: habit.goal.targetUnits,
		startDate: habit.startDate.toISO(),
		endDate: habit.endDate?.toISO() ?? null,
		createdAt: habit.createdAt.toISOString(),
		active: habit.isActive(today)
	};
}

/** Map a domain `Entry` to its wire-safe DTO. */
export function toEntryDTO(entry: Entry): EntryDTO {
	return { day: entry.day.toISO(), units: entry.units };
}
