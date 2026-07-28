import { Day, Entry, EntryKey, HabitId, type DomainError } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import type { Clock } from '../ports/clock.ts';
import type { EntryRepository } from '../ports/entry-repository.ts';
import { HabitNotFound, type CorruptRecord } from '../ports/errors.ts';
import type { HabitRepository } from '../ports/habit-repository.ts';
import type { EntryDTO } from '../dto.ts';
import { toEntryDTO } from '../mappers.ts';

/**
 * Record work for a habit on a day, either by setting an absolute unit count
 * (`units`, e.g. a "log 3 units" form) or by nudging the existing count
 * (`delta`, e.g. quick +/- buttons). `day` defaults to today.
 */
export type RecordEntryInput = { habitId: string; day?: string } & (
	{ units: number; delta?: undefined } | { delta: number; units?: undefined }
);

export type RecordEntryError = DomainError | HabitNotFound | CorruptRecord;

export interface RecordEntryDeps {
	habits: HabitRepository;
	entries: EntryRepository;
	clock: Clock;
}

export async function recordEntry(
	deps: RecordEntryDeps,
	input: RecordEntryInput
): Promise<Result<EntryDTO, RecordEntryError>> {
	const idResult = HabitId.fromString(input.habitId);
	if (!idResult.ok) return err(idResult.error);
	const habitId = idResult.value;

	const dayResult = input.day !== undefined ? Day.fromISO(input.day) : ok(deps.clock.today());
	if (!dayResult.ok) return err(dayResult.error);
	const day = dayResult.value;

	const habitResult = await deps.habits.findById(habitId);
	if (!habitResult.ok) return err(habitResult.error);
	if (!habitResult.value) return err(new HabitNotFound(input.habitId));

	let units: number;
	if (input.units !== undefined) {
		units = input.units;
	} else {
		const existingResult = await deps.entries.findByKey(new EntryKey(habitId, day));
		if (!existingResult.ok) return err(existingResult.error);
		units = Math.max(0, (existingResult.value?.units ?? 0) + input.delta);
	}

	const entryResult = Entry.create({ habitId, day, units });
	if (!entryResult.ok) return err(entryResult.error);

	await deps.entries.save(entryResult.value);
	return ok(toEntryDTO(entryResult.value));
}
