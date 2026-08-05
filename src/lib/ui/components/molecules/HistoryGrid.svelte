<script lang="ts">
	import type { HabitDetailDTO } from '$lib/application';
	import { asOption } from '$lib/shared/option';
	import { parseDay, getToday } from '$lib/ui/date';
	import { formatTotalUnits } from '$lib/ui/format';
	import dayjs from 'dayjs';

	let { habitDetails }: { habitDetails: HabitDetailDTO } = $props();

	let { habit, entries } = $derived(habitDetails);
	let today = getToday();
	let startDay = $derived(parseDay(habit.startDate));
	let endDay = $derived(habit.endDate === null ? today : parseDay(habit.endDate));
	let max = $derived(Math.max(...entries.map((e) => e.units)));

	type HistorySquare =
		| { kind: 'out-of-range'; day: dayjs.Dayjs; column: number; row: number }
		| { kind: 'in-range'; day: dayjs.Dayjs; units: number; column: number; row: number };
	let days: HistorySquare[] = $derived.by(() => {
		const days: HistorySquare[] = [];
		let column = 1;
		const start = startDay.startOf('week');
		const end = endDay.endOf('week');
		for (let day = start; day <= end; day = day.add(1, 'day')) {
			if (day.isBefore(startDay) || day.isAfter(endDay)) {
				days.push({ kind: 'out-of-range', day, column: column, row: day.isoWeekday() });
				continue;
			}
			const units = asOption(entries.find((e) => parseDay(e.day).isSame(day)))
				.map((e) => e.units)
				.unwrapOr(0);

			days.push({
				kind: 'in-range',
				day,
				units,
				column: column,
				row: day.isoWeekday()
			});
			// On sundays increase column value for next week
			if (day.isoWeekday() === 7) {
				column++;
			}
		}
		return days;
	});
	let nbColumns = $derived(days.at(-1) === undefined ? 0 : days.at(-1)!.column);

	const dailyHabitState = (units: number): 'not-done' | 'partial' | 'done' => {
		if (units === 0) {
			return 'not-done';
		}
		if (units < (habit.targetUnits ?? 0)) {
			return 'partial';
		}
		return 'done';
	};
</script>

<div class="grid gap-0.5 text-xs" style:grid-template-columns={`repeat(${nbColumns}, 16px)`}>
	{#each days as day (day.day)}
		{#if day.kind === 'out-of-range'}
			{@render outOfRangeSquare(day)}
		{:else if habit.kind === 'daily'}
			{@render dailyHabitSquare(day)}
		{:else}
			{@render overallHabitSquare(day)}
		{/if}
	{/each}
</div>

{#snippet outOfRangeSquare({ row, column }: { day: dayjs.Dayjs; row: number; column: number })}
	<div class="h-4 w-4 rounded-sm border-none" style:grid-row={row} style:grid-column={column}></div>
{/snippet}

{#snippet overallHabitSquare({
	day,
	units,
	row,
	column
}: {
	day: dayjs.Dayjs;
	row: number;
	column: number;
	units: number;
})}
	{@const ratio = units / max}
	<div class="tooltip" style:grid-row={row} style:grid-column={column}>
		<div class="tooltip-content flex flex-col items-start">
			<div>{day.format('YYYY-MM-DD')}</div>
			<div>{formatTotalUnits(units, habit.unitMinutes)}</div>
		</div>
		{#if units === 0}
			<div class="h-4 w-4 rounded-sm border border-gray-700"></div>
		{:else}
			<div
				class="h-4 w-4 rounded-sm bg-primary"
				style:opacity={Math.round(ratio * 100) + '%'}
			></div>
		{/if}
	</div>
{/snippet}

{#snippet dailyHabitSquare({
	day,
	units,
	row,
	column
}: {
	day: dayjs.Dayjs;
	row: number;
	column: number;
	units: number;
})}
	{@const state = dailyHabitState(units)}
	<div class="tooltip" style:grid-row={row} style:grid-column={column}>
		<div class="tooltip-content flex flex-col items-start">
			<div>{day.format('YYYY-MM-DD')}</div>
			<div>{formatTotalUnits(units, habit.unitMinutes)}</div>
		</div>
		{#if state === 'not-done'}
			<div class="h-4 w-4 rounded-sm border border-gray-700"></div>
		{:else if state === 'partial'}
			<div
				class="h-4 w-4 rounded-sm border border-primary text-primary"
				style:background-image={`repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px
				4px)`}
			></div>
		{:else}
			<div class="h-4 w-4 rounded-sm bg-primary"></div>
		{/if}
	</div>
{/snippet}
