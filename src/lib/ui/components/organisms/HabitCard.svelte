<script lang="ts">
	import { enhance } from '$app/forms';
	import type { HabitWithTodayEntryDTO } from '$lib/application';
	import { none, some } from '$lib/shared/option';
	import { formatUnitLabel } from '$lib/ui/format';
	import UnitGrid from '$lib/ui/components/molecules/UnitGrid.svelte';

	let {
		habitDetail,
		canMoveUp = false,
		canMoveDown = false
	}: { habitDetail: HabitWithTodayEntryDTO; canMoveUp?: boolean; canMoveDown?: boolean } =
		$props();

	let { habit, today } = $derived(habitDetail);

	let unitLabel = $derived(formatUnitLabel(habit.unitMinutes));
	let endingToday = $derived(habit.endDate === today.day);
</script>

<div class="card flex-row bg-base-100 shadow-sm transition-shadow hover:shadow-md">
	<div class="card-body flex-1 gap-3 p-5">
		<!-- Header -->
		<div class="flex items-start justify-between gap-2">
			<a href="/habits/{habit.id}" class="card-title text-lg hover:underline">{habit.name}</a>
			{#if endingToday}
				<span class="badge badge-ghost badge-sm text-base-content/50">Ending today</span>
			{:else if !habit.active}
				<span class="badge badge-sm badge-neutral">Ended</span>
			{/if}
		</div>

		<!-- Unit grid -->
		{#if habit.kind === 'daily'}
			<UnitGrid done={today.units} target={some(habit.targetUnits ?? 0)} />
		{:else}
			<UnitGrid done={today.units} target={none()} />
		{/if}

		<div class="flex flex-row">
			{#if habit.active}
				<!-- +/- controls -->
				<div class="join">
					<form method="POST" action="?/record" use:enhance class="join-item">
						<input type="hidden" name="habitId" value={habit.id} />
						<input type="hidden" name="delta" value="-1" />
						<button class="btn btn-ghost btn-sm" aria-label="Remove one unit">−</button>
					</form>
					{#if unitLabel.isSome()}
						<div class="join-item p-2 text-sm">
							{unitLabel.value}
						</div>
					{/if}
					<form method="POST" action="?/record" use:enhance class="join-item">
						<input type="hidden" name="habitId" value={habit.id} />
						<input type="hidden" name="delta" value="1" />
						<button class="btn btn-ghost btn-sm" aria-label="Add one unit">+</button>
					</form>
				</div>
			{/if}
			<div class="ml-auto">
				<a href="/habits/{habit.id}" class="btn btn-ghost btn-xs">Details →</a>
			</div>
		</div>
	</div>

	{#if habit.active}
		<!-- Reorder controls -->
		<div class="flex flex-col items-center justify-center gap-1 border-l border-base-200 px-2">
			<form method="POST" action="?/move" use:enhance>
				<input type="hidden" name="habitId" value={habit.id} />
				<input type="hidden" name="direction" value="up" />
				<button class="btn btn-ghost btn-xs px-1" disabled={!canMoveUp} aria-label="Move up"
					>▲</button
				>
			</form>
			<form method="POST" action="?/move" use:enhance>
				<input type="hidden" name="habitId" value={habit.id} />
				<input type="hidden" name="direction" value="down" />
				<button class="btn btn-ghost btn-xs px-1" disabled={!canMoveDown} aria-label="Move down"
					>▼</button
				>
			</form>
		</div>
	{/if}
</div>
