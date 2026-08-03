<script lang="ts">
	import type { PageData } from './$types.js';
	import HabitCard from '$lib/ui/components/organisms/HabitCard.svelte';

	let { data }: { data: PageData } = $props();

	let activeIds = $derived(
		data.habits.filter((h) => h.habit.active).map((h) => h.habit.id)
	);
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
		{#each data.habits as habitDetail (habitDetail.habit.id)}
			<HabitCard
				{habitDetail}
				canMoveUp={activeIds[0] !== habitDetail.habit.id}
				canMoveDown={activeIds[activeIds.length - 1] !== habitDetail.habit.id}
			/>
		{/each}
	</div>
{/if}

{#if data.habits.length > 0}
	<div class="mt-6 text-center">
		{#if data.includeEnded}
			<a href="/" class="text-xs text-base-content/40 hover:underline"> Hide ended habits </a>
		{:else}
			<a href="/?ended=1" class="text-xs text-base-content/40 hover:underline">
				Show ended habits
			</a>
		{/if}
	</div>
{/if}
