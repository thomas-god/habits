<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types.js';
	import type { DailyProgress, OverallProgress } from '$lib/domain/index.js';
	import { formatDate, formatTotalUnits, formatPercent, formatUnitLabel } from '$lib/ui/format.js';
	import HistoryGrid from '$lib/ui/components/molecules/HistoryGrid.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let editing = $state(false);
	let today = new Date().toISOString().slice(0, 10);
	let unitLabel = $derived(formatUnitLabel(data.habit.unitMinutes));
</script>

<div class="mb-6 flex items-start justify-between gap-4">
	<div>
		<a href="/" class="text-sm text-base-content/50 hover:underline">← Back</a>
		<h1 class="mt-2 text-2xl font-bold">{data.habit.name}</h1>
		<p class="text-sm text-base-content/50">
			{#if unitLabel.isSome()}
				{unitLabel.value} / unit ·
			{/if}
			{formatDate(data.habit.startDate)}
			{#if data.habit.endDate}
				→ {formatDate(data.habit.endDate)}{/if}
		</p>
	</div>
	{#if !data.habit.active}
		<span class="badge badge-neutral">Ended</span>
	{/if}
</div>

{#if form?.error}
	<div class="mb-4 alert text-sm alert-error">{form.error}</div>
{/if}

<!-- Progress card -->
<div class="card mb-4 bg-base-100 shadow-sm">
	<div class="card-body gap-3 p-5">
		{#if data.progress.kind === 'daily'}
			{@const p = data.progress as DailyProgress}
			<div class="flex items-end justify-between">
				<div>
					<p class="text-3xl font-bold">{formatTotalUnits(p.doneUnits, data.habit.unitMinutes)}</p>
					<p class="text-sm text-base-content/50">
						today · goal {formatTotalUnits(p.targetUnits, data.habit.unitMinutes)}
					</p>
				</div>
				<span class="text-2xl font-semibold {p.met ? 'text-success' : 'text-base-content/40'}">
					{formatPercent(p.ratio)}
				</span>
			</div>
		{:else}
			{@const p = data.progress as OverallProgress}
			<div class="flex items-end justify-between">
				<div>
					<p class="text-3xl font-bold">{formatTotalUnits(p.doneUnits, data.habit.unitMinutes)}</p>
					<p class="text-sm text-base-content/50">
						of {formatTotalUnits(p.targetUnits, data.habit.unitMinutes)} total
					</p>
				</div>
				<span class="text-2xl font-semibold {p.met ? 'text-success' : 'text-base-content/40'}">
					{formatPercent(p.ratio)}
				</span>
			</div>
			{#if !p.met && p.daysRemaining !== null}
				<p class="text-xs text-base-content/40">
					{p.daysRemaining} day{p.daysRemaining === 1 ? '' : 's'} remaining · needs {formatTotalUnits(
						Math.ceil(p.requiredUnitsPerDay ?? 0),
						data.habit.unitMinutes
					)}/day to reach goal
				</p>
			{/if}
		{/if}

		<div class="mt-2">
			<HistoryGrid habitDetails={data} />
		</div>
	</div>
</div>

<!-- Log entry -->
{#if data.habit.active}
	<div class="card mb-4 bg-base-100 shadow-sm">
		<div class="card-body p-5">
			<h2 class="card-title text-base">Log work</h2>
			<form method="POST" action="?/record" use:enhance class="flex items-end gap-3">
				<label class="form-control flex-1">
					<div class="label"><span class="label-text text-sm">Date</span></div>
					<input
						type="date"
						name="day"
						value={today}
						min={data.habit.startDate}
						max={data.habit.endDate ?? undefined}
						class="input-bordered input input-sm"
					/>
				</label>
				<label class="form-control w-28">
					<div class="label"><span class="label-text text-sm">Units</span></div>
					<input
						type="number"
						name="units"
						min="0"
						step="1"
						value="1"
						class="input-bordered input input-sm"
					/>
				</label>
				<button type="submit" class="btn mb-0.5 btn-primary btn-sm">Log</button>
			</form>
		</div>
	</div>
{/if}

<!-- Edit form -->
<div class="card mb-4 bg-base-100 shadow-sm">
	<div class="card-body p-5">
		<div class="flex items-center justify-between">
			<h2 class="card-title text-base">Settings</h2>
			<button class="btn btn-ghost btn-xs" onclick={() => (editing = !editing)}>
				{editing ? 'Cancel' : 'Edit'}
			</button>
		</div>

		{#if editing}
			<form
				method="POST"
				action="?/edit"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') editing = false;
						await update();
					};
				}}
				class="mt-3 flex flex-col gap-4"
			>
				<label class="form-control">
					<div class="label"><span class="label-text text-sm">Name</span></div>
					<input
						type="text"
						name="name"
						value={data.habit.name}
						class="input-bordered input input-sm"
						required
					/>
				</label>

				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<div class="text-base-content/50">Unit</div>
						<div>{unitLabel.unwrapOr('None')}</div>
					</div>
					<div>
						<div class="text-base-content/50">Goal type</div>
						<div class="capitalize">{data.habit.kind}</div>
					</div>
				</div>

				<label class="form-control">
					<div class="label"><span class="label-text text-sm">Target units</span></div>
					<input
						type="number"
						name="targetUnits"
						min="1"
						step="1"
						value={data.habit.targetUnits}
						class="input-bordered input input-sm"
						required
					/>
				</label>

				<div class="grid grid-cols-2 gap-4">
					<label class="form-control">
						<div class="label"><span class="label-text text-sm">Start date</span></div>
						<input
							type="date"
							name="startDate"
							value={data.habit.startDate}
							class="input-bordered input input-sm"
							required
						/>
					</label>
					<label class="form-control">
						<div class="label">
							<span class="label-text text-sm">End date</span>
							<span class="label-text-alt text-xs text-base-content/40">optional</span>
						</div>
						<input
							type="date"
							name="endDate"
							value={data.habit.endDate ?? ''}
							class="input-bordered input input-sm"
						/>
					</label>
				</div>

				<div class="flex justify-end">
					<button type="submit" class="btn btn-primary btn-sm">Save changes</button>
				</div>
			</form>
		{:else}
			<dl class="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				<dt class="text-base-content/50">Goal type</dt>
				<dd class="capitalize">{data.habit.kind}</dd>
				<dt class="text-base-content/50">Target</dt>
				<dd>
					{data.habit.targetUnits} units ({formatTotalUnits(
						data.habit.targetUnits,
						data.habit.unitMinutes
					)})
				</dd>
				<dt class="text-base-content/50">Unit</dt>
				<dd>{unitLabel.unwrapOr('None')}</dd>
				<dt class="text-base-content/50">Start</dt>
				<dd>{formatDate(data.habit.startDate)}</dd>
				{#if data.habit.endDate}
					<dt class="text-base-content/50">End</dt>
					<dd>{formatDate(data.habit.endDate)}</dd>
				{/if}
			</dl>
		{/if}
	</div>
</div>

<!-- Danger zone -->
<div class="card border border-error/20 bg-base-100 shadow-sm">
	<div class="card-body p-5">
		<h2 class="card-title text-base text-error">Danger zone</h2>
		<div class="flex flex-wrap gap-3">
			{#if data.habit.active}
				<form method="POST" action="?/archive" use:enhance>
					<button
						type="submit"
						class="btn btn-sm btn-warning"
						onclick={(e) => {
							if (!confirm('Archive this habit?')) e.preventDefault();
						}}
					>
						Archive
					</button>
				</form>
			{/if}
			<form method="POST" action="?/delete" use:enhance>
				<button
					type="submit"
					class="btn btn-error btn-sm"
					onclick={(e) => {
						if (!confirm('Permanently delete this habit and all its history?')) e.preventDefault();
					}}
				>
					Delete
				</button>
			</form>
		</div>
	</div>
</div>
