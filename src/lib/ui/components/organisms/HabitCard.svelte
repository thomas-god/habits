<script lang="ts">
	import { enhance } from '$app/forms';
	import type { HabitWithTodayEntryDTO } from '$lib/application';
	import { none, some } from '$lib/shared/option';
	import { formatUnitLabel } from '$lib/ui/format';
	import UnitGrid from '$lib/ui/components/molecules/UnitGrid.svelte';

	let { habitDetail }: { habitDetail: HabitWithTodayEntryDTO } = $props();

	let { habit, today } = $derived(habitDetail);

	let unitLabel = $derived(formatUnitLabel(habit.unitMinutes));
</script>

<div class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md">
	<div class="card-body gap-3 p-5">
		<!-- Header -->
		<div class="flex items-start justify-between gap-2">
			<div>
				<a href="/habits/{habit.id}" class="card-title text-lg hover:underline">{habit.name}</a>
			</div>
		</div>

		<!-- Unit grid -->
		{#if habit.kind === 'daily'}
			<UnitGrid done={today.units} target={some(habit.targetUnits)} />
		{:else}
			<UnitGrid done={today.units} target={none()} />
		{/if}

		<div class="flex flex-row">
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
			<div class="ml-auto">
				<a href="/habits/{habit.id}" class="btn btn-ghost btn-xs">Details →</a>
			</div>
		</div>
	</div>
</div>
