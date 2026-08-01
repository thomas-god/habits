import { getContainer } from '../infrastructure/container.ts';
import { createHabit } from '../application/use-cases/create-habit.ts';
import { recordEntry } from '../application/use-cases/record-entry.ts';
import { listHabitsWithProgress } from '../application/use-cases/list-habits-with-progress.ts';
import { getHabitDetail } from '../application/use-cases/get-habit-detail.ts';
import { editHabit } from '../application/use-cases/edit-habit.ts';
import { endHabit } from '../application/use-cases/end-habit.ts';
import { deleteHabit } from '../application/use-cases/delete-habit.ts';
import { listHabitsWithTodayEntry } from '../application/use-cases/list-habits-with-today-entry.ts';

/**
 * Fully-wired use cases for SvelteKit routes to import.
 *
 * Each export is a plain async function that accepts only its input DTO —
 * the port dependencies are already bound. Routes stay free of any
 * infrastructure or domain imports.
 */

const { deps } = getContainer();

export const useCases = {
	createHabit: (input: Parameters<typeof createHabit>[1]) => createHabit(deps, input),
	recordEntry: (input: Parameters<typeof recordEntry>[1]) => recordEntry(deps, input),
	listHabitsWithProgress: (input?: Parameters<typeof listHabitsWithProgress>[1]) =>
		listHabitsWithProgress(deps, input),
	listHabitsWithTodayEntry: (input?: Parameters<typeof listHabitsWithTodayEntry>[1]) =>
		listHabitsWithTodayEntry(deps, input),
	getHabitDetail: (input: Parameters<typeof getHabitDetail>[1]) => getHabitDetail(deps, input),
	editHabit: (input: Parameters<typeof editHabit>[1]) => editHabit(deps, input),
	endHabit: (input: Parameters<typeof endHabit>[1]) => endHabit(deps, input),
	deleteHabit: (input: Parameters<typeof deleteHabit>[1]) => deleteHabit(deps, input)
};
