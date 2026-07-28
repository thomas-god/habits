<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types.js';
	import type { DailyProgress, OverallProgress } from '$lib/domain/index.js';
	import { formatUnit } from '$lib/ui/format.js';
	import UnitGrid from '$lib/ui/UnitGrid.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Today</h1>
	<span class="text-sm text-base-content/50"
		>{new Date().toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		})}</span
	>
</div>

{#if data.habits.length === 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body items-center py-16 text-center">
			<p class="text-lg text-base-content/50">No active habits yet.</p>
			<a href="/habits/new" class="btn mt-4 btn-primary">Create your first habit</a>
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#each data.habits as { habit, progress } (habit.id)}
			<div class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md">
				<div class="card-body gap-3 p-5">
					<!-- Header -->
					<div class="flex items-start justify-between gap-2">
						<div>
							<a href="/habits/{habit.id}" class="card-title text-lg hover:underline"
								>{habit.name}</a
							>
							<p class="text-xs text-base-content/50">
								{formatUnit(habit.unitMinutes)} / unit ·
							</p>
						</div>
						<span class="badge shrink-0 badge-ghost badge-sm">
							{habit.kind === 'daily' ? 'Daily' : 'Overall'}
						</span>
					</div>

					<!-- Unit grid -->
					{#if progress.kind === 'daily'}
						{@const p = progress as DailyProgress}
						<UnitGrid kind="daily" done={p.doneUnits} target={p.targetUnits} />
					{:else}
						{@const p = progress as OverallProgress}
						<UnitGrid kind="overall" done={p.doneUnits} />
					{/if}

					<!-- +/- controls -->
					<div class="flex items-center gap-2 pt-1">
						<form method="POST" action="?/record" use:enhance>
							<input type="hidden" name="habitId" value={habit.id} />
							<input type="hidden" name="delta" value="-1" />
							<button class="btn btn-square btn-ghost btn-sm" aria-label="Remove one unit">−</button
							>
						</form>
						<span class="text-sm text-base-content/60">
							{progress.doneUnits} unit{progress.doneUnits === 1 ? '' : 's'}
						</span>
						<form method="POST" action="?/record" use:enhance>
							<input type="hidden" name="habitId" value={habit.id} />
							<input type="hidden" name="delta" value="1" />
							<button class="btn btn-square btn-primary btn-sm" aria-label="Add one unit">+</button>
						</form>
						<div class="ml-auto">
							<a href="/habits/{habit.id}" class="btn btn-ghost btn-xs">Details →</a>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

{#if data.habits.length > 0}
	<div class="mt-6 text-center">
		<a href="/?archived=1" class="text-xs text-base-content/40 hover:underline">
			Show archived habits
		</a>
	</div>
{/if}
