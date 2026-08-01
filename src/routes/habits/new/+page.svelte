<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types.js';
	import { formatTotalUnits } from '$lib/ui/format.js';

	let { form }: { form: ActionData } = $props();

	// Live preview of unit label
	let unitMinutes: number | undefined = $state(undefined);
	let today = new Date().toISOString().slice(0, 10);
</script>

<div class="mx-auto max-w-lg">
	<div class="mb-6">
		<a href="/" class="text-sm text-base-content/50 hover:underline">← Back</a>
		<h1 class="mt-2 text-2xl font-bold">New habit</h1>
	</div>

	{#if form?.error}
		<div class="mb-4 alert text-sm alert-error">{form.error}</div>
	{/if}

	<form method="POST" use:enhance class="card bg-base-100 shadow-sm">
		<div class="card-body flex flex-col gap-5">
			<!-- Name -->
			<label class="form-control w-full">
				<div class="label"><span class="label-text font-medium">Name</span></div>
				<input
					type="text"
					name="name"
					placeholder="e.g. Piano practice"
					class="input-bordered input w-full"
					required
				/>
			</label>

			<!-- Description -->
			<label class="form-control w-full">
				<div class="label">
					<span class="label-text font-medium">Description</span>
					<span class="label-text-alt text-base-content/40">optional</span>
				</div>
				<textarea
					name="description"
					placeholder="What does this habit involve?"
					class="textarea-bordered textarea w-full"
					rows="2"></textarea>
			</label>

			<!-- Goal type -->
			<div class="form-control w-full">
				<div class="label"><span class="label-text font-medium">Goal type</span></div>
				<div class="flex gap-4">
					<label class="label cursor-pointer gap-2">
						<input type="radio" name="goalKind" value="daily" class="radio radio-primary" checked />
						<span class="label-text">Daily target</span>
					</label>
					<label class="label cursor-pointer gap-2">
						<input type="radio" name="goalKind" value="overall" class="radio radio-primary" />
						<span class="label-text">Overall target</span>
					</label>
				</div>
			</div>

			<!-- Unit of work -->
			<label class="form-control w-full">
				<div class="label">
					<span class="label-text font-medium">Unit of work (minutes)</span>
					<span class="label-text-alt text-base-content/50">
						{#if unitMinutes}
							1 unit = {formatTotalUnits(1, unitMinutes)}
						{:else}
							optional
						{/if}
					</span>
				</div>
				<input
					type="number"
					name="unitMinutes"
					min="1"
					step="1"
					bind:value={unitMinutes}
					class="input-bordered input w-full"
				/>
			</label>

			<!-- Target units -->
			<label class="form-control w-full">
				<div class="label"><span class="label-text font-medium">Target (units)</span></div>
				<input
					type="number"
					name="targetUnits"
					min="1"
					step="1"
					placeholder="e.g. 3"
					class="input-bordered input w-full"
					required
				/>
			</label>

			<!-- Dates -->
			<div class="grid grid-cols-2 gap-4">
				<label class="form-control">
					<div class="label"><span class="label-text font-medium">Start date</span></div>
					<input type="date" name="startDate" value={today} class="input-bordered input" required />
				</label>
				<label class="form-control">
					<div class="label">
						<span class="label-text font-medium">End date</span>
						<span class="label-text-alt text-base-content/40">optional</span>
					</div>
					<input type="date" name="endDate" class="input-bordered input" />
				</label>
			</div>

			<div class="mt-2 card-actions justify-end gap-2">
				<a href="/" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary">Create habit</button>
			</div>
		</div>
	</form>
</div>
